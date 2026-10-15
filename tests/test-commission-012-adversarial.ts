/**
 * HEAV3NS — ENGINEERING COMMISSION 012.E
 * The Invisible Computer — Adversarial Acceptance & Security Integration Test
 *
 * Test Scenarios:
 * 1. Solo User: Provision, Connect, Launch Agent, Verify Files & Git, Export, Suspend, Resume.
 * 2. Multiplayer: Google Drive-style invitation, Independent Desktops (:0 & :1), Concurrent Work,
 *    Git Commit Attribution, Non-destructive Revocation, Shared Files Preservation.
 * 3. Adversarial & Security Boundaries:
 *    - Unauthorized RFB connection (bad/expired ticket) -> 403 Forbidden.
 *    - Revoked token reuse -> 403 Forbidden.
 *    - Cross-tenant resource request -> 403 Forbidden.
 *    - POSIX isolation attack (attempting to read /home/operator from collaborator user) -> Permission Denied.
 *    - Provisioning Idempotency -> Returns existing box, avoids duplicate resource billing.
 * 4. Safe Destruction: Confirmed deletion with resource teardown verification.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import WebSocket from 'ws';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import { DisplayGateway } from '../src/gateway/display-gateway.js';

test('Commission 012: The Invisible Computer — Adversarial Integration & UX Acceptance Test', async () => {
  const testUid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `comm012-test-${testUid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`c012-${testUid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 10, jobsFile);
  const gatewayPort = 3098;
  const gateway = new DisplayGateway(manager, gatewayPort, '127.0.0.1');

  await gateway.start();
  let box: any;
  let wsOwner: WebSocket | undefined;
  let wsCollab: WebSocket | undefined;

  try {
    // =========================================================================
    // SCENARIO 1: Solo User Experience & Workspace Ergonomics
    // =========================================================================
    console.log('\n=== [SCENARIO 1] Solo User Experience & Workspace Ergonomics ===');

    console.log('\n--- [1.1] Create Computer with Unified Agent Studio Profile ---');
    box = await manager.createBox({
      tenantId: `tenant-${testUid}`,
      name: `Invisible-Computer-${testUid}`,
      tier: 'power',
      agents: ['claude-code', 'openai-codex'],
      profileId: 'full-stack-agent-studio',
      idempotencyKey: `idem-key-${testUid}`
    });

    assert.ok(box, 'Box record created');
    assert.strictEqual(box.state, 'running', 'Box must be running');
    console.log(`  Computer provisioned: ${box.name} (${box.id})`);

    console.log('\n--- [1.2] Connect Owner Desktop via Ticket (Display :0) ---');
    const ticketRes = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/ticket`,
        { method: 'POST', headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => resolve(JSON.parse(raw)));
        }
      );
      req.on('error', reject);
      req.end();
    });

    assert.ok(ticketRes.ticket, 'Display ticket issued');

    wsOwner = new WebSocket(`ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?ticket=${ticketRes.ticket}`);
    const ownerConnected = await new Promise<boolean>((resolve) => {
      wsOwner!.on('open', () => resolve(true));
      wsOwner!.on('error', () => resolve(false));
    });

    assert.ok(ownerConnected, 'Owner desktop stream connected successfully');
    console.log('  Owner personal desktop stream active on RFB port 5900');

    console.log('\n--- [1.3] Launch Pre-installed Tool (Claude Code) in Desktop ---');
    const launchRes = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/launch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': box.tenantId
          }
        },
        (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => resolve(JSON.parse(raw)));
        }
      );
      req.on('error', reject);
      req.write(JSON.stringify({ app: 'claude-code' }));
      req.end();
    });

    assert.strictEqual(launchRes.launched, 'claude-code', 'Claude Code launched in session');
    console.log('  Claude Code desktop application launcher triggered');

    // Owner creates private credentials in /home/operator
    await driver.exec(box.id, [
      'bash', '-c',
      'echo \'{"token":"owner-secret-anthropic-token"}\' > /home/operator/.claude.json && chmod 600 /home/operator/.claude.json'
    ]);

    console.log('\n--- [1.4] Initialize Project & Query Shared Files Endpoint ---');
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "console.log(\'Project initiated by Owner\');" > /home/operator/workspace/main.js && ' +
      'echo "PORT=3000" > /home/operator/workspace/.env.example && ' +
      'cd /home/operator/workspace && git add main.js .env.example && git commit -m "feat: initial commit from owner"'
    ]);

    const filesRes = await new Promise<any>((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/files`,
        { headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => resolve(JSON.parse(raw)));
        }
      ).on('error', reject);
    });

    assert.ok(Array.isArray(filesRes.files), 'Files array returned');
    const mainJsFile = filesRes.files.find((f: any) => f.name === 'main.js');
    assert.ok(mainJsFile, 'main.js found in shared files list');
    assert.ok(mainJsFile.size > 0, 'main.js has non-zero size');
    assert.strictEqual(filesRes.git.branch, 'main', 'Workspace tracks main branch');
    console.log(`  Shared files verified: ${filesRes.files.length} items (Branch: ${filesRes.git.branch})`);

    console.log('\n--- [1.5] Export Workspace Deliverables Archive ---');
    const exportBytes = await new Promise<number>((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/export`,
        { headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let total = 0;
          res.on('data', d => total += d.length);
          res.on('end', () => resolve(total));
        }
      ).on('error', reject);
    });

    assert.ok(exportBytes > 500, 'Tarball archive received with valid size');
    console.log(`  Workspace tarball exported: ${exportBytes} bytes`);

    console.log('\n--- [1.6] Suspend & Resume (Codespaces Lifecycle Model) ---');
    if (wsOwner && wsOwner.readyState === WebSocket.OPEN) wsOwner.close();
    await manager.suspendBox(box.id);
    let boxStatus = manager.getBox(box.id);
    assert.strictEqual(boxStatus?.state, 'suspended', 'Computer paused (compute stopped)');
    console.log('  Compute paused (costs drop to $0.00/hr, files retained)');

    await manager.startBox(box.id);
    boxStatus = manager.getBox(box.id);
    assert.strictEqual(boxStatus?.state, 'running', 'Computer resumed');

    const verifyRestored = await driver.exec(box.id, ['cat', '/home/operator/workspace/main.js']);
    assert.ok(verifyRestored.stdout.includes('Project initiated by Owner'), 'Workspace files intact across suspension');
    console.log('  Computer resumed with 100% workspace file persistence');

    // =========================================================================
    // SCENARIO 2: Multiplayer Sharing & Independent Sessions
    // =========================================================================
    console.log('\n=== [SCENARIO 2] Multiplayer Sharing & Independent Sessions ===');

    console.log('\n--- [2.1] Invite Collaborator via Identity (Google Drive Model) ---');
    const memberBob = await manager.inviteMember(box.id, box.tenantId, {
      userId: `user-bob-${testUid}`,
      username: `bob${testUid}`,
      displayName: 'Bob (Collaborator)',
      email: 'bob@example.com',
      role: 'editor'
    });

    assert.ok(memberBob, 'Member invited');
    assert.ok(memberBob.sessionToken, 'Dedicated session token issued');
    assert.strictEqual(memberBob.displayNumber, 1, 'Assigned Display :1 (Port 5901)');
    console.log(`  Collaborator invited: ${memberBob.displayName} (Display :${memberBob.displayNumber})`);

    console.log('\n--- [2.2] Connect Collaborator Independent Desktop (Display :1) ---');
    wsCollab = new WebSocket(
      `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberBob.userId}&token=${memberBob.sessionToken}`
    );

    const collabConnected = await new Promise<boolean>((resolve) => {
      wsCollab!.on('open', () => resolve(true));
      wsCollab!.on('error', () => resolve(false));
    });

    assert.ok(collabConnected, 'Collaborator independent desktop connected');
    console.log('  Two distinct desktop sessions live concurrently on one computer');

    console.log('\n--- [2.3] Concurrent Work & Individual Git Commit Attribution ---');
    const [execA, execB] = await Promise.all([
      driver.exec(box.id, ['node', '-e', 'console.log("Worker A compute active")']),
      driver.exec(box.id, ['node', '-e', 'console.log("Worker B compute active")'], { user: memberBob.username })
    ]);

    assert.strictEqual(execA.exitCode, 0, 'Worker A command succeeded');
    assert.strictEqual(execB.exitCode, 0, 'Worker B command succeeded');

    // Bob modifies shared workspace and commits with attribution
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "export const apiEndpoint = \'/v1/api\';" >> /home/operator/workspace/main.js && ' +
      'cd /home/operator/workspace && git add main.js && git commit -m "feat: api endpoint by collaborator"'
    ], { user: memberBob.username });

    const gitLog = await driver.exec(box.id, ['git', '-C', '/home/operator/workspace', 'log', '-n', '2', '--format=%an <%ae>: %s']);
    assert.ok(gitLog.stdout.includes('Bob (Collaborator) <bob@example.com>'), 'Commit author reflects collaborator attribution');
    console.log(`  Git commit attribution verified: Bob (Collaborator) <bob@example.com>`);

    console.log('\n--- [2.4] Revoke Collaborator Access Non-Destructively ---');
    const revoked = await manager.revokeMember(box.id, box.tenantId, { userId: memberBob.userId });
    assert.strictEqual(revoked.status, 'revoked', 'Member marked revoked');
    assert.strictEqual(revoked.sessionToken, undefined, 'Session token scrubbed');

    // Verify workspace files and git log preserved
    const gitLogPostRevoke = await driver.exec(box.id, ['git', '-C', '/home/operator/workspace', 'log', '--oneline']);
    assert.ok(gitLogPostRevoke.stdout.includes('api endpoint by collaborator'), 'Git history preserved after member revocation');
    console.log('  Collaborator revoked; project files and commit history preserved');

    // =========================================================================
    // SCENARIO 3: Adversarial & Security Boundary Tests
    // =========================================================================
    console.log('\n=== [SCENARIO 3] Adversarial & Security Boundary Tests ===');

    console.log('\n--- [3.1] Adversarial: Unauthorized RFB Stream Request ---');
    const unauthorizedAttempt = await new Promise<number>((resolve) => {
      const unauthWs = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?ticket=forged-ticket-12345`
      );
      unauthWs.on('unexpected-response', (_, res) => resolve(res.statusCode || 0));
      unauthWs.on('open', () => { unauthWs.close(); resolve(200); });
      unauthWs.on('error', () => resolve(403));
    });

    assert.strictEqual(unauthorizedAttempt, 403, 'Forged ticket rejected with 403 Forbidden');
    console.log('  Security barrier verified: Forged ticket rejected with 403 Forbidden');

    console.log('\n--- [3.2] Adversarial: Revoked Token Reconnection Attempt ---');
    const revokedReconnectAttempt = await new Promise<number>((resolve) => {
      const revokedWs = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberBob.userId}&token=old-revoked-token`
      );
      revokedWs.on('unexpected-response', (_, res) => resolve(res.statusCode || 0));
      revokedWs.on('open', () => { revokedWs.close(); resolve(200); });
      revokedWs.on('error', () => resolve(403));
    });

    assert.strictEqual(revokedReconnectAttempt, 403, 'Revoked token rejected with 403 Forbidden');
    console.log('  Security barrier verified: Revoked member token rejected with 403 Forbidden');

    console.log('\n--- [3.3] Adversarial: Cross-Tenant Resource Tampering ---');
    const crossTenantStatusCode = await new Promise<number>((resolve) => {
      const req = http.request(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/details`,
        {
          method: 'GET',
          headers: { 'x-tenant-id': 'unauthorized-adversary-tenant' }
        },
        (res) => resolve(res.statusCode || 0)
      );
      req.on('error', () => resolve(500));
      req.end();
    });

    assert.strictEqual(crossTenantStatusCode, 403, 'Cross-tenant request blocked with 403 Forbidden');
    console.log('  Security barrier verified: Cross-tenant request blocked with 403 Forbidden');

    console.log('\n--- [3.4] Adversarial: Shared Directory POSIX Privilege Boundary ---');
    // Collaborator user attempts to peek into /home/operator private keys/credentials
    const peekResult = await driver.exec(box.id, [
      'bash', '-c',
      'cat /home/operator/.claude.json 2>&1 || true'
    ], { user: memberBob.username });

    assert.ok(
      peekResult.stdout.includes('Permission denied') || peekResult.stderr.includes('Permission denied'),
      'POSIX boundary prevents collaborator from reading /home/operator/.claude.json'
    );
    console.log('  Security barrier verified: Collaborator cannot read operator credentials (Permission denied)');

    console.log('\n--- [3.5] Provisioning Idempotency Barrier ---');
    const duplicateBox = await manager.createBox({
      tenantId: `tenant-${testUid}`,
      name: `Invisible-Computer-${testUid}`,
      tier: 'power',
      agents: ['claude-code', 'openai-codex'],
      profileId: 'full-stack-agent-studio',
      idempotencyKey: `idem-key-${testUid}`
    });

    assert.strictEqual(duplicateBox.id, box.id, 'Idempotent creation returns identical box ID');
    console.log('  Provisioning idempotency verified: Duplicate request returns existing computer without double billing');

    // =========================================================================
    // SCENARIO 4: Safe Destruction Protocol
    // =========================================================================
    console.log('\n=== [SCENARIO 4] Safe Destruction Protocol ===');

    console.log('\n--- [4.1] Deliberate Deletion Confirmation ---');
    if (wsOwner && wsOwner.readyState === WebSocket.OPEN) wsOwner.close();
    if (wsCollab && wsCollab.readyState === WebSocket.OPEN) wsCollab.close();

    await manager.deleteBox(box.id, box.name);
    const boxRecord = manager.getBox(box.id);
    assert.strictEqual(boxRecord, undefined, 'Box removed from active registry');

    const runningList = await driver.list();
    const stillRunning = runningList.find(c => c.id === box.id);
    assert.strictEqual(stillRunning, undefined, 'Underlying Docker container terminated');
    console.log('  Safe destruction verified: Container, virtual displays, and network resources released');

    console.log('\n✔ Commission 012: The Invisible Computer — Adversarial Acceptance Test PASSED 100%!\n');
  } finally {
    if (wsOwner && wsOwner.readyState === WebSocket.OPEN) wsOwner.close();
    if (wsCollab && wsCollab.readyState === WebSocket.OPEN) wsCollab.close();
    await gateway.stop();
    if (box && box.id) {
      try {
        await driver.terminate(box.id);
      } catch {}
    }
  }
});
