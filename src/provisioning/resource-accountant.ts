/**
 * Resource Accounting & Spend Guard Engine (Commission 008 Revision II)
 * Measures active compute time, idle compute time, memory/storage consumption,
 * network utilization, and enforces spending limits / automated budget safeguards.
 */

import type { AgentBox, BoxMetrics, BoxResourceAccounting, BoxTier, BoxState } from '../types/box.js';
import { BOX_TIERS } from '../types/box.js';
import { config, type CostRateConfig } from '../config.js';

export interface AggregateAccountingSummary {
  totalBoxesTracked: number;
  totalActiveComputeHours: number;
  totalIdleComputeHours: number;
  totalStorageGiBHours: number;
  totalNetworkRxGiB: number;
  totalNetworkTxGiB: number;
  totalActiveComputeCost: number;
  totalIdleComputeCost: number;
  totalStorageCost: number;
  totalNetworkCost: number;
  totalFleetCost: number;
  spendingLimitsEnforcedCount: number;
}

export class ResourceAccountant {
  private readonly rates: CostRateConfig;

  constructor(customRates?: CostRateConfig) {
    this.rates = customRates || config.rates;
  }

  getComputeRate(tier: BoxTier): number {
    switch (tier) {
      case 'power':
        return this.rates.powerComputePerHour;
      case 'titan':
        return this.rates.titanComputePerHour;
      case 'standard':
      default:
        return this.rates.standardComputePerHour;
    }
  }

  getStorageGiB(tier: BoxTier): number {
    switch (tier) {
      case 'power':
        return 25; // 25 GiB allocated persistent volume
      case 'titan':
        return 50; // 50 GiB allocated persistent volume
      case 'standard':
      default:
        return 10; // 10 GiB allocated persistent volume
    }
  }

  createRecord(
    boxId: string,
    tenantId: string,
    tier: BoxTier,
    spendingLimit?: number,
    provisioningDurationMs: number = 0
  ): BoxResourceAccounting {
    const computePerHour = this.getComputeRate(tier);
    const spec = BOX_TIERS[tier] || BOX_TIERS.standard;
    const allocatedMemoryGiB = Math.round(spec.memoryBytes / (1024 * 1024 * 1024));
    const persistentStorageGiB = this.getStorageGiB(tier);

    return {
      boxId,
      tenantId,
      tier,
      createdAt: Date.now(),
      provisioningDurationMs,
      activeComputeSeconds: 0,
      idleComputeSeconds: 0,
      lastStateChangeAt: Date.now(),
      currentState: 'requested',
      allocatedMemoryGiB,
      persistentStorageGiB,
      storageDurationHours: 0,
      networkRxBytes: 0,
      networkTxBytes: 0,
      rates: {
        computePerHour,
        idleComputePerHour: this.rates.idleComputePerHour,
        storagePerGiBMonth: this.rates.storagePerGiBMonth,
        networkPerGiB: this.rates.networkPerGiB
      },
      costs: {
        activeComputeCost: 0,
        idleComputeCost: 0,
        storageCost: 0,
        networkCost: 0,
        totalCost: 0
      },
      spendingLimit: spendingLimit ?? this.rates.defaultSpendingLimit,
      spendingLimitReached: false
    };
  }

  recordStateTransition(box: AgentBox, newState: BoxState, now = Date.now()): { spendingLimitExceeded: boolean } {
    if (!box.accounting) {
      box.accounting = this.createRecord(box.id, box.tenantId, box.tier);
    }

    const acc = box.accounting;
    const prevDeltaSec = Math.max(0, Math.floor((now - acc.lastStateChangeAt) / 1000));

    // Attribute delta time to previous state
    if (acc.currentState === 'running' || acc.currentState === 'ready' || acc.currentState === 'provisioning') {
      acc.activeComputeSeconds += prevDeltaSec;
    } else if (acc.currentState === 'suspended' || acc.currentState === 'stopped' || acc.currentState === 'expired') {
      acc.idleComputeSeconds += prevDeltaSec;
    }

    acc.currentState = newState;
    acc.lastStateChangeAt = now;
    acc.storageDurationHours = Math.max(0, (now - box.createdAt) / (1000 * 3600));

    this.recomputeCosts(acc);

    return this.checkSpendingLimit(box);
  }

  updateMetrics(box: AgentBox, metrics?: BoxMetrics, now = Date.now()): { spendingLimitExceeded: boolean } {
    if (!box.accounting) {
      box.accounting = this.createRecord(box.id, box.tenantId, box.tier);
    }

    const acc = box.accounting;
    const prevDeltaSec = Math.max(0, Math.floor((now - acc.lastStateChangeAt) / 1000));

    if (acc.currentState === 'running' || acc.currentState === 'ready') {
      acc.activeComputeSeconds += prevDeltaSec;
    } else if (acc.currentState === 'suspended' || acc.currentState === 'stopped') {
      acc.idleComputeSeconds += prevDeltaSec;
    }

    acc.lastStateChangeAt = now;
    acc.storageDurationHours = Math.max(0, (now - box.createdAt) / (1000 * 3600));

    if (metrics) {
      if (metrics.networkRxBytes > acc.networkRxBytes) acc.networkRxBytes = metrics.networkRxBytes;
      if (metrics.networkTxBytes > acc.networkTxBytes) acc.networkTxBytes = metrics.networkTxBytes;
    }

    this.recomputeCosts(acc);

    return this.checkSpendingLimit(box);
  }

  private recomputeCosts(acc: BoxResourceAccounting): void {
    // 1. Active compute cost = (seconds / 3600) * rate
    acc.costs.activeComputeCost = Number(((acc.activeComputeSeconds / 3600) * acc.rates.computePerHour).toFixed(4));

    // 2. Idle compute cost = (seconds / 3600) * idleRate
    acc.costs.idleComputeCost = Number(((acc.idleComputeSeconds / 3600) * acc.rates.idleComputePerHour).toFixed(4));

    // 3. Storage cost = storageGiB * (hours / 720) * storageRatePerGiBMonth
    acc.costs.storageCost = Number(
      (acc.persistentStorageGiB * (acc.storageDurationHours / 720) * acc.rates.storagePerGiBMonth).toFixed(4)
    );

    // 4. Network cost = (rxGiB + txGiB) * networkRatePerGiB
    const totalNetworkGiB = (acc.networkRxBytes + acc.networkTxBytes) / (1024 * 1024 * 1024);
    acc.costs.networkCost = Number((totalNetworkGiB * acc.rates.networkPerGiB).toFixed(4));

    // 5. Total cost
    acc.costs.totalCost = Number(
      (
        acc.costs.activeComputeCost +
        acc.costs.idleComputeCost +
        acc.costs.storageCost +
        acc.costs.networkCost
      ).toFixed(4)
    );
  }

  private checkSpendingLimit(box: AgentBox): { spendingLimitExceeded: boolean } {
    const acc = box.accounting!;
    if (acc.spendingLimit && acc.costs.totalCost >= acc.spendingLimit) {
      if (!acc.spendingLimitReached) {
        acc.spendingLimitReached = true;
        return { spendingLimitExceeded: true };
      }
    }
    return { spendingLimitExceeded: false };
  }

  getAggregateSummary(boxes: AgentBox[]): AggregateAccountingSummary {
    let totalActiveComputeSeconds = 0;
    let totalIdleComputeSeconds = 0;
    let totalStorageGiBHours = 0;
    let totalNetworkRxBytes = 0;
    let totalNetworkTxBytes = 0;
    let totalActiveComputeCost = 0;
    let totalIdleComputeCost = 0;
    let totalStorageCost = 0;
    let totalNetworkCost = 0;
    let totalFleetCost = 0;
    let spendingLimitsEnforcedCount = 0;

    for (const b of boxes) {
      if (!b.accounting) continue;
      const acc = b.accounting;
      totalActiveComputeSeconds += acc.activeComputeSeconds;
      totalIdleComputeSeconds += acc.idleComputeSeconds;
      totalStorageGiBHours += acc.persistentStorageGiB * acc.storageDurationHours;
      totalNetworkRxBytes += acc.networkRxBytes;
      totalNetworkTxBytes += acc.networkTxBytes;

      totalActiveComputeCost += acc.costs.activeComputeCost;
      totalIdleComputeCost += acc.costs.idleComputeCost;
      totalStorageCost += acc.costs.storageCost;
      totalNetworkCost += acc.costs.networkCost;
      totalFleetCost += acc.costs.totalCost;

      if (acc.spendingLimitReached) spendingLimitsEnforcedCount++;
    }

    return {
      totalBoxesTracked: boxes.filter(b => !!b.accounting).length,
      totalActiveComputeHours: Number((totalActiveComputeSeconds / 3600).toFixed(2)),
      totalIdleComputeHours: Number((totalIdleComputeSeconds / 3600).toFixed(2)),
      totalStorageGiBHours: Number(totalStorageGiBHours.toFixed(2)),
      totalNetworkRxGiB: Number((totalNetworkRxBytes / (1024 * 1024 * 1024)).toFixed(3)),
      totalNetworkTxGiB: Number((totalNetworkTxBytes / (1024 * 1024 * 1024)).toFixed(3)),
      totalActiveComputeCost: Number(totalActiveComputeCost.toFixed(2)),
      totalIdleComputeCost: Number(totalIdleComputeCost.toFixed(2)),
      totalStorageCost: Number(totalStorageCost.toFixed(2)),
      totalNetworkCost: Number(totalNetworkCost.toFixed(2)),
      totalFleetCost: Number(totalFleetCost.toFixed(2)),
      spendingLimitsEnforcedCount
    };
  }
}
