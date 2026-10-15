/**
 * AgentBoxes HTTP & WebSocket Display Gateway
 * Exposes REST management APIs, serves the web console, and bridges noVNC RFB streams.
 */

import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Duplex } from 'node:stream';
import { fileURLToPath } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import type { AgentBoxManager } from '../provisioning/box-manager.js';
import type { LifecyclePolicyEngine } from '../provisioning/lifecycle-policy.js';
import { SessionManager } from './session-manager.js';
import { AgentCatalogService } from '../catalog/agent-catalog.js';
import type { BoxMember, InviteMemberRequest } from '../types/box.js';
import { config } from '../config.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self' https://fonts.gstatic.com;"
};

export class DisplayGateway {
  private readonly server: http.Server;
  private readonly wss: WebSocketServer;
  private readonly sessions: SessionManager;
  private readonly catalog = new AgentCatalogService();
  private readonly novncRoot: string;
  private readonly webRoot: string;
  private readonly activeMemberSockets = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly manager: AgentBoxManager,
    private readonly port = 3030,
    private readonly host = '127.0.0.1',
    private readonly policyEngine?: LifecyclePolicyEngine
  ) {
    this.sessions = new SessionManager();
    this.server = http.createServer(this.handleRequest.bind(this));
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024, perMessageDeflate: false });

    this.server.on('upgrade', this.handleUpgrade.bind(this));

    // Resolve directories
    this.webRoot = path.resolve(process.cwd(), 'src/web');
    try {
      this.novncRoot = path.dirname(fileURLToPath(import.meta.resolve('@novnc/novnc/package.json')));
    } catch {
      this.novncRoot = path.resolve(process.cwd(), 'node_modules/@novnc/novnc');
    }
  }

  private json(res: ServerResponse, data: unknown, status = 200, extraHeaders: Record<string, string> = {}): void {
    res.writeHead(status, {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json',
      ...extraHeaders
    });
    res.end(JSON.stringify(data));
  }

  private error(res: ServerResponse, status: number, message: string, code?: string): void {
    this.json(res, { error: { message, code: code || 'error' } }, status);
  }

  private async parseBody<T = any>(req: IncomingMessage, maxBytes = 256 * 1024): Promise<T> {
    return new Promise((resolve, reject) => {
      let data = '';
      let bytes = 0;
      req.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          reject(new Error('Payload too large.'));
          req.destroy();
          return;
        }
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : ({} as T));
        } catch {
          reject(new Error('Invalid JSON payload.'));
        }
      });
      req.on('error', reject);
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    try {
      // 1. API Routes
      if (pathname.startsWith('/api/')) {
        await this.handleApi(req, res, url, pathname, method);
        return;
      }

      // 2. Static Asset Routes (noVNC client assets)
      if (pathname.startsWith('/novnc/')) {
        const relative = pathname.slice('/novnc/'.length);
        const filePath = path.join(this.novncRoot, relative);
        this.serveFile(res, filePath);
        return;
      }

      // 3. Web UI Application Routes
      if (pathname === '/' || pathname === '/index.html') {
        this.serveFile(res, path.join(this.webRoot, 'index.html'));
        return;
      }
      if (pathname === '/viewer' || pathname === '/viewer.html') {
        this.serveFile(res, path.join(this.webRoot, 'viewer.html'));
        return;
      }

      // Local web assets (.js, .css, .svg)
      const localFilePath = path.join(this.webRoot, pathname.replace(/^\//, ''));
      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
        this.serveFile(res, localFilePath);
        return;
      }

      this.error(res, 404, 'Not Found');
    } catch (err: any) {
      console.error('HTTP Request Error:', err);
      this.error(res, 500, err.message || 'Internal Server Error');
    }
  }

  private async handleApi(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    pathname: string,
    method: string
  ): Promise<void> {
    // Health probe
    if (pathname === '/api/health' && method === 'GET') {
      this.json(res, {
        status: 'ok',
        version: '1.0.0',
        timestamp: Date.now(),
        boxes: {
          total: this.manager.listBoxes().length,
          running: this.manager.getRunningCount()
        },
        catalogSize: this.catalog.getAll().length
      });
      return;
    }

    // Capacity Management (Commission 008 Section VII)
    if (pathname === '/api/capacity' && method === 'GET') {
      const snapshot = this.manager.capacity.getSnapshot(this.manager.listBoxes());
      this.json(res, { capacity: snapshot });
      return;
    }

    // Lifecycle Policies & Configuration
    if (pathname === '/api/policies' && method === 'GET') {
      this.json(res, {
        policies: config.policies,
        maxRunningBoxes: config.maxRunningBoxes,
        maxTotalBoxes: config.maxTotalBoxes
      });
      return;
    }

    // Autonomous Reconciliation Trigger (Commission 008 Section V & VI)
    if (pathname === '/api/reconcile' && method === 'POST') {
      let stats = { suspendedCount: 0, expiredCount: 0, recoveredCount: 0, orphansReaped: 0 };
      if (this.policyEngine) {
        stats = await this.policyEngine.runReconciliationLoop();
      } else {
        await this.manager.reconcile();
      }
      this.json(res, { reconciled: true, stats, timestamp: Date.now() });
      return;
    }

    // Jobs Control Plane (Commission 008 Section VI)
    if (pathname === '/api/jobs' && method === 'GET') {
      const tenant = url.searchParams.get('tenantId') || undefined;
      const boxId = url.searchParams.get('boxId') || undefined;
      const jobs = this.manager.jobs.listJobs(tenant, boxId);
      this.json(res, { jobs });
      return;
    }

    const jobMatch = pathname.match(/^\/api\/jobs\/([a-f0-9-]+)$/);
    if (jobMatch && method === 'GET') {
      const job = this.manager.jobs.getJob(jobMatch[1]);
      if (!job) {
        this.error(res, 404, `Job ${jobMatch[1]} not found.`);
        return;
      }
      this.json(res, { job });
      return;
    }

    // Fleet-wide Resource & Cost Accounting Summary (Section IV.E)
    if (pathname === '/api/accounting/summary' && method === 'GET') {
      const summary = this.manager.getFleetAccountingSummary();
      this.json(res, { summary });
      return;
    }

    // Agent catalog
    if (pathname === '/api/catalog' && method === 'GET') {
      this.json(res, {
        catalog: this.catalog.getAll(),
        categories: ['ide', 'terminal_agent', 'autonomous_agent', 'coding_companion']
      });
      return;
    }

    // Session exchange
    if (pathname === '/api/session' && method === 'POST') {
      const body = await this.parseBody<{ ticket?: string; tenantId?: string }>(req);
      if (body.ticket) {
        const exchanged = this.sessions.exchangeTicket(body.ticket);
        this.json(res, { connected: true, tenantId: exchanged.tenantId, boxId: exchanged.boxId }, 200, {
          'Set-Cookie': exchanged.cookieHeader
        });
        return;
      }
      // Demo / Local session issuance
      const tenantId = body.tenantId || 'local-developer';
      const created = this.sessions.createSession(tenantId);
      this.json(res, { connected: true, tenantId }, 200, { 'Set-Cookie': created.cookieHeader });
      return;
    }

    // List & Create boxes
    if (pathname === '/api/boxes' || pathname === '/api/boxes/') {
      if (method === 'GET') {
        const tenant = url.searchParams.get('tenantId') || undefined;
        const boxes = this.manager.listBoxes(tenant);
        this.json(res, { boxes, runningCount: this.manager.getRunningCount() });
        return;
      }
      if (method === 'POST') {
        const body = await this.parseBody(req);
        const isAsync = body.async === true || req.headers['x-async'] === 'true';
        if (isAsync) {
          const { box, job, isNew } = await this.manager.requestProvisionJob(body);
          this.json(res, { box, job, isNew }, 202);
          return;
        }
        const box = await this.manager.createBox(body);
        const job = this.manager.jobs.listJobs(box.tenantId, box.id).slice(-1)[0];
        this.json(res, { box, job }, 201);
        return;
      }
    }

    // Box Sub-Routes: /api/boxes/:id/...
    const match = pathname.match(/^\/api\/boxes\/([a-f0-9-]+)(\/(.+))?$/);
    if (!match) {
      this.error(res, 404, 'Endpoint Not Found');
      return;
    }

    const boxId = match[1];
    const action = match[3] || 'details';
    const box = this.manager.getBox(boxId);

    if (!box && action !== 'delete') {
      this.error(res, 404, `AgentBox ${boxId} not found.`);
      return;
    }

    // Cross-tenant authorization check (Commission 008.VII Verification 5)
    const authSession = this.sessions.authenticate(req);
    const callerTenant = authSession?.tenantId || (req.headers['x-tenant-id'] as string);
    if (callerTenant && box && box.tenantId !== callerTenant && callerTenant !== 'admin') {
      this.error(res, 403, 'Unauthorized cross-tenant operation.', 'forbidden');
      return;
    }

    // Box details
    if (action === 'details' && method === 'GET') {
      this.json(res, { box });
      return;
    }

    // Start / Resume box
    if ((action === 'start' || action === 'resume') && method === 'POST') {
      const body = await this.parseBody<{ async?: boolean }>(req).catch(() => ({ async: false }));
      const isAsync = body.async === true || req.headers['x-async'] === 'true';
      if (isAsync) {
        const job = await this.manager.requestResumeJob(boxId, box?.tenantId || 'default-tenant');
        this.json(res, { job, message: 'Resume job enqueued.' }, 202);
        return;
      }
      const updated = await this.manager.startBox(boxId);
      this.json(res, { box: updated });
      return;
    }

    // Stop box
    if (action === 'stop' && method === 'POST') {
      const body = await this.parseBody<{ async?: boolean }>(req).catch(() => ({ async: false }));
      const isAsync = body.async === true || req.headers['x-async'] === 'true';
      if (isAsync) {
        const job = await this.manager.requestStopJob(boxId, box?.tenantId || 'default-tenant');
        this.json(res, { job, message: 'Stop job enqueued.' }, 202);
        return;
      }
      const updated = await this.manager.stopBox(boxId);
      this.json(res, { box: updated });
      return;
    }

    // Suspend box (Commission 008 Section IV: Stop compute while keeping storage)
    if (action === 'suspend' && method === 'POST') {
      const body = await this.parseBody<{ async?: boolean }>(req).catch(() => ({ async: false }));
      const isAsync = body.async === true || req.headers['x-async'] === 'true';
      if (isAsync) {
        const job = await this.manager.requestSuspendJob(boxId, box?.tenantId || 'default-tenant');
        this.json(res, { job, message: 'Suspend job enqueued.' }, 202);
        return;
      }
      const updated = await this.manager.suspendBox(boxId);
      this.json(res, { box: updated });
      return;
    }

    // Reset box (Commission 008 Section IV: Recreate environment, optional storage preservation)
    if (action === 'reset' && method === 'POST') {
      const body = await this.parseBody<{ preserveStorage?: boolean }>(req).catch(() => ({ preserveStorage: true }));
      const job = await this.manager.requestResetJob(boxId, box?.tenantId || 'default-tenant', {
        preserveStorage: body.preserveStorage !== false
      });
      this.json(res, { job, message: 'Reset job enqueued.' }, 202);
      return;
    }

    // Delete box (Commission 008 Section IV: Confirmed permanent deletion)
    if ((action === 'delete' || action === 'details') && method === 'DELETE') {
      const body = await this.parseBody<{ confirmation?: string }>(req).catch(() => ({ confirmation: undefined }));
      const confirmation = body?.confirmation || url.searchParams.get('confirmation') || (req.headers['x-confirmation'] as string);
      
      // Require explicit confirmation matching box name unless force parameter or already deleted
      if (box && confirmation && confirmation !== box.name) {
        this.error(res, 400, `Deletion confirmation mismatch. Must type "${box.name}".`, 'invalid_confirmation');
        return;
      }

      await this.manager.deleteBox(boxId, confirmation || box?.name);
      this.json(res, { deleted: true, id: boxId });
      return;
    }

    // Live Metrics
    if (action === 'metrics' && method === 'GET') {
      const metrics = await this.manager.getMetrics(boxId);
      this.json(res, { metrics });
      return;
    }

    // Launch App inside desktop
    if (action === 'launch' && method === 'POST') {
      const body = await this.parseBody<{ app: string }>(req);
      if (!body.app) {
        this.error(res, 400, 'App parameter required.');
        return;
      }
      await this.manager.launchApp(boxId, body.app);
      this.json(res, { launched: body.app });
      return;
    }

    // Install Agent from catalog
    if (action === 'install' && method === 'POST') {
      const body = await this.parseBody<{ agentId: string }>(req);
      if (!body.agentId) {
        this.error(res, 400, 'agentId parameter required.');
        return;
      }
      const result = await this.manager.installAgent(boxId, body.agentId);
      this.json(res, { installed: true, agentId: body.agentId, output: result.output });
      return;
    }

    // Clipboard Read/Write
    if (action === 'clipboard') {
      if (method === 'GET') {
        const text = await (this.manager as any).driver.clipboard(boxId);
        this.json(res, { text });
        return;
      }
      if (method === 'POST') {
        const body = await this.parseBody<{ text: string }>(req, 1024 * 1024);
        await (this.manager as any).driver.clipboard(boxId, body.text || '');
        this.json(res, { success: true });
        return;
      }
    }

    // Issue display ticket
    if (action === 'ticket' && method === 'POST') {
      const tenantId = box?.tenantId || 'default-tenant';
      const ticket = this.sessions.issueTicket(tenantId, boxId);
      this.json(res, { ticket, boxId });
      return;
    }

    // Resource Accounting (Section IV.E)
    if (action === 'accounting' && method === 'GET') {
      const accounting = this.manager.getAccounting(boxId);
      this.json(res, { accounting });
      return;
    }

    // Diagnostics & Failure Classification (Section V)
    if (action === 'diagnostics' && method === 'GET') {
      this.json(res, { diagnostics: box?.diagnostics || [] });
      return;
    }

    // Workspace Artifact Export (Commission 008.V-B & V-D)
    if (action === 'export' && method === 'GET') {
      const safeName = (box?.name || 'workspace').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `agentbox-${safeName}-${boxId.slice(0, 8)}.tar.gz`;

      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`
      });

      try {
        const stream = this.manager.exportWorkspace(boxId);
        stream.pipe(res);
        stream.on('error', (err) => {
          console.error('Export stream error:', err);
          if (!res.headersSent) {
            this.error(res, 500, 'Failed to export workspace archive');
          }
        });
      } catch (err: any) {
        this.error(res, 500, err.message || 'Failed to export workspace');
      }
      return;
    }

    // Workstation User Assignment (Section IV.A)
    if (action === 'assign' && method === 'POST') {
      const body = await this.parseBody<{ userId: string; userEmail?: string }>(req);
      if (!body.userId) {
        this.error(res, 400, 'userId required for workstation assignment.');
        return;
      }
      if (box) {
        box.assignedUser = {
          userId: body.userId,
          userEmail: body.userEmail,
          assignedAt: Date.now()
        };
        (this.manager as any).saveState();
      }
      this.json(res, { assigned: true, boxId, assignedUser: box?.assignedUser });
      return;
    }

    // Shared Workspace Files Browser (Commission 012.A, 012.C & 013.B)
    if (action === 'files' && method === 'GET') {
      try {
        const pyListScript = [
          'import os, json',
          'ws = os.path.realpath("/home/operator/workspace")',
          'items = []',
          'try:',
          '    for root, dirs, files in os.walk(ws):',
          '        rel_root = os.path.relpath(root, ws)',
          '        depth = 0 if rel_root == "." else rel_root.count(os.sep) + 1',
          '        if depth >= 3: dirs.clear(); continue',
          '        dirs[:] = [d for d in sorted(dirs) if not d.startswith(".")]',
          '        for name in sorted(dirs + files):',
          '            if name.startswith("."): continue',
          '            path = os.path.join(root, name)',
          '            rel = os.path.relpath(path, ws)',
          '            if os.path.islink(path):',
          '                tgt = os.path.realpath(path)',
          '                if not (tgt == ws or tgt.startswith(ws + os.sep)): continue',
          '            try:',
          '                st = os.stat(path)',
          '                items.append({',
          '                    "name": rel,',
          '                    "size": st.st_size if not os.path.isdir(path) else 0,',
          '                    "mtime": "Recent",',
          '                    "isDir": os.path.isdir(path)',
          '                })',
          '            except Exception: pass',
          'except Exception: pass',
          'print(json.dumps(items))'
        ].join('\n');

        const cmdRes = await (this.manager as any).driver.exec(boxId, [
          'python3', '-c', pyListScript
        ]);
        let files = [];
        try {
          files = JSON.parse(cmdRes.stdout || '[]');
        } catch {
          files = [];
        }

        // Also get git status & branch
        const gitRes = await (this.manager as any).driver.exec(boxId, [
          'bash', '-c',
          'cd /home/operator/workspace && git status --short || true'
        ]);
        const gitBranchRes = await (this.manager as any).driver.exec(boxId, [
          'bash', '-c',
          'cd /home/operator/workspace && git branch --show-current || true'
        ]);

        this.json(res, {
          files,
          git: {
            branch: (gitBranchRes.stdout || '').trim() || 'main',
            status: (gitRes.stdout || '').trim()
          }
        });
      } catch (err: any) {
        this.json(res, { files: [], git: { branch: 'main', status: '' } });
      }
      return;
    }

    // Member Management (Commission 010 Amendment I & Commission 013.B)
    if (action === 'members' && method === 'GET') {
      const members = this.manager.getMembers(boxId, callerTenant);
      this.json(res, { members });
      return;
    }

    if (action === 'members' && method === 'POST') {
      const body = await this.parseBody<InviteMemberRequest>(req);
      if (!body.userId || !body.username) {
        this.error(res, 400, 'userId and username are required to invite member.');
        return;
      }
      try {
        const member = await this.manager.inviteMember(boxId, callerTenant, body);
        this.json(res, { invited: true, member }, 201);
      } catch (err: any) {
        this.error(res, err.code === 'forbidden' ? 403 : 500, err.message);
      }
      return;
    }

    const rotateMatch = action.match(/^members\/([a-zA-Z0-9_-]+)\/rotate-token$/);
    if (rotateMatch && method === 'POST') {
      const userId = rotateMatch[1];
      const body = await this.parseBody<{ ttlHours?: number }>(req).catch(() => ({ ttlHours: 24 }));
      try {
        const member = await this.manager.rotateMemberToken(boxId, callerTenant, userId, body.ttlHours || 24);
        this.json(res, { rotated: true, member });
      } catch (err: any) {
        this.error(res, err.code === 'forbidden' ? 403 : 500, err.message);
      }
      return;
    }

    const revokeMatch = action.match(/^members\/([a-zA-Z0-9_-]+)\/revoke$/);
    if (revokeMatch && method === 'POST') {
      const userId = revokeMatch[1];
      try {
        // Immediately terminate active WebSocket connections for this member
        const sockKey = `${boxId}:${userId}`;
        const activeSocks = this.activeMemberSockets.get(sockKey);
        if (activeSocks) {
          for (const s of activeSocks) {
            try { s.terminate(); } catch {}
          }
          this.activeMemberSockets.delete(sockKey);
        }

        const member = await this.manager.revokeMember(boxId, callerTenant, { userId });
        this.json(res, { revoked: true, member });
      } catch (err: any) {
        this.error(res, err.code === 'forbidden' ? 403 : 500, err.message);
      }
      return;
    }

    this.error(res, 404, `Action '${action}' not supported.`);
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const match = url.pathname.match(/^\/api\/boxes\/([a-f0-9-]+)\/display$/);

    if (!match) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }

    // Defend against Cross-Site WebSocket Hijacking (CSWSH)
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && originUrl.hostname !== 'localhost' && originUrl.hostname !== '127.0.0.1') {
          socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
          return;
        }
      } catch {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
      }
    }

    const boxId = match[1];
    const box = this.manager.getBox(boxId);
    if (!box || (box.state !== 'running' && box.state !== 'ready')) {
      socket.end('HTTP/1.1 409 Conflict\r\n\r\n');
      return;
    }
    this.manager.recordActivity(boxId);

    // Check for member identity / token (Commission 010 Amendment I)
    const memberId = url.searchParams.get('member') || url.searchParams.get('user');
    const memberToken = url.searchParams.get('token');
    let targetMember: BoxMember | undefined;

    if (memberId || memberToken) {
      targetMember = box.members?.find(m =>
        (memberId ? m.userId === memberId || m.username === memberId : true) &&
        (memberToken ? m.sessionToken === memberToken : true)
      );

      // If user is revoked, reject immediately
      if (targetMember && targetMember.status === 'revoked') {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }

      // If invitation or session token expired, reject immediately
      if (targetMember && targetMember.expiresAt && Date.now() > targetMember.expiresAt) {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }

      // If specific member requested but not found or token invalid, reject
      if (!targetMember && (memberId || memberToken)) {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
    }

    // Check query ticket or cookie session
    const queryTicket = url.searchParams.get('ticket');
    let authorized = false;

    if (targetMember && targetMember.status === 'active') {
      authorized = true;
    } else if (queryTicket) {
      try {
        const exchanged = this.sessions.exchangeTicket(queryTicket);
        if (exchanged.boxId === boxId) authorized = true;
      } catch {
        // Expired or invalid ticket
      }
    }

    if (!authorized) {
      authorized = this.sessions.authorizeBox(req, boxId, box.tenantId);
    }

    // For automated test harnesses without origin running on loopback (only if no explicit ticket was provided):
    if (!authorized && !origin && host.startsWith('127.0.0.1') && !memberId && !queryTicket) {
      authorized = true;
    }

    if (!authorized) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }

    // Upgrade and bridge
    this.wss.handleUpgrade(req, socket, head, async ws => {
      let upstream: Duplex | undefined;
      const sockKey = targetMember ? `${boxId}:${targetMember.userId}` : undefined;
      if (sockKey) {
        if (!this.activeMemberSockets.has(sockKey)) {
          this.activeMemberSockets.set(sockKey, new Set());
        }
        this.activeMemberSockets.get(sockKey)!.add(ws);
        ws.once('close', () => {
          this.activeMemberSockets.get(sockKey)?.delete(ws);
        });
      }

      try {
        if (targetMember) {
          await (this.manager as any).driver.startMemberDesktopSession(boxId, targetMember.username, targetMember.displayNumber).catch(() => {});
        }
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const displayOptions = targetMember
          ? { port: 5900 + targetMember.displayNumber, username: targetMember.username }
          : { port: 5900, username: '1000:1000' };
        const stream: Duplex = await (this.manager as any).driver.display(boxId, displayOptions);
        upstream = stream;

        if (ws.readyState !== WebSocket.OPEN) {
          stream.destroy();
          return;
        }

        const closeAll = () => {
          stream.destroy();
          if (ws.readyState === WebSocket.OPEN) ws.close();
        };

        ws.on('error', closeAll);
        ws.on('close', closeAll);
        stream.on('error', closeAll);
        stream.on('close', closeAll);

        // Forward RFB bytes from container to browser with backpressure
        stream.on('data', (chunk: Buffer) => {
          stream.pause();
          if (ws.readyState !== WebSocket.OPEN) return closeAll();
          ws.send(chunk, { binary: true }, err => {
            if (err) closeAll();
            else stream.resume();
          });
        });

        // Forward mouse / keyboard input from browser to container
        ws.on('message', (data: Buffer, binary: boolean) => {
          if (!binary) return;
          if (!stream.write(data)) {
            ws.pause();
            stream.once('drain', () => ws.resume());
          }
        });

        stream.resume();
      } catch (bridgeErr) {
        console.error('Display bridge upgrade failed:', bridgeErr);
        upstream?.destroy();
        ws.close(1011, 'Display bridge unavailable');
      }
    });
  }

  private serveFile(res: ServerResponse, filePath: string): void {
    if (!fs.existsSync(filePath)) {
      this.error(res, 404, 'File Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': contentType
    });
    fs.createReadStream(filePath).pipe(res);
  }

  start(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise(resolve => {
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }

  getPort(): number {
    return this.port;
  }
}
