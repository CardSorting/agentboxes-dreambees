/**
 * AgentBoxes Capacity & Resource Allocation Manager
 * Enforces host hardware boundaries, prevents overcommit, and manages capacity reservations.
 */

import os from 'node:os';
import type { BoxTier, AgentBox, CapacitySnapshot } from '../types/box.js';
import { BOX_TIERS } from '../types/box.js';

export interface ReservationRecord {
  boxId: string;
  tenantId: string;
  tier: BoxTier;
  cpus: number;
  memoryBytes: number;
  reservedAt: number;
}

export class CapacityManager {
  private readonly reservations = new Map<string, ReservationRecord>();

  constructor(
    private readonly maxRunningBoxes: number = 10,
    private readonly maxTotalBoxes: number = 50,
    private readonly maxBoxesPerTenant: number = 5,
    private readonly reservationTtlMs: number = 120 * 1000 // 2 minutes
  ) {}

  private cleanStaleReservations(): void {
    const now = Date.now();
    for (const [boxId, record] of this.reservations.entries()) {
      if (now - record.reservedAt > this.reservationTtlMs) {
        this.reservations.delete(boxId);
      }
    }
  }

  evaluateRequest(
    tenantId: string,
    tier: BoxTier,
    activeBoxes: AgentBox[]
  ): { allowed: boolean; reason?: string; code?: string; queueable: boolean } {
    this.cleanStaleReservations();

    const spec = BOX_TIERS[tier] || BOX_TIERS.standard;

    // 1. Per-Tenant box quota
    const tenantRunningCount = activeBoxes.filter(
      b => b.tenantId === tenantId && ['running', 'provisioning', 'ready', 'queued'].includes(b.state)
    ).length;
    const tenantReservations = Array.from(this.reservations.values()).filter(r => r.tenantId === tenantId).length;

    if (tenantRunningCount + tenantReservations >= this.maxBoxesPerTenant) {
      return {
        allowed: false,
        code: 'tenant_quota_exceeded',
        reason: `Tenant quota exceeded. Maximum ${this.maxBoxesPerTenant} active AgentBoxes allowed per account.`,
        queueable: false
      };
    }

    // 2. Global running box count limit
    const totalRunningCount = activeBoxes.filter(
      b => ['running', 'provisioning', 'ready'].includes(b.state)
    ).length;
    if (totalRunningCount + this.reservations.size >= this.maxRunningBoxes) {
      return {
        allowed: false,
        code: 'running_limit_reached',
        reason: `Host running limit reached (${this.maxRunningBoxes} max concurrent boxes). Operation can be queued.`,
        queueable: true
      };
    }

    // 3. Compute Resource Allocation (vCPUs and RAM)
    const hostCpus = os.cpus().length || 4;
    const hostTotalMem = os.totalmem();

    let allocatedCpus = 0;
    let allocatedMem = 0;

    for (const b of activeBoxes) {
      if (['running', 'provisioning', 'ready'].includes(b.state)) {
        const bSpec = BOX_TIERS[b.tier] || BOX_TIERS.standard;
        allocatedCpus += bSpec.cpus;
        allocatedMem += bSpec.memoryBytes;
      }
    }

    for (const r of this.reservations.values()) {
      allocatedCpus += r.cpus;
      allocatedMem += r.memoryBytes;
    }

    // Conservative overcommit factor: 2.0x for CPUs on development desktops, 1.0x for RAM
    const maxAllocatableCpus = hostCpus * 2;
    const maxAllocatableMem = hostTotalMem * 0.9; // Reserve 10% for OS daemon

    if (allocatedCpus + spec.cpus > maxAllocatableCpus) {
      return {
        allowed: false,
        code: 'cpu_capacity_exhausted',
        reason: `Insufficient host CPU capacity for tier '${tier}' (${spec.cpus} vCPUs required).`,
        queueable: true
      };
    }

    if (allocatedMem + spec.memoryBytes > maxAllocatableMem) {
      return {
        allowed: false,
        code: 'memory_capacity_exhausted',
        reason: `Insufficient host memory capacity for tier '${tier}' (${spec.memoryLimit} required).`,
        queueable: true
      };
    }

    return { allowed: true, queueable: false };
  }

  reserve(boxId: string, tenantId: string, tier: BoxTier): void {
    const spec = BOX_TIERS[tier] || BOX_TIERS.standard;
    this.reservations.set(boxId, {
      boxId,
      tenantId,
      tier,
      cpus: spec.cpus,
      memoryBytes: spec.memoryBytes,
      reservedAt: Date.now()
    });
  }

  release(boxId: string): void {
    this.reservations.delete(boxId);
  }

  getSnapshot(allBoxes: AgentBox[]): CapacitySnapshot {
    this.cleanStaleReservations();

    const hostCpus = os.cpus().length || 4;
    const hostTotalMem = os.totalmem();
    const hostFreeMem = os.freemem();

    let allocatedCpus = 0;
    let allocatedMemoryBytes = 0;
    let runningBoxCount = 0;

    for (const b of allBoxes) {
      if (['running', 'provisioning', 'ready'].includes(b.state)) {
        const bSpec = BOX_TIERS[b.tier] || BOX_TIERS.standard;
        allocatedCpus += bSpec.cpus;
        allocatedMemoryBytes += bSpec.memoryBytes;
        runningBoxCount++;
      }
    }

    for (const r of this.reservations.values()) {
      allocatedCpus += r.cpus;
      allocatedMemoryBytes += r.memoryBytes;
    }

    const availableCpus = Math.max(0, hostCpus * 2 - allocatedCpus);
    const availableMemoryBytes = Math.max(0, hostTotalMem - allocatedMemoryBytes);

    const tierAvailability: Record<BoxTier, boolean> = {
      standard: availableCpus >= BOX_TIERS.standard.cpus && availableMemoryBytes >= BOX_TIERS.standard.memoryBytes,
      power: availableCpus >= BOX_TIERS.power.cpus && availableMemoryBytes >= BOX_TIERS.power.memoryBytes,
      titan: availableCpus >= BOX_TIERS.titan.cpus && availableMemoryBytes >= BOX_TIERS.titan.memoryBytes
    };

    return {
      hostCpuCount: hostCpus,
      hostTotalMemoryBytes: hostTotalMem,
      hostFreeMemoryBytes: hostFreeMem,
      allocatedCpus,
      allocatedMemoryBytes,
      availableCpus,
      availableMemoryBytes,
      activeReservations: this.reservations.size,
      runningBoxCount,
      maxRunningBoxes: this.maxRunningBoxes,
      totalBoxCount: allBoxes.length,
      maxTotalBoxes: this.maxTotalBoxes,
      tierAvailability
    };
  }
}
