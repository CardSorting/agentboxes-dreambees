/**
 * Docker AgentBox Driver
 * Orchestrates isolated Linux desktop containers, display bridging, and resource constraints.
 */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Duplex, Readable } from 'node:stream';
import path from 'node:path';
import type { AgentBox, BoxContainerRecord, BoxMetrics } from '../types/box.js';
import { BOX_TIERS } from '../types/box.js';
import { BoxStorageManager } from './storage-manager.js';

const execute = promisify(execFile);

export interface AgentBoxDriver {
  available(): Promise<boolean>;
  list(): Promise<BoxContainerRecord[]>;
  create(box: AgentBox): Promise<string>;
  start(boxId: string): Promise<void>;
  stop(boxId: string): Promise<void>;
  destroy(boxId: string): Promise<void>;
  terminate(boxId: string): Promise<void>;
  display(boxId: string, options?: { port?: number; username?: string }): Promise<Duplex>;
  clipboard(boxId: string, text?: string): Promise<string>;
  launch(boxId: string, app: string): Promise<void>;
  exec(boxId: string, cmd: string[], options?: { user?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  metrics(boxId: string): Promise<BoxMetrics>;
  exportWorkspace(boxId: string): Readable;
  createMemberUser(boxId: string, username: string, uid: number, displayName?: string, email?: string): Promise<void>;
  startMemberDesktopSession(boxId: string, username: string, displayNumber: number): Promise<number>;
  stopMemberDesktopSession(boxId: string, username: string, displayNumber: number): Promise<void>;
  revokeMemberAccess(boxId: string, username: string): Promise<void>;
}

export class DockerBoxDriver implements AgentBoxDriver {
  private readonly storage: BoxStorageManager;

  constructor(
    private readonly namespace: string,
    private readonly image = 'dreambeesai/agentbox:v1',
    private readonly seccompPath = path.resolve(process.cwd(), 'desktop-image/seccomp.json')
  ) {
    if (!/^[a-z0-9-]{1,32}$/.test(namespace)) {
      throw new Error(`Invalid DockerBoxDriver namespace: ${namespace}`);
    }
    this.storage = new BoxStorageManager(namespace);
  }

  containerName(boxId: string): string {
    return `dreambees-box-${this.namespace}-${boxId}`;
  }

  private async docker(args: string[], timeoutMs = 30000): Promise<string> {
    try {
      const res = await execute('docker', args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
      return res.stdout.trim();
    } catch (err: any) {
      const msg = err.stderr || err.stdout || err.message;
      throw new Error(`Docker error [${args[0]}]: ${msg}`);
    }
  }

  async available(): Promise<boolean> {
    try {
      await this.docker(['image', 'inspect', this.image, '--format', '{{.Id}}']);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<BoxContainerRecord[]> {
    const ids = (await this.docker([
      'ps', '-a',
      '--filter', `label=io.dreambeesai.namespace=${this.namespace}`,
      '--format', '{{.ID}}'
    ])).split('\n').filter(Boolean);

    if (ids.length === 0) return [];

    const raw = await this.docker([
      'inspect',
      '--format', '{{json .Id}}\t{{json .Name}}\t{{json .Config.Labels}}\t{{.State.Running}}\t{{with index .State "Health"}}{{.Status}}{{end}}',
      ...ids
    ]);

    return raw.split('\n').filter(Boolean).map(line => {
      const [cidJson, nameJson, labelsJson, runningStr, healthStr] = line.split('\t');
      const containerId = JSON.parse(cidJson);
      const labels = JSON.parse(labelsJson || '{}');
      const boxId = labels['io.dreambeesai.box.id'] || '';
      const running = runningStr === 'true';
      const healthy = healthStr === 'healthy';

      return {
        id: boxId,
        containerId,
        running,
        healthy,
        status: running ? (healthy ? 'healthy' : 'running') : 'stopped'
      };
    });
  }

  async create(box: AgentBox): Promise<string> {
    const name = this.containerName(box.id);
    const tierSpec = BOX_TIERS[box.tier] || BOX_TIERS.standard;

    // 1. Provision persistent storage and dedicated isolated network
    const storageSpec = await this.storage.provisionStorage(box.tenantId, box.id);

    const labels = [
      '--label', `io.dreambeesai.namespace=${this.namespace}`,
      '--label', `io.dreambeesai.tenant=${box.tenantId}`,
      '--label', `io.dreambeesai.box.id=${box.id}`,
      '--label', `io.dreambeesai.tier=${box.tier}`
    ];

    // 2. Assemble hardened container arguments
    const createArgs = [
      'create',
      '--name', name,
      ...labels,
      '--hostname', `agentbox-${box.id.slice(0, 8)}`,
      '--restart', 'unless-stopped',
      '--user', '1000:1000',
      '--cap-drop', 'ALL',
      '--cap-add', 'CHOWN',
      '--cap-add', 'DAC_OVERRIDE',
      '--cap-add', 'FOWNER',
      '--cap-add', 'SETUID',
      '--cap-add', 'SETGID',
      '--security-opt', 'no-new-privileges:true',
      '--security-opt', `seccomp=${this.seccompPath}`,
      // Resource quotas
      '--pids-limit', String(tierSpec.pidsLimit),
      '--memory', tierSpec.memoryLimit,
      '--memory-swap', tierSpec.memoryLimit,
      '--cpus', String(tierSpec.cpus),
      '--shm-size', tierSpec.shmSize,
      // Network isolation
      '--network', storageSpec.networkName,
      // Persistent Volume Mounts
      '--mount', `type=volume,source=${storageSpec.homeVolume},target=/home/operator`,
      '--mount', `type=volume,source=${storageSpec.workspaceVolume},target=/home/operator/workspace`,
      // Ephemeral tmpfs (no swap / secure cleanup)
      '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m,uid=1000,gid=1000',
      '--log-opt', 'max-size=10m',
      '--log-opt', 'max-file=3',
      this.image
    ];

    const containerId = await this.docker(createArgs, 45000);
    return containerId;
  }

  async start(boxId: string): Promise<void> {
    const name = this.containerName(boxId);
    await this.docker(['start', name], 30000);
  }

  async stop(boxId: string): Promise<void> {
    const name = this.containerName(boxId);
    // Graceful Chrome shutdown first if running
    try {
      await this.docker(['exec', name, 'pkill', '-TERM', '-x', 'chrome'], 5000);
    } catch {
      // Chrome might not be open
    }
    await this.docker(['stop', '--time', '10', name], 25000);
  }

  async destroy(boxId: string): Promise<void> {
    const name = this.containerName(boxId);
    try {
      await this.stop(boxId);
    } catch {
      // Ignore if already stopped
    }
    try {
      await this.docker(['rm', '-f', name], 15000);
    } catch {
      // Ignore if container not found
    }
    // Purge persistent storage
    const records = await this.list();
    const match = records.find(r => r.id === boxId);
    // Even if container record is gone, purge by ID
    await this.storage.purgeStorage('default', boxId);
  }

  async terminate(boxId: string): Promise<void> {
    return this.destroy(boxId);
  }

  async display(boxId: string, options?: { port?: number; username?: string }): Promise<Duplex> {
    const name = this.containerName(boxId);
    const port = options?.port || 5900;
    const user = options?.username || '1000:1000';
    const child = spawn(
      'docker',
      ['exec', '-i', '--user', user, name, 'python3', '/opt/agentbox/display-bridge.py', String(port)],
      { stdio: ['pipe', 'pipe', 'ignore'] }
    );

    const stream = Duplex.from({ readable: child.stdout, writable: child.stdin });
    child.once('error', () => stream.destroy(new Error('Display bridge transport failed')));
    child.once('exit', () => stream.destroy());
    stream.once('close', () => child.kill('SIGTERM'));
    stream.on('error', () => {});
    return stream;
  }

  async createMemberUser(boxId: string, username: string, uid: number, displayName?: string, email?: string): Promise<void> {
    const name = this.containerName(boxId);
    const gitName = displayName ? displayName.replace(/"/g, '\\"') : username;
    const gitEmail = email || `${username}@dreambees.local`;
    await this.docker([
      'exec', '--user', 'root', name,
      'bash', '-c',
      `echo "umask 002" > /etc/agentbox-env.sh && chmod 644 /etc/agentbox-env.sh && ` +
      `git config --system --unset-all safe.directory 2>/dev/null || true && ` +
      `git config --system --add safe.directory /home/operator/workspace && ` +
      `git config --system --add safe.directory '/home/*/workspace' && ` +
      `git config --system init.defaultBranch main && ` +
      `getent passwd ${username} >/dev/null 2>&1 || useradd -m -u ${uid} -g desktop -s /bin/bash ${username} && ` +
      `chmod 700 /home/${username} && ` +
      `echo "umask 002" >> /home/${username}/.bashrc && ` +
      `git config --file /home/${username}/.gitconfig user.name "${gitName}" && ` +
      `git config --file /home/${username}/.gitconfig user.email "${gitEmail}" && ` +
      `chown ${username}:desktop /home/${username}/.gitconfig && ` +
      `ln -sfn /home/operator/workspace /home/${username}/workspace && ` +
      `mkdir -p /home/operator/workspace && chmod 2775 /home/operator/workspace && chown 1000:desktop /home/operator/workspace`
    ]);
  }

  async startMemberDesktopSession(boxId: string, username: string, displayNumber: number): Promise<number> {
    const name = this.containerName(boxId);
    const port = 5900 + displayNumber;
    const display = `:${displayNumber}`;

    await this.docker([
      'exec', '--user', username, name,
      'bash', '-c',
      `pgrep -f "Xvfb ${display}" >/dev/null 2>&1 || (Xvfb ${display} -screen 0 1440x900x24 -nolisten tcp -ac >/tmp/xvfb-${username}.log 2>&1 & sleep 0.5)`
    ]);

    await this.docker([
      'exec', '--user', username, name,
      'bash', '-c',
      `pgrep -f "rfbport ${port}" >/dev/null 2>&1 || (x11vnc -display ${display} -rfbport ${port} -localhost -forever -nopw -noxdamage -repeat -xkb -quiet >/tmp/x11vnc-${username}.log 2>&1 & sleep 0.5)`
    ]);

    return port;
  }

  async stopMemberDesktopSession(boxId: string, username: string, displayNumber: number): Promise<void> {
    const name = this.containerName(boxId);
    const port = 5900 + displayNumber;
    const display = `:${displayNumber}`;

    await this.docker([
      'exec', '--user', 'root', name,
      'bash', '-c',
      `pkill -f "rfbport ${port}" || true; pkill -f "Xvfb ${display}" || true; pkill -u ${username} || true`
    ]).catch(() => {});
  }

  async revokeMemberAccess(boxId: string, username: string): Promise<void> {
    const name = this.containerName(boxId);
    await this.docker([
      'exec', '--user', 'root', name,
      'bash', '-c',
      `pkill -9 -u ${username} || true; passwd -l ${username} || true`
    ]).catch(() => {});
  }

  async clipboard(boxId: string, text?: string): Promise<string> {
    const name = this.containerName(boxId);
    if (text !== undefined) {
      if (typeof text !== 'string' || text.length > 65536) {
        throw new Error('Clipboard text must not exceed 65,536 characters.');
      }
      return new Promise<string>((resolve, reject) => {
        const child = spawn(
          'docker',
          ['exec', '-i', '--user', '1000:1000', name, 'xclip', '-selection', 'clipboard', '-in'],
          { stdio: ['pipe', 'ignore', 'ignore'] }
        );
        const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Clipboard timeout')); }, 5000);
        child.once('error', (err) => { clearTimeout(timer); reject(err); });
        child.once('exit', (code) => {
          clearTimeout(timer);
          if (code === 0) resolve('');
          else reject(new Error('xclip failed'));
        });
        child.stdin.end(text, 'utf8');
      });
    }

    const raw = await this.docker([
      'exec', '--user', '1000:1000', name,
      'python3', '-c',
      'import gi,json;gi.require_version("Gtk","3.0");from gi.repository import Gtk,Gdk;print(json.dumps((Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).wait_for_text() or "")[:65536]))'
    ], 5000);

    return JSON.parse(raw);
  }

  async launch(boxId: string, app: string): Promise<void> {
    const name = this.containerName(boxId);
    await this.docker(['exec', '--user', '1000:1000', name, '/opt/agentbox/open-app', app], 10000);
  }

  async exec(boxId: string, cmd: string[], options?: { user?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const name = this.containerName(boxId);
    const user = options?.user || '1000:1000';
    const envArgs = [
      '-e', 'BASH_ENV=/etc/agentbox-env.sh',
      ...(options?.user && options.user !== '1000:1000' && options.user !== 'root'
        ? ['-e', `HOME=/home/${options.user}`]
        : [])
    ];
    try {
      const res = await execute('docker', ['exec', '--user', user, ...envArgs, name, ...cmd], { timeout: 120000 });
      return { stdout: res.stdout, stderr: res.stderr, exitCode: 0 };
    } catch (err: any) {
      return { stdout: err.stdout || '', stderr: err.stderr || err.message, exitCode: err.code || 1 };
    }
  }

  async metrics(boxId: string): Promise<BoxMetrics> {
    const name = this.containerName(boxId);
    try {
      const raw = await this.docker([
        'stats', name, '--no-stream',
        '--format', '{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}\t{{.NetIO}}'
      ], 8000);

      const [cpuStr, memStr, memPercStr, pidsStr, netStr] = raw.split('\t');
      const cpuPercent = parseFloat(cpuStr?.replace('%', '') || '0');
      const memPerc = parseFloat(memPercStr?.replace('%', '') || '0');
      const pidsCount = parseInt(pidsStr || '0', 10);

      // Parse Memory "123MiB / 4GiB"
      const [usedPart, limitPart] = (memStr || '').split('/').map(s => s.trim());
      const memoryUsageBytes = this.parseByteUnit(usedPart);
      const memoryLimitBytes = this.parseByteUnit(limitPart);

      // Parse Network "1.2MB / 450kB"
      const [rxPart, txPart] = (netStr || '').split('/').map(s => s.trim());
      const networkRxBytes = this.parseByteUnit(rxPart);
      const networkTxBytes = this.parseByteUnit(txPart);

      return {
        cpuPercent,
        memoryUsageBytes,
        memoryLimitBytes,
        memoryPercent: memPerc,
        diskUsageBytes: 0, // Augmented by manager
        pidsCount,
        networkRxBytes,
        networkTxBytes,
        measuredAt: Date.now()
      };
    } catch {
      return {
        cpuPercent: 0,
        memoryUsageBytes: 0,
        memoryLimitBytes: 0,
        memoryPercent: 0,
        diskUsageBytes: 0,
        pidsCount: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
        measuredAt: Date.now()
      };
    }
  }

  private parseByteUnit(str: string): number {
    if (!str) return 0;
    const match = str.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    if (unit.startsWith('K')) return Math.round(num * 1024);
    if (unit.startsWith('M')) return Math.round(num * 1024 * 1024);
    if (unit.startsWith('G')) return Math.round(num * 1024 * 1024 * 1024);
    if (unit.startsWith('T')) return Math.round(num * 1024 * 1024 * 1024 * 1024);
    return Math.round(num);
  }

  exportWorkspace(boxId: string): Readable {
    const name = this.containerName(boxId);
    const pythonScript = [
      'import os, sys, tarfile',
      'ws = os.path.realpath("/home/operator/workspace")',
      'with tarfile.open(fileobj=sys.stdout.buffer, mode="w:gz") as tar:',
      '    for root, dirs, files in os.walk(ws):',
      '        for name in dirs + files:',
      '            full = os.path.join(root, name)',
      '            rel = os.path.relpath(full, ws)',
      '            if os.path.islink(full):',
      '                tgt = os.path.realpath(full)',
      '                if not (tgt == ws or tgt.startswith(ws + os.sep)):',
      '                    continue',
      '            try:',
      '                tar.add(full, arcname=rel, recursive=False)',
      '            except Exception:',
      '                pass'
    ].join('\n');

    const child = spawn(
      'docker',
      ['exec', '--user', '1000:1000', name, 'python3', '-c', pythonScript],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    );
    child.once('error', (err) => child.stdout.destroy(err));
    return child.stdout;
  }
}
