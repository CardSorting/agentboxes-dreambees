/**
 * Durable Job System & Control Plane Ledger
 * Manages asynchronous lifecycle operations with progress tracking, idempotency, and persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { LifecycleJob, JobOperationType, JobStatus } from '../types/box.js';

export interface EnqueueJobOptions {
  boxId: string;
  tenantId: string;
  operation: JobOperationType;
  idempotencyKey?: string;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

export class JobManager {
  private readonly jobs = new Map<string, LifecycleJob>();
  private readonly idempotencyMap = new Map<string, string>();
  private activeWorkers = 0;
  private isProcessing = false;
  private jobRunner?: (job: LifecycleJob) => Promise<any>;

  constructor(
    private readonly storageFile: string,
    private readonly maxConcurrent = 3
  ) {
    fs.mkdirSync(path.dirname(storageFile), { recursive: true, mode: 0o700 });
    this.loadState();
  }

  private loadState(): void {
    if (fs.existsSync(this.storageFile)) {
      try {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const list: LifecycleJob[] = JSON.parse(raw);
        for (const j of list) {
          this.jobs.set(j.id, j);
          if (j.idempotencyKey) {
            this.idempotencyMap.set(`${j.tenantId}:${j.idempotencyKey}`, j.id);
          }
        }
      } catch (err) {
        console.warn('Could not read existing jobs ledger, starting clean.', err);
      }
    }
  }

  private saveState(): void {
    const list = Array.from(this.jobs.values());
    const temp = `${this.storageFile}.tmp.${process.pid}.${crypto.randomUUID()}`;
    try {
      fs.writeFileSync(temp, JSON.stringify(list, null, 2), { mode: 0o600 });
      fs.renameSync(temp, this.storageFile);
    } catch {
      try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), { mode: 0o600 });
    }
  }

  setJobRunner(runner: (job: LifecycleJob) => Promise<any>): void {
    this.jobRunner = runner;
  }

  getJob(jobId: string): LifecycleJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(tenantId?: string, boxId?: string): LifecycleJob[] {
    const list = Array.from(this.jobs.values());
    return list.filter(j => {
      if (tenantId && j.tenantId !== tenantId) return false;
      if (boxId && j.boxId !== boxId) return false;
      return true;
    });
  }

  enqueueJob(opts: EnqueueJobOptions): { job: LifecycleJob; isNew: boolean } {
    // 1. Idempotency Check
    if (opts.idempotencyKey) {
      const existingId = this.idempotencyMap.get(`${opts.tenantId}:${opts.idempotencyKey}`);
      if (existingId) {
        const existingJob = this.jobs.get(existingId);
        if (existingJob) {
          return { job: existingJob, isNew: false };
        }
      }
    }

    const id = crypto.randomUUID();
    const job: LifecycleJob = {
      id,
      boxId: opts.boxId,
      tenantId: opts.tenantId,
      operation: opts.operation,
      status: 'queued',
      progress: 0,
      stage: 'queued',
      stageMessage: 'Operation enqueued for processing.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: opts.maxRetries ?? 3,
      idempotencyKey: opts.idempotencyKey,
      metadata: opts.metadata || {}
    };

    this.jobs.set(id, job);
    if (opts.idempotencyKey) {
      this.idempotencyMap.set(`${opts.tenantId}:${opts.idempotencyKey}`, id);
    }
    this.saveState();

    setImmediate(() => this.processQueue());
    return { job, isNew: true };
  }

  updateProgress(jobId: string, progress: number, stage: string, stageMessage: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    job.stage = stage;
    job.stageMessage = stageMessage;
    job.updatedAt = Date.now();
    this.saveState();
  }

  completeJob(jobId: string, outcome?: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.stage = 'ready';
    job.stageMessage = 'Operation completed successfully.';
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    job.outcome = outcome;
    this.saveState();
  }

  failJob(jobId: string, error: { message: string; code: string; recoverable: boolean }): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.stage = 'failed';
    job.stageMessage = error.message;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    this.saveState();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeWorkers < this.maxConcurrent) {
        // Find next queued job (FIFO)
        const nextJob = Array.from(this.jobs.values()).find(j => j.status === 'queued');
        if (!nextJob || !this.jobRunner) break;

        this.activeWorkers++;
        nextJob.status = 'running';
        nextJob.startedAt = Date.now();
        nextJob.updatedAt = Date.now();
        this.saveState();

        // Run asynchronously
        this.runJob(nextJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runJob(job: LifecycleJob): Promise<void> {
    try {
      if (!this.jobRunner) throw new Error('No job runner registered.');
      const outcome = await this.jobRunner(job);
      this.completeJob(job.id, outcome);
    } catch (err: any) {
      const isRecoverable = job.retryCount < job.maxRetries;
      if (isRecoverable) {
        job.retryCount++;
        job.status = 'queued';
        job.stageMessage = `Retrying operation (attempt ${job.retryCount}/${job.maxRetries}): ${err.message}`;
        job.updatedAt = Date.now();
        this.saveState();
        // Exponential backoff before next attempt
        setTimeout(() => this.processQueue(), 1000 * Math.pow(2, job.retryCount)).unref();
      } else {
        this.failJob(job.id, {
          message: err.message || 'Operation failed.',
          code: err.code || 'job_execution_failed',
          recoverable: false
        });
      }
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Reconciles ongoing jobs following a control plane restart.
   */
  async reconcileInterruptedJobs(): Promise<{ recoveredCount: number }> {
    let recoveredCount = 0;
    const now = Date.now();

    for (const job of this.jobs.values()) {
      // If a job was left in 'running' state during process shutdown
      if (job.status === 'running') {
        job.status = 'queued';
        job.retryCount++;
        job.stageMessage = `Control plane restarted. Resuming operation (attempt ${job.retryCount}/${job.maxRetries}).`;
        job.updatedAt = now;
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      this.saveState();
      setImmediate(() => this.processQueue());
    }

    return { recoveredCount };
  }
}
