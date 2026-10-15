/**
 * Lifecycle Policy Engine & Autonomous Reconciliation
 * Implements Commission 008 Section V:
 * - Idle compute suspension (preserves workspace)
 * - Subscription expiration (compute stopped, data preserved during grace period)
 * - Unexpected container failure recovery (bounded retries, no infinite loops)
 * - Orphaned resource cleanup (detects and reaps untracked containers/volumes)
 * - Interrupted deletion reconciliation
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentBoxManager } from './box-manager.js';
import type { AgentBoxDriver } from './box-driver.js';
import { config, type LifecyclePolicyConfig } from '../config.js';

const execute = promisify(execFile);

export class LifecyclePolicyEngine {
  private timer?: NodeJS.Timeout;
  private isReconciling = false;

  constructor(
    private readonly manager: AgentBoxManager,
    private readonly driver: AgentBoxDriver,
    private readonly namespace: string,
    private readonly policies: LifecyclePolicyConfig
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runReconciliationLoop().catch(err => {
        console.warn('Lifecycle reconciliation warning:', err.message);
      });
    }, this.policies.reconcileIntervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runReconciliationLoop(): Promise<{
    suspendedCount: number;
    expiredCount: number;
    recoveredCount: number;
    orphansReaped: number;
  }> {
    if (this.isReconciling) {
      return { suspendedCount: 0, expiredCount: 0, recoveredCount: 0, orphansReaped: 0 };
    }
    this.isReconciling = true;

    let suspendedCount = 0;
    let expiredCount = 0;
    let recoveredCount = 0;
    let orphansReaped = 0;

    try {
      const now = Date.now();
      const allBoxes = this.manager.listBoxes();
      const liveContainers = await this.driver.list();
      const liveMap = new Map(liveContainers.map(c => [c.id, c]));

      for (const box of allBoxes) {
        // 0. Resource Accounting & Spending Limit Automated Safeguard (Section IV.E & Commission 008.VII)
        if (this.manager.accountant) {
          const { spendingLimitExceeded } = this.manager.accountant.updateMetrics(box, undefined, now);

          // Check aggregate tenant-level fleet spending limit as well
          const tenantBoxes = allBoxes.filter(b => b.tenantId === box.tenantId);
          const tenantSummary = this.manager.accountant.getAggregateSummary(tenantBoxes);
          const tenantLimit = box.accounting?.spendingLimit ?? config.rates.defaultSpendingLimit;
          const tenantLimitExceeded = tenantSummary.totalFleetCost >= tenantLimit;

          if ((spendingLimitExceeded || tenantLimitExceeded) && (box.state === 'running' || box.state === 'ready')) {
            await this.manager.suspendBox(box.id, 'spending_limit_exceeded');
            suspendedCount++;
            continue;
          }
        }

        // 1. Subscription Expiration Check
        if (box.lifecycle.expiresAt && now >= box.lifecycle.expiresAt) {
          if (box.state !== 'expired' && box.state !== 'decommissioning' && box.state !== 'deleted') {
            await this.manager.expireBox(box.id);
            expiredCount++;
            continue;
          }
        }

        // 2. Idle Compute Suspension Check
        if (box.state === 'running' && this.policies.idleTimeoutMinutes > 0) {
          const idleMs = now - (box.lifecycle.lastActivityAt || box.updatedAt);
          const maxIdleMs = this.policies.idleTimeoutMinutes * 60 * 1000;
          if (idleMs > maxIdleMs) {
            await this.manager.suspendBox(box.id, 'idle_timeout');
            suspendedCount++;
            continue;
          }
        }

        // 3. Container Liveness & Unexpected Termination Recovery
        if (box.state === 'running' || box.state === 'ready') {
          const live = liveMap.get(box.id);
          if (!live || !live.running) {
            // Container died unexpectedly
            if (box.lifecycle.recoveryAttempts < this.policies.maxRecoveryRetries) {
              const recovered = await this.manager.attemptRecovery(box.id);
              if (recovered) recoveredCount++;
            } else {
              // Bounded retries exceeded - mark failed without infinite restart loop
              await this.manager.markFailed(
                box.id,
                `Container terminated unexpectedly. Recovery exceeded ${this.policies.maxRecoveryRetries} attempts.`
              );
            }
          }
        }

        // 4. Interrupted Deletion Recovery
        if (box.state === 'decommissioning') {
          await this.manager.finishDecommissioning(box.id);
        }
      }

      // 5. Orphaned Resource Cleanup
      orphansReaped = await this.reapOrphanedResources(allBoxes);
    } finally {
      this.isReconciling = false;
    }

    return { suspendedCount, expiredCount, recoveredCount, orphansReaped };
  }

  /**
   * Scans Docker for containers, volumes, and networks with the AgentBoxes namespace
   * that do not correspond to any active box in the ledger, and safely removes them.
   */
  private async reapOrphanedResources(knownBoxes: ReturnType<AgentBoxManager['listBoxes']>): Promise<number> {
    const knownBoxIds = new Set(knownBoxes.filter(b => b.state !== 'deleted').map(b => b.id));
    let reaped = 0;

    try {
      // 1. Scan containers with namespace label
      const { stdout: containerOut } = await execute('docker', [
        'ps', '-a',
        '--filter', `label=io.dreambeesai.namespace=${this.namespace}`,
        '--format', '{{.ID}}\t{{.Label "io.dreambeesai.box.id"}}'
      ]);

      for (const line of containerOut.split('\n').filter(Boolean)) {
        const [cid, boxId] = line.split('\t');
        if (boxId && !knownBoxIds.has(boxId)) {
          console.log(`Reaping orphaned container ${cid} (box ${boxId})...`);
          await execute('docker', ['rm', '-f', cid]).catch(() => {});
          reaped++;
        }
      }

      // 2. Scan networks with namespace label
      const { stdout: netOut } = await execute('docker', [
        'network', 'ls',
        '--filter', `label=io.dreambeesai.namespace=${this.namespace}`,
        '--format', '{{.Name}}\t{{.Label "io.dreambeesai.box.id"}}'
      ]);

      for (const line of netOut.split('\n').filter(Boolean)) {
        const [netName, boxId] = line.split('\t');
        if (boxId && !knownBoxIds.has(boxId)) {
          console.log(`Reaping orphaned network ${netName} (box ${boxId})...`);
          await execute('docker', ['network', 'rm', netName]).catch(() => {});
          reaped++;
        }
      }

      // 3. Scan volumes with namespace label
      const { stdout: volOut } = await execute('docker', [
        'volume', 'ls',
        '--filter', `label=io.dreambeesai.namespace=${this.namespace}`,
        '--format', '{{.Name}}\t{{.Label "io.dreambeesai.box.id"}}'
      ]);

      for (const line of volOut.split('\n').filter(Boolean)) {
        const [volName, boxId] = line.split('\t');
        if (boxId && !knownBoxIds.has(boxId)) {
          console.log(`Reaping orphaned volume ${volName} (box ${boxId})...`);
          await execute('docker', ['volume', 'rm', '-f', volName]).catch(() => {});
          reaped++;
        }
      }
    } catch {
      // Ignore daemon query failures during reconciliation
    }

    return reaped;
  }
}
