/**
 * Persistent Storage & Volume Manager
 * Manages customer workspace persistence, snapshots, backups, and secure deletion.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const execute = promisify(execFile);

export interface VolumeSpec {
  homeVolume: string;
  workspaceVolume: string;
  networkName: string;
}

export class BoxStorageManager {
  constructor(private readonly namespace: string) {
    if (!/^[a-z0-9-]{1,32}$/.test(namespace)) {
      throw new Error(`Invalid storage namespace: ${namespace}`);
    }
  }

  getVolumeSpec(tenantId: string, boxId: string): VolumeSpec {
    const cleanTenant = tenantId.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'default';
    const prefix = `agentbox-${this.namespace}-${cleanTenant}-${boxId}`;
    return {
      homeVolume: `${prefix}-home`,
      workspaceVolume: `${prefix}-workspace`,
      networkName: `${prefix}-net`
    };
  }

  private async docker(args: string[], timeoutMs = 25000): Promise<string> {
    try {
      const res = await execute('docker', args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
      return res.stdout.trim();
    } catch (err: any) {
      const msg = err.stderr || err.stdout || err.message;
      throw new Error(`Docker volume operation failed [${args.join(' ')}]: ${msg}`);
    }
  }

  /**
   * Provisions isolated persistent volumes and an isolated bridge network for this box.
   */
  async provisionStorage(tenantId: string, boxId: string): Promise<VolumeSpec> {
    const spec = this.getVolumeSpec(tenantId, boxId);
    const labels = [
      '--label', `io.dreambeesai.namespace=${this.namespace}`,
      '--label', `io.dreambeesai.tenant=${tenantId}`,
      '--label', `io.dreambeesai.box.id=${boxId}`
    ];

    // 1. Create or verify Home Volume
    const homeExists = await this.volumeExists(spec.homeVolume);
    if (!homeExists) {
      await this.docker(['volume', 'create', ...labels, spec.homeVolume]);
    }

    // 2. Create or verify Workspace Volume
    const wsExists = await this.volumeExists(spec.workspaceVolume);
    if (!wsExists) {
      await this.docker(['volume', 'create', ...labels, spec.workspaceVolume]);
    }

    // 3. Create dedicated bridge network with inter-container communication disabled (enable_icc=false)
    const netExists = await this.networkExists(spec.networkName);
    if (!netExists) {
      try {
        await this.docker([
          'network', 'create',
          '--driver', 'bridge',
          '--opt', 'com.docker.network.bridge.enable_icc=false',
          ...labels,
          spec.networkName
        ]);
      } catch (err: any) {
        if (err.message && err.message.includes('all predefined address pools have been fully subnetted')) {
          await this.docker(['network', 'prune', '-f']).catch(() => {});
          await this.docker([
            'network', 'create',
            '--driver', 'bridge',
            '--opt', 'com.docker.network.bridge.enable_icc=false',
            ...labels,
            spec.networkName
          ]);
        } else {
          throw err;
        }
      }
    }

    return spec;
  }

  /**
   * Permanently deletes persistent storage and network for a box.
   */
  async purgeStorage(tenantId: string, boxId: string): Promise<void> {
    const spec = this.getVolumeSpec(tenantId, boxId);

    // Delete volumes
    for (const vol of [spec.workspaceVolume, spec.homeVolume]) {
      if (await this.volumeExists(vol)) {
        try {
          await this.docker(['volume', 'rm', '-f', vol]);
        } catch {
          // Ignore if already deleted
        }
      }
    }

    // Delete network
    if (await this.networkExists(spec.networkName)) {
      try {
        await this.docker(['network', 'rm', spec.networkName]);
      } catch {
        // Ignore if already deleted
      }
    }
  }

  /**
   * Creates a compressed tarball backup of customer's workspace volume.
   */
  async createWorkspaceBackup(tenantId: string, boxId: string, targetTarGzPath: string): Promise<{ sizeBytes: number }> {
    const spec = this.getVolumeSpec(tenantId, boxId);
    fs.mkdirSync(path.dirname(targetTarGzPath), { recursive: true });

    // Use lightweight alpine helper to tar customer volume without host root access
    const cmd = [
      'run', '--rm',
      '-v', `${spec.workspaceVolume}:/volume:ro`,
      '-v', `${path.dirname(targetTarGzPath)}:/backup`,
      'node:22-alpine',
      'tar', '-czf', `/backup/${path.basename(targetTarGzPath)}`, '-C', '/volume', '.'
    ];

    await this.docker(cmd, 60000);
    const stats = fs.statSync(targetTarGzPath);
    return { sizeBytes: stats.size };
  }

  /**
   * Restores a compressed tarball backup into customer's workspace volume.
   */
  async restoreWorkspaceBackup(tenantId: string, boxId: string, sourceTarGzPath: string): Promise<void> {
    const spec = this.getVolumeSpec(tenantId, boxId);
    if (!fs.existsSync(sourceTarGzPath)) {
      throw new Error(`Backup file not found: ${sourceTarGzPath}`);
    }

    const cmd = [
      'run', '--rm',
      '-v', `${spec.workspaceVolume}:/volume`,
      '-v', `${path.dirname(sourceTarGzPath)}:/backup:ro`,
      'node:22-alpine',
      'tar', '-xzf', `/backup/${path.basename(sourceTarGzPath)}`, '-C', '/volume'
    ];

    await this.docker(cmd, 60000);
  }

  /**
   * Measures disk usage inside the workspace volume in bytes.
   */
  async getVolumeUsageBytes(tenantId: string, boxId: string): Promise<number> {
    const spec = this.getVolumeSpec(tenantId, boxId);
    try {
      const out = await this.docker([
        'run', '--rm',
        '-v', `${spec.workspaceVolume}:/volume:ro`,
        'node:22-alpine',
        'du', '-sb', '/volume'
      ], 15000);
      const bytes = parseInt(out.split('\t')[0], 10);
      return Number.isFinite(bytes) ? bytes : 0;
    } catch {
      return 0;
    }
  }

  private async volumeExists(name: string): Promise<boolean> {
    try {
      const out = await this.docker(['volume', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}']);
      return out.split('\n').includes(name);
    } catch {
      return false;
    }
  }

  private async networkExists(name: string): Promise<boolean> {
    try {
      const out = await this.docker(['network', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}']);
      return out.split('\n').includes(name);
    } catch {
      return false;
    }
  }
}
