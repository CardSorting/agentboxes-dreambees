/**
 * AgentBox Orchestrator & Lifecycle Manager
 * Autonomous Provisioning & Decommissioning Engine (Commission 008)
 * Implements the explicit state machine:
 * REQUESTED -> QUEUED -> PROVISIONING -> READY -> RUNNING -> STOPPED -> DECOMMISSIONING -> DELETED
 * Supports FAILED, RECOVERING, SUSPENDED, EXPIRED.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import type {
  AgentBox,
  BoxMetrics,
  CreateBoxRequest,
  ResetBoxRequest,
  DeleteBoxRequest,
  BoxTier,
  BoxState,
  LifecycleJob,
  BoxMember,
  InviteMemberRequest,
  RevokeMemberRequest
} from '../types/box.js';
import { BOX_TIERS } from '../types/box.js';
import type { AgentBoxDriver } from './box-driver.js';
import { AgentCatalogService } from '../catalog/agent-catalog.js';
import { AgentInstaller } from '../catalog/installer.js';
import { CapacityManager } from './capacity-manager.js';
import { JobManager } from './job-manager.js';
import { ResourceAccountant } from './resource-accountant.js';
import { DiagnosticClassifier } from './diagnostic-classifier.js';
import { config } from '../config.js';

export class AgentBoxManager {
  private readonly boxes = new Map<string, AgentBox>();
  private readonly catalogService = new AgentCatalogService();
  private readonly operationLocks = new Set<string>();
  readonly capacity: CapacityManager;
  readonly jobs: JobManager;
  readonly accountant: ResourceAccountant;

  constructor(
    private readonly storageFile: string,
    readonly driver: AgentBoxDriver,
    private readonly maxRunning = 10,
    private readonly maxTotal = 50,
    jobsFile?: string
  ) {
    fs.mkdirSync(path.dirname(storageFile), { recursive: true, mode: 0o700 });
    this.capacity = new CapacityManager(maxRunning, maxTotal);
    this.accountant = new ResourceAccountant();
    const resolvedJobsFile = jobsFile || storageFile.replace(/\.json$/, '-jobs.json');
    this.jobs = new JobManager(resolvedJobsFile);

    this.loadState();

    // Register async job executor
    this.jobs.setJobRunner(this.executeJob.bind(this));
  }

  private loadState(): void {
    if (fs.existsSync(this.storageFile)) {
      try {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const list: AgentBox[] = JSON.parse(raw);
        for (const item of list) {
          // Normalize legacy records if missing lifecycle block
          if (!item.lifecycle) {
            item.lifecycle = {
              state: item.state,
              lastStateChangeAt: item.updatedAt || Date.now(),
              lastActivityAt: item.updatedAt || Date.now(),
              recoveryAttempts: 0
            };
          }
          this.boxes.set(item.id, item);
        }
      } catch (err) {
        console.warn('Could not read existing boxes file, starting fresh ledger.', err);
      }
    }
  }

  private saveState(): void {
    const list = Array.from(this.boxes.values());
    const temp = `${this.storageFile}.tmp.${process.pid}.${crypto.randomUUID()}`;
    try {
      fs.writeFileSync(temp, JSON.stringify(list, null, 2), { mode: 0o600 });
      fs.renameSync(temp, this.storageFile);
    } catch {
      try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), { mode: 0o600 });
    }
  }

  private lock(id: string): void {
    if (this.operationLocks.has(id)) {
      throw new Error(`An operation is already in progress for AgentBox ${id}`);
    }
    this.operationLocks.add(id);
  }

  private unlock(id: string): void {
    this.operationLocks.delete(id);
  }

  private transition(box: AgentBox, newState: BoxState, reason?: string): void {
    box.lifecycle.previousState = box.state;
    box.state = newState;
    box.lifecycle.state = newState;
    box.lifecycle.lastStateChangeAt = Date.now();
    box.lifecycle.lastActivityAt = Date.now();
    if (reason) {
      box.lifecycle.failureReason = reason;
      const diag = DiagnosticClassifier.classify(reason);
      if (!box.diagnostics) box.diagnostics = [];
      box.diagnostics.push(diag);
      if (box.diagnostics.length > 25) box.diagnostics.shift();
    }
    box.updatedAt = Date.now();

    // Resource Accounting update & spending limit safeguard
    if (this.accountant) {
      const { spendingLimitExceeded } = this.accountant.recordStateTransition(box, newState);
      if (spendingLimitExceeded && newState !== 'suspended' && newState !== 'stopped' && newState !== 'deleted') {
        setImmediate(() => {
          this.suspendBox(box.id, 'spending_limit_exceeded').catch(() => {});
        });
      }
    }

    this.saveState();
  }

  recordActivity(boxId: string): void {
    const box = this.boxes.get(boxId);
    if (box) {
      box.lifecycle.lastActivityAt = Date.now();
      if (box.state === 'ready') {
        this.transition(box, 'running');
      }
      this.saveState();
    }
  }

  async reconcile(): Promise<void> {
    try {
      const liveContainers = await this.driver.list();
      const liveMap = new Map(liveContainers.map(c => [c.id, c]));

      for (const [id, box] of this.boxes.entries()) {
        const live = liveMap.get(id);
        if (!live) {
          if (box.state === 'running' || box.state === 'ready' || box.state === 'provisioning') {
            this.transition(box, 'stopped');
          }
        } else {
          box.containerId = live.containerId;
          if (live.running && (box.state === 'stopped' || box.state === 'suspended')) {
            this.transition(box, 'running');
          } else if (!live.running && box.state === 'running') {
            this.transition(box, 'stopped');
          }
        }
      }
      this.saveState();

      // Reconcile interrupted jobs
      await this.jobs.reconcileInterruptedJobs();
    } catch (err) {
      console.warn('Reconciliation encountered an issue:', err);
    }
  }

  listBoxes(tenantId?: string): AgentBox[] {
    const list = Array.from(this.boxes.values()).filter(b => b.state !== 'deleted');
    if (tenantId) {
      return list.filter(b => b.tenantId === tenantId);
    }
    return list;
  }

  getBox(id: string): AgentBox | undefined {
    const box = this.boxes.get(id);
    if (!box || box.state === 'deleted') return undefined;
    return box;
  }

  getRunningCount(): number {
    return Array.from(this.boxes.values()).filter(
      b => b.state === 'running' || b.state === 'ready' || b.state === 'provisioning'
    ).length;
  }

  // =========================================================================
  // Asynchronous Job Request Entrypoints (Commission 008 Control Plane)
  // =========================================================================

  async requestProvisionJob(req: CreateBoxRequest): Promise<{ box: AgentBox; job: LifecycleJob; isNew: boolean }> {
    const id = req.id && /^[a-f0-9-]{36}$/.test(req.id) ? req.id : crypto.randomUUID();
    const tier: BoxTier = req.tier && BOX_TIERS[req.tier] ? req.tier : 'standard';
    const tenantId = req.tenantId || 'default-tenant';
    const name = (req.name || `AgentBox-${id.slice(0, 6)}`).slice(0, 64);

    // Idempotency check: if box already exists with this idempotency key
    if (req.idempotencyKey) {
      const existing = Array.from(this.boxes.values()).find(
        b => b.tenantId === tenantId && b.idempotencyKey === req.idempotencyKey && b.state !== 'deleted'
      );
      if (existing) {
        const existingJob = this.jobs.listJobs(tenantId, existing.id).slice(-1)[0];
        if (existingJob) {
          return { box: existing, job: existingJob, isNew: false };
        }
      }
    }

    // Financial Exposure Hard Ceiling (Commission 008.VI-C: Fail-Closed Allocation)
    const tenantBoxes = Array.from(this.boxes.values()).filter(b => b.tenantId === tenantId);
    const tenantSummary = this.accountant.getAggregateSummary(tenantBoxes);
    const tenantLimit = req.spendingLimit ?? config.rates.defaultSpendingLimit;
    if (tenantSummary.totalFleetCost >= tenantLimit) {
      throw Object.assign(
        new Error(`Tenant spending limit ($${tenantLimit.toFixed(2)}) reached. Total accrued fleet cost: $${tenantSummary.totalFleetCost.toFixed(2)}. Provisioning blocked.`),
        { code: 'budget_exhausted' }
      );
    }

    // Capacity Evaluation
    const cap = this.capacity.evaluateRequest(tenantId, tier, Array.from(this.boxes.values()));
    if (!cap.allowed && !cap.queueable) {
      throw Object.assign(new Error(cap.reason || 'Insufficient capacity.'), { code: cap.code || 'capacity_exhausted' });
    }

    // Reserve capacity
    this.capacity.reserve(id, tenantId, tier);

    const assignedUser = req.assignedUser
      ? {
          userId: req.assignedUser.userId,
          userEmail: req.assignedUser.userEmail,
          assignedAt: Date.now()
        }
      : undefined;

    // Initialize Box Record in 'requested' state
    const box: AgentBox = {
      id,
      tenantId,
      name,
      tier,
      state: 'requested',
      lifecycle: {
        state: 'requested',
        lastStateChangeAt: Date.now(),
        lastActivityAt: Date.now(),
        expiresAt: req.rentalHours ? Date.now() + req.rentalHours * 3600 * 1000 : undefined,
        recoveryAttempts: 0
      },
      installedAgents: ['openai-codex', 'claude-code'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      idempotencyKey: req.idempotencyKey,
      assignedUser,
      profileId: req.profileId || 'standard-developer',
      accounting: this.accountant.createRecord(id, tenantId, tier, req.spendingLimit),
      diagnostics: []
    };

    this.boxes.set(id, box);
    this.saveState();

    // Enqueue Provision Job
    const { job, isNew } = this.jobs.enqueueJob({
      boxId: id,
      tenantId,
      operation: 'provision',
      idempotencyKey: req.idempotencyKey,
      metadata: { requestedAgents: req.agents || [] }
    });

    this.transition(box, 'queued');
    return { box, job, isNew };
  }

  async requestStopJob(boxId: string, tenantId: string): Promise<LifecycleJob> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to modify this AgentBox.'), { code: 'forbidden' });
    }

    const { job } = this.jobs.enqueueJob({
      boxId,
      tenantId,
      operation: 'stop'
    });
    return job;
  }

  async requestSuspendJob(boxId: string, tenantId: string): Promise<LifecycleJob> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to modify this AgentBox.'), { code: 'forbidden' });
    }

    const { job } = this.jobs.enqueueJob({
      boxId,
      tenantId,
      operation: 'suspend'
    });
    return job;
  }

  async requestResumeJob(boxId: string, tenantId: string): Promise<LifecycleJob> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to modify this AgentBox.'), { code: 'forbidden' });
    }

    // Financial Exposure Hard Ceiling (Commission 008.VII: Fail-Closed Allocation)
    const tenantBoxes = Array.from(this.boxes.values()).filter(b => b.tenantId === box.tenantId);
    const tenantSummary = this.accountant.getAggregateSummary(tenantBoxes);
    const tenantLimit = box.accounting?.spendingLimit ?? config.rates.defaultSpendingLimit;
    if (tenantSummary.totalFleetCost >= tenantLimit) {
      throw Object.assign(
        new Error(`Tenant spending limit ($${tenantLimit.toFixed(2)}) reached. Total accrued fleet cost: $${tenantSummary.totalFleetCost.toFixed(2)}. Resume blocked.`),
        { code: 'budget_exhausted' }
      );
    }

    const { job } = this.jobs.enqueueJob({
      boxId,
      tenantId,
      operation: 'resume'
    });
    return job;
  }

  async requestResetJob(boxId: string, tenantId: string, req: ResetBoxRequest): Promise<LifecycleJob> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to modify this AgentBox.'), { code: 'forbidden' });
    }

    const { job } = this.jobs.enqueueJob({
      boxId,
      tenantId,
      operation: 'reset',
      metadata: { preserveStorage: req.preserveStorage !== false }
    });
    return job;
  }

  async requestDeleteJob(boxId: string, tenantId: string, req: DeleteBoxRequest): Promise<LifecycleJob> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to modify this AgentBox.'), { code: 'forbidden' });
    }
    if (req.confirmation !== box.name) {
      throw Object.assign(new Error(`Deletion confirmation mismatch. Must type "${box.name}".`), { code: 'invalid_confirmation' });
    }

    const { job } = this.jobs.enqueueJob({
      boxId,
      tenantId,
      operation: 'delete'
    });
    return job;
  }

  // =========================================================================
  // Internal Job Executor (Autonomous Provisioning & Decommissioning Pipeline)
  // =========================================================================

  private async executeJob(job: LifecycleJob): Promise<any> {
    const box = this.boxes.get(job.boxId);
    if (!box && job.operation !== 'delete') {
      throw new Error(`Box ${job.boxId} no longer exists.`);
    }

    this.lock(job.boxId);
    try {
      switch (job.operation) {
        case 'provision':
          return await this.executeProvisionPipeline(box!, job);
        case 'start':
        case 'resume':
          return await this.executeResumePipeline(box!, job);
        case 'stop':
          return await this.executeStopPipeline(box!, job);
        case 'suspend':
          return await this.executeSuspendPipeline(box!, job);
        case 'reset':
          return await this.executeResetPipeline(box!, job);
        case 'delete':
          return await this.executeDeletePipeline(box || { id: job.boxId, tenantId: job.tenantId } as AgentBox, job);
        default:
          throw new Error(`Unknown job operation: ${job.operation}`);
      }
    } finally {
      this.unlock(job.boxId);
    }
  }

  private async executeProvisionPipeline(box: AgentBox, job: LifecycleJob): Promise<AgentBox> {
    this.transition(box, 'provisioning');

    // Stage 1: Reserving Capacity (10%)
    this.jobs.updateProgress(job.id, 10, 'reserving_capacity', 'Validating hardware allocation and host quotas.');

    // Stage 2: Creating Isolated Storage & Network (25%)
    this.jobs.updateProgress(job.id, 25, 'creating_volumes', 'Attaching persistent customer storage and private network bridge.');
    const containerId = await this.driver.create(box);
    box.containerId = containerId;
    this.saveState();

    // Stage 3: Booting Linux Desktop Container (50%)
    this.jobs.updateProgress(job.id, 50, 'starting_desktop', 'Initializing Xvfb virtual display, x11vnc, and AgentBoxes GTK3 shell.');
    await this.driver.start(box.id);

    // Stage 4: Installing Requested Agents (75%)
    const requestedAgents = job.metadata?.requestedAgents || [];
    const { valid } = this.catalogService.validateSelectedAgents(requestedAgents);
    for (const agentId of valid) {
      if (agentId !== 'openai-codex' && agentId !== 'claude-code') {
        this.jobs.updateProgress(job.id, 75, 'installing_agents', `Installing agent: ${agentId} into persistent volume.`);
        try {
          await this.installAgentInternal(box, agentId);
        } catch (err: any) {
          console.warn(`Optional pre-install for ${agentId} logged error:`, err.message);
        }
      }
    }

    // Stage 5: Verifying Health & Display Readiness (95%)
    this.jobs.updateProgress(job.id, 95, 'verifying_health', 'Validating display readiness and remote stream connectivity.');
    for (let i = 0; i < 30; i++) {
      const probe = await this.driver.exec(box.id, ['test', '-f', '/tmp/desktop-ready']).catch(() => ({ exitCode: 1 }));
      if (probe.exitCode === 0) {
        await new Promise(r => setTimeout(r, 400));
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    // Release capacity reservation as compute is now officially active
    this.capacity.release(box.id);

    // Initialize scoped system git configuration as root
    await this.driver.exec(box.id, [
      'bash', '-c',
      'git config --system --unset-all safe.directory 2>/dev/null || true; ' +
      'git config --system --add safe.directory /home/operator/workspace; ' +
      'git config --system --add safe.directory "/home/*/workspace"; ' +
      'git config --system init.defaultBranch main'
    ], { user: 'root' }).catch(() => {});

    // Initialize git repository in shared workspace as operator
    await this.driver.exec(box.id, [
      'bash', '-c',
      'cd /home/operator/workspace && (test -d .git || (git init -b main && git config --file /home/operator/.gitconfig user.name "DreamBees Operator" && git config --file /home/operator/.gitconfig user.email "operator@dreambees.local" && git add . && git commit --author="DreamBees Operator <operator@dreambees.local>" -m "Initial workspace commit" || true))'
    ]).catch(() => {});

    // Stage 6: Mark READY (100%)
    this.transition(box, 'ready');
    return box;
  }

  private async executeResumePipeline(box: AgentBox, job: LifecycleJob): Promise<AgentBox> {
    this.jobs.updateProgress(job.id, 20, 'capacity_check', 'Evaluating available host compute resources.');
    const cap = this.capacity.evaluateRequest(box.tenantId, box.tier, Array.from(this.boxes.values()));
    if (!cap.allowed) {
      throw Object.assign(new Error(cap.reason || 'Insufficient host capacity to resume.'), { code: cap.code });
    }

    this.jobs.updateProgress(job.id, 60, 'starting_container', 'Resuming desktop container.');
    await this.driver.start(box.id);

    // Restore desktop sessions for active members
    if (box.members && box.members.length > 0) {
      for (const member of box.members) {
        if (member.status === 'active') {
          try {
            await this.driver.createMemberUser(box.id, member.username, 1000 + member.displayNumber, member.displayName, member.email);
            await this.driver.startMemberDesktopSession(box.id, member.username, member.displayNumber);
          } catch (err) {
            console.warn(`Could not restore member session for ${member.username}:`, err);
          }
        }
      }
    }

    this.transition(box, 'running');
    box.lifecycle.recoveryAttempts = 0;
    this.saveState();
    return box;
  }

  private async executeStopPipeline(box: AgentBox, job: LifecycleJob): Promise<AgentBox> {
    this.jobs.updateProgress(job.id, 50, 'stopping_container', 'Sending graceful stop signal to desktop applications.');
    await this.driver.stop(box.id);
    this.transition(box, 'stopped');
    return box;
  }

  private async executeSuspendPipeline(box: AgentBox, job: LifecycleJob): Promise<AgentBox> {
    this.jobs.updateProgress(job.id, 50, 'suspending_compute', 'Releasing compute resources while preserving workspace files.');
    await this.driver.stop(box.id);
    this.transition(box, 'suspended');
    return box;
  }

  private async executeResetPipeline(box: AgentBox, job: LifecycleJob): Promise<AgentBox> {
    const preserveStorage = job.metadata?.preserveStorage !== false;
    this.jobs.updateProgress(job.id, 20, 'stopping_existing', 'Stopping and removing existing execution environment.');

    await this.driver.destroy(box.id);

    if (!preserveStorage) {
      this.jobs.updateProgress(job.id, 40, 'purging_storage', 'Purging workspace volume for clean environment reset.');
      await (this.driver as any).storage?.purgeStorage(box.tenantId, box.id);
    }

    this.jobs.updateProgress(job.id, 60, 'recreating_box', 'Recreating execution environment from baseline image.');
    const containerId = await this.driver.create(box);
    box.containerId = containerId;
    await this.driver.start(box.id);

    this.transition(box, 'ready');
    return box;
  }

  private async executeDeletePipeline(box: AgentBox, job: LifecycleJob): Promise<void> {
    this.jobs.updateProgress(job.id, 20, 'decommissioning', 'Initiating permanent decommissioning.');
    if (this.boxes.has(box.id)) {
      this.transition(box, 'decommissioning');
    }

    this.jobs.updateProgress(job.id, 50, 'purging_container', 'Stopping container and removing isolation barriers.');
    await this.driver.destroy(box.id);

    this.jobs.updateProgress(job.id, 90, 'releasing_resources', 'Purging persistent volumes and network allocations.');
    this.capacity.release(box.id);

    if (this.boxes.has(box.id)) {
      this.transition(box, 'deleted');
      this.boxes.delete(box.id);
      this.saveState();
    }
  }

  // =========================================================================
  // Synchronous Direct Helpers (Preserves Commission 007 Compatibility)
  // =========================================================================

  async createBox(req: CreateBoxRequest): Promise<AgentBox> {
    const { box, job } = await this.requestProvisionJob(req);
    // For synchronous callers, execute the pipeline immediately if still queued
    if (box.state === 'queued') {
      await this.executeJob(job);
    }
    if (box.state === 'ready') {
      this.transition(box, 'running');
    }
    return box;
  }

  async startBox(id: string): Promise<AgentBox> {
    const box = this.getBox(id);
    if (!box) throw new Error(`AgentBox ${id} not found.`);
    if (box.state === 'running') return box;

    const job = await this.requestResumeJob(id, box.tenantId);
    await this.executeJob(job);
    return box;
  }

  async stopBox(id: string): Promise<AgentBox> {
    const box = this.getBox(id);
    if (!box) throw new Error(`AgentBox ${id} not found.`);
    if (box.state === 'stopped') return box;

    const job = await this.requestStopJob(id, box.tenantId);
    await this.executeJob(job);
    return box;
  }

  async deleteBox(id: string, confirmation?: string): Promise<void> {
    const box = this.getBox(id);
    if (!box) return;

    const job = await this.requestDeleteJob(id, box.tenantId, { confirmation: confirmation || box.name });
    await this.executeJob(job);
  }

  async suspendBox(id: string, reason = 'idle_timeout'): Promise<AgentBox> {
    const box = this.getBox(id);
    if (!box) throw new Error(`AgentBox ${id} not found.`);
    const job = await this.requestSuspendJob(id, box.tenantId);
    await this.executeJob(job);
    box.lifecycle.failureReason = reason;
    this.saveState();
    return box;
  }

  async expireBox(id: string): Promise<AgentBox> {
    const box = this.getBox(id);
    if (!box) throw new Error(`AgentBox ${id} not found.`);
    await this.driver.stop(id).catch(() => {});
    this.transition(box, 'expired', 'Subscription period ended. Workspace preserved during grace period.');
    return box;
  }

  async attemptRecovery(id: string): Promise<boolean> {
    const box = this.getBox(id);
    if (!box) return false;

    box.lifecycle.recoveryAttempts++;
    this.transition(box, 'recovering', `Attempting crash recovery (${box.lifecycle.recoveryAttempts})`);

    try {
      await this.driver.start(id);
      this.transition(box, 'running');
      box.lifecycle.recoveryAttempts = 0;
      return true;
    } catch (err: any) {
      box.lifecycle.failureReason = err.message;
      this.saveState();
      return false;
    }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const box = this.getBox(id);
    if (!box) return;
    this.transition(box, 'failed', reason);
  }

  async finishDecommissioning(id: string): Promise<void> {
    const box = this.boxes.get(id);
    if (!box) return;
    await this.driver.destroy(id).catch(() => {});
    this.capacity.release(id);
    this.transition(box, 'deleted');
    this.boxes.delete(id);
    this.saveState();
  }

  exportWorkspace(boxId: string): Readable {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    return this.driver.exportWorkspace(boxId);
  }

  async inviteMember(boxId: string, tenantId: string, req: InviteMemberRequest): Promise<BoxMember> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to invite members to this AgentBox.'), { code: 'forbidden' });
    }

    if (!box.members) {
      box.members = [];
    }

    // Determine unique display number
    const usedDisplays = new Set(box.members.map(m => m.displayNumber));
    let displayNumber = 1;
    while (usedDisplays.has(displayNumber)) {
      displayNumber++;
    }

    const member: BoxMember = {
      userId: req.userId,
      username: req.username.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      displayName: req.displayName || req.username,
      email: req.email,
      role: req.role || 'editor',
      displayNumber,
      status: 'active',
      invitedAt: Date.now(),
      expiresAt: req.expiresAt || (Date.now() + 24 * 60 * 60 * 1000),
      sessionToken: crypto.randomUUID()
    };

    // If container is active, provision user and start desktop session immediately
    if (box.state === 'running' || box.state === 'ready') {
      await this.driver.createMemberUser(box.id, member.username, 1000 + displayNumber, member.displayName, member.email);
      await this.driver.startMemberDesktopSession(box.id, member.username, displayNumber);
    }

    box.members = box.members.filter(m => m.userId !== req.userId);
    box.members.push(member);
    this.saveState();

    return member;
  }

  async rotateMemberToken(boxId: string, tenantId: string, userId: string, ttlHours = 24): Promise<BoxMember> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to rotate token on this AgentBox.'), { code: 'forbidden' });
    }

    const member = box.members?.find(m => m.userId === userId);
    if (!member) throw new Error(`Member ${userId} not found on box ${boxId}.`);
    if (member.status === 'revoked') {
      throw Object.assign(new Error('Cannot rotate token for revoked member. Please re-invite.'), { code: 'forbidden' });
    }

    member.sessionToken = crypto.randomUUID();
    member.expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
    this.saveState();
    return member;
  }

  async revokeMember(boxId: string, tenantId: string, req: RevokeMemberRequest): Promise<BoxMember> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to revoke members from this AgentBox.'), { code: 'forbidden' });
    }

    const member = box.members?.find(m => m.userId === req.userId);
    if (!member) throw new Error(`Member ${req.userId} not found on box ${boxId}.`);

    member.status = 'revoked';
    member.sessionToken = undefined;

    // Disconnect and kill member processes in container
    if (box.state === 'running' || box.state === 'ready') {
      await this.driver.stopMemberDesktopSession(box.id, member.username, member.displayNumber).catch(() => {});
      await this.driver.revokeMemberAccess(box.id, member.username).catch(() => {});
    }

    this.saveState();
    return member;
  }

  getMembers(boxId: string, tenantId?: string): BoxMember[] {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (tenantId && box.tenantId !== tenantId && tenantId !== 'admin') {
      throw Object.assign(new Error('Unauthorized to view members.'), { code: 'forbidden' });
    }
    return box.members || [];
  }

  async installAgent(boxId: string, agentId: string): Promise<{ success: boolean; output: string }> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.state !== 'running' && box.state !== 'ready') {
      throw new Error(`AgentBox must be running or ready to install agents.`);
    }

    this.lock(boxId);
    try {
      const output = await this.installAgentInternal(box, agentId);
      return { success: true, output };
    } finally {
      this.unlock(boxId);
    }
  }

  private async installAgentInternal(box: AgentBox, agentId: string): Promise<string> {
    const installRecipe = AgentInstaller.getInstallScript(agentId);
    const res = await this.driver.exec(box.id, ['bash', '-c', installRecipe.shellScript]);

    if (res.exitCode !== 0) {
      throw new Error(`Failed to install ${installRecipe.name}: ${res.stderr || res.stdout}`);
    }

    if (!box.installedAgents.includes(agentId)) {
      box.installedAgents.push(agentId);
      box.updatedAt = Date.now();
      this.saveState();
    }

    return res.stdout;
  }

  async launchApp(boxId: string, app: string): Promise<void> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);
    if (box.state !== 'running' && box.state !== 'ready') {
      throw new Error(`AgentBox must be running to launch apps.`);
    }

    this.recordActivity(boxId);
    await this.driver.launch(boxId, app);
  }

  async getMetrics(boxId: string): Promise<BoxMetrics> {
    const box = this.getBox(boxId);
    if (!box) throw new Error(`AgentBox ${boxId} not found.`);

    let m: BoxMetrics;
    if (box.state !== 'running' && box.state !== 'ready') {
      m = {
        cpuPercent: 0,
        memoryUsageBytes: 0,
        memoryLimitBytes: BOX_TIERS[box.tier].memoryBytes,
        memoryPercent: 0,
        diskUsageBytes: 0,
        pidsCount: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
        measuredAt: Date.now()
      };
    } else {
      m = await this.driver.metrics(boxId);
    }

    if (this.accountant) {
      const { spendingLimitExceeded } = this.accountant.updateMetrics(box, m);
      if (spendingLimitExceeded && box.state === 'running') {
        setImmediate(() => {
          this.suspendBox(box.id, 'spending_limit_exceeded').catch(() => {});
        });
      }
    }

    return m;
  }

  getAccounting(boxId: string) {
    const box = this.getBox(boxId);
    if (!box) return undefined;
    if (!box.accounting) {
      box.accounting = this.accountant.createRecord(box.id, box.tenantId, box.tier);
    }
    this.accountant.updateMetrics(box);
    return box.accounting;
  }

  getFleetAccountingSummary() {
    const all = Array.from(this.boxes.values());
    for (const b of all) {
      if (b.accounting) this.accountant.updateMetrics(b);
    }
    return this.accountant.getAggregateSummary(all);
  }

  recordDiagnostic(boxId: string, errorOrMessage: Error | string, context?: any) {
    const box = this.boxes.get(boxId);
    if (!box) return undefined;
    const diag = DiagnosticClassifier.classify(errorOrMessage, context);
    if (!box.diagnostics) box.diagnostics = [];
    box.diagnostics.push(diag);
    if (box.diagnostics.length > 25) box.diagnostics.shift();
    this.saveState();
    return diag;
  }
}
