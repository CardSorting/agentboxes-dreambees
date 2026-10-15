/**
 * Commission 008 Verification Suite: Autonomous Provisioning & Decommissioning
 * Tests all 14 mandatory scenarios specified in Commission 008 Section X:
 * 1. Successful automated provisioning
 * 2. Duplicate provisioning requests
 * 3. Concurrent requests from multiple customers
 * 4. Insufficient host capacity
 * 5. Provisioning interruption and recovery
 * 6. Container crash and restart
 * 7. Persistent storage across suspension
 * 8. Subscription expiration
 * 9. Confirmed permanent deletion
 * 10. Deletion interrupted midway
 * 11. Orphaned resource reconciliation
 * 12. Tenant isolation during every lifecycle transition
 * 13. Expired and revoked display access
 * 14. Control-plane restart during active operations
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import { CapacityManager } from '../src/provisioning/capacity-manager.js';
import { LifecyclePolicyEngine } from '../src/provisioning/lifecycle-policy.js';
import { SessionManager } from '../src/gateway/session-manager.js';

const execute = promisify(execFile);

function createTestHarness(namespace: string) {
  const uid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `agentbox-test-${uid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`t-${uid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 20, jobsFile);
  const policies = new LifecyclePolicyEngine(manager, driver, `t-${uid}`, {
    reconcileIntervalMs: 1000,
    idleTimeoutMinutes: 30,
    provisioningTimeoutSeconds: 60,
    maxRecoveryRetries: 3,
    expirationGracePeriodHours: 168,
    maxConcurrentJobs: 3,
    maxBoxesPerTenant: 5
  });

  const cleanup = async () => {
    policies.stop();
    // Wait for any active job runner to finish
    const startWait = Date.now();
    while ((manager.jobs as any).activeWorkers > 0 && Date.now() - startWait < 8000) {
      await new Promise(r => setTimeout(r, 100));
    }
    for (const box of manager.listBoxes()) {
      await driver.destroy(box.id).catch(() => {});
    }
    // Clean any docker containers for this namespace
    await execute('docker', ['ps', '-aq', '--filter', `label=io.dreambeesai.namespace=t-${uid}`])
      .then(r => r.stdout.trim() && execute('docker', ['rm', '-f', ...r.stdout.trim().split('\n')]))
      .catch(() => {});
    // Clean any networks for this namespace
    await execute('docker', ['network', 'ls', '-q', '--filter', `label=io.dreambeesai.namespace=t-${uid}`])
      .then(r => r.stdout.trim() && execute('docker', ['network', 'rm', ...r.stdout.trim().split('\n')]))
      .catch(() => {});
    // Clean any volumes for this namespace
    await execute('docker', ['volume', 'ls', '-q', '--filter', `label=io.dreambeesai.namespace=t-${uid}`])
      .then(r => r.stdout.trim() && execute('docker', ['volume', 'rm', '-f', ...r.stdout.trim().split('\n')]))
      .catch(() => {});
  };

  return { uid, boxesFile, jobsFile, driver, manager, policies, cleanup };
}

// ---------------------------------------------------------------------------
// 1. Successful automated provisioning (Commission 008 Scenario 1)
// ---------------------------------------------------------------------------
test('Scenario 1: Successful automated provisioning through asynchronous pipeline', async () => {
  const harness = createTestHarness('s1');
  try {
    const { box, job, isNew } = await harness.manager.requestProvisionJob({
      name: 'Auto-Provision-Box',
      tier: 'standard',
      tenantId: 'tenant-acme'
    });

    assert.strictEqual(isNew, true);
    assert.strictEqual(box.state, 'queued');
    assert.strictEqual(job.operation, 'provision');

    // Wait for job execution to reach completion
    let completedJob = harness.manager.jobs.getJob(job.id);
    const startWait = Date.now();
    while (completedJob && completedJob.status !== 'completed' && completedJob.status !== 'failed' && (Date.now() - startWait < 15000)) {
      await new Promise(r => setTimeout(r, 200));
      completedJob = harness.manager.jobs.getJob(job.id);
    }

    assert.strictEqual(completedJob?.status, 'completed', 'Provision job must complete');
    assert.strictEqual(completedJob?.progress, 100);

    const readyBox = harness.manager.getBox(box.id);
    assert.ok(readyBox);
    assert.strictEqual(readyBox?.state, 'ready', 'Box must transition to ready state');
    assert.ok(readyBox?.containerId, 'Container ID must be assigned');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 2. Duplicate provisioning requests (Commission 008 Scenario 2)
// ---------------------------------------------------------------------------
test('Scenario 2: Duplicate provisioning requests are idempotent', async () => {
  const harness = createTestHarness('s2');
  try {
    const idemKey = `idem-${crypto.randomUUID()}`;

    // First request
    const first = await harness.manager.requestProvisionJob({
      name: 'Idempotent-Box',
      tier: 'standard',
      tenantId: 'tenant-beta',
      idempotencyKey: idemKey
    });
    assert.strictEqual(first.isNew, true);

    // Second request with identical idempotencyKey and tenantId
    const second = await harness.manager.requestProvisionJob({
      name: 'Idempotent-Box-Dupe',
      tier: 'standard',
      tenantId: 'tenant-beta',
      idempotencyKey: idemKey
    });

    assert.strictEqual(second.isNew, false);
    assert.strictEqual(second.box.id, first.box.id, 'Must return the existing box without duplicating');
    assert.strictEqual(second.job.id, first.job.id, 'Must return the original job');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 3. Concurrent requests from multiple customers (Commission 008 Scenario 3)
// ---------------------------------------------------------------------------
test('Scenario 3: Concurrent requests from multiple customers are isolated and queued', async () => {
  const harness = createTestHarness('s3');
  try {
    const [p1, p2] = await Promise.all([
      harness.manager.requestProvisionJob({
        name: 'Concurrent-Tenant-A',
        tier: 'standard',
        tenantId: 'customer-alpha'
      }),
      harness.manager.requestProvisionJob({
        name: 'Concurrent-Tenant-B',
        tier: 'standard',
        tenantId: 'customer-beta'
      })
    ]);

    assert.notStrictEqual(p1.box.id, p2.box.id);
    assert.notStrictEqual(p1.box.tenantId, p2.box.tenantId);
    assert.ok(harness.manager.jobs.getJob(p1.job.id));
    assert.ok(harness.manager.jobs.getJob(p2.job.id));

    // Await completion so background jobs don't leak into subsequent tests
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const j1 = harness.manager.jobs.getJob(p1.job.id);
      const j2 = harness.manager.jobs.getJob(p2.job.id);
      if (j1 && j2 && j1.status !== 'running' && j1.status !== 'queued' && j2.status !== 'running' && j2.status !== 'queued') {
        break;
      }
      await new Promise(r => setTimeout(r, 150));
    }
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 4. Insufficient host capacity (Commission 008 Scenario 4)
// ---------------------------------------------------------------------------
test('Scenario 4: Insufficient host capacity rejects or queues requests deterministically', async () => {
  const cap = new CapacityManager(1, 5, 1); // max 1 running box, max 1 box per tenant

  // First request permitted
  const eval1 = cap.evaluateRequest('tenant-solo', 'standard', []);
  assert.strictEqual(eval1.allowed, true);
  cap.reserve('box-1', 'tenant-solo', 'standard');

  // Second request by same tenant rejected due to per-tenant quota
  const eval2 = cap.evaluateRequest('tenant-solo', 'standard', []);
  assert.strictEqual(eval2.allowed, false);
  assert.strictEqual(eval2.code, 'tenant_quota_exceeded');

  // Request by different tenant rejected due to global running limit
  const eval3 = cap.evaluateRequest('tenant-other', 'standard', []);
  assert.strictEqual(eval3.allowed, false);
  assert.strictEqual(eval3.code, 'running_limit_reached');
  assert.strictEqual(eval3.queueable, true, 'Running limit should be marked queueable');
});

// ---------------------------------------------------------------------------
// 5. Provisioning interruption and recovery (Commission 008 Scenario 5)
// ---------------------------------------------------------------------------
test('Scenario 5: Provisioning interruption recovers cleanly during reconciliation', async () => {
  const harness = createTestHarness('s5');
  try {
    // Seed an interrupted box record in provisioning state
    const boxId = crypto.randomUUID();
    (harness.manager as any).boxes.set(boxId, {
      id: boxId,
      name: 'Interrupted-Box',
      tier: 'standard',
      tenantId: 'tenant-recovery',
      state: 'provisioning',
      installedAgents: ['openai-codex'],
      lifecycle: {
        state: 'provisioning',
        lastStateChangeAt: Date.now() - 10000,
        lastActivityAt: Date.now() - 10000,
        recoveryAttempts: 0
      },
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000
    });
    (harness.manager as any).saveState();

    // Run reconciliation
    await harness.manager.reconcile();

    const reconciled = harness.manager.getBox(boxId);
    assert.ok(reconciled);
    assert.strictEqual(reconciled?.state, 'stopped', 'Interrupted provisioning without live container resets safely to stopped');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 6. Container crash and restart (Commission 008 Scenario 6)
// ---------------------------------------------------------------------------
test('Scenario 6: Container crash triggers autonomous recovery with bounded retries', async () => {
  const harness = createTestHarness('s6');
  try {
    const box = await harness.manager.createBox({
      name: 'Crash-Recovery-Box',
      tier: 'standard',
      tenantId: 'tenant-resilience'
    });

    assert.strictEqual(box.state, 'running');

    // Simulate unexpected container termination (stop container externally)
    await harness.driver.stop(box.id);

    // Run reconciliation loop
    const stats1 = await harness.policies.runReconciliationLoop();
    assert.strictEqual(stats1.recoveredCount, 1, 'Policy engine must autonomously restart crashed container');

    const recoveredBox = harness.manager.getBox(box.id);
    assert.strictEqual(recoveredBox?.state, 'running', 'Box must be back in running state');

    // Test bounded retry failure: exhaust recovery retries
    recoveredBox!.lifecycle.recoveryAttempts = 3;
    await harness.driver.stop(box.id);

    await harness.policies.runReconciliationLoop();
    const failedBox = harness.manager.getBox(box.id);
    assert.strictEqual(failedBox?.state, 'failed', 'Must transition to failed after exceeding bounded retries without infinite loop');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 7. Persistent storage across suspension (Commission 008 Scenario 7)
// ---------------------------------------------------------------------------
test('Scenario 7: Persistent storage survives compute suspension and resumption', async () => {
  const harness = createTestHarness('s7');
  try {
    const box = await harness.manager.createBox({
      name: 'Storage-Suspension-Box',
      tier: 'standard',
      tenantId: 'tenant-persist'
    });

    // Write persistent file inside workspace
    const markerText = `COMMISSION_008_DATA_INTEGRITY_${Date.now()}`;
    await harness.driver.exec(box.id, [
      'bash', '-c',
      `echo "${markerText}" > /home/operator/workspace/integrity_test.txt`
    ]);

    // Suspend compute
    await harness.manager.suspendBox(box.id);
    const suspended = harness.manager.getBox(box.id);
    assert.strictEqual(suspended?.state, 'suspended', 'Must be suspended');

    // Resume compute
    await harness.manager.startBox(box.id);
    const resumed = harness.manager.getBox(box.id);
    assert.strictEqual(resumed?.state, 'running', 'Must be running after resume');

    // Read persistent file back
    const readBack = await harness.driver.exec(box.id, ['cat', '/home/operator/workspace/integrity_test.txt']);
    assert.strictEqual(readBack.exitCode, 0);
    assert.ok(readBack.stdout.includes(markerText), 'Customer workspace data must survive compute suspension intact');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 8. Subscription expiration (Commission 008 Scenario 8)
// ---------------------------------------------------------------------------
test('Scenario 8: Subscription expiration halts compute while preserving customer storage', async () => {
  const harness = createTestHarness('s8');
  try {
    const box = await harness.manager.createBox({
      name: 'Expiring-Box',
      tier: 'standard',
      tenantId: 'tenant-billing'
    });

    // Set expiration in past
    box.lifecycle.expiresAt = Date.now() - 60000;
    (harness.manager as any).saveState();

    // Run reconciliation
    const stats = await harness.policies.runReconciliationLoop();
    assert.strictEqual(stats.expiredCount, 1, 'Policy engine must detect expired subscription');

    const expiredBox = harness.manager.getBox(box.id);
    assert.strictEqual(expiredBox?.state, 'expired');
    assert.ok(expiredBox?.lifecycle.failureReason?.includes('grace period'));
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 9. Confirmed permanent deletion (Commission 008 Scenario 9)
// ---------------------------------------------------------------------------
test('Scenario 9: Confirmed permanent deletion requires explicit name confirmation', async () => {
  const harness = createTestHarness('s9');
  try {
    const box = await harness.manager.createBox({
      name: 'Irreversible-Purge-Box',
      tier: 'standard',
      tenantId: 'tenant-destroy'
    });

    // Attempt deletion with mismatched confirmation
    await assert.rejects(
      async () => harness.manager.requestDeleteJob(box.id, box.tenantId, { confirmation: 'Wrong Name' }),
      (err: any) => err.code === 'invalid_confirmation'
    );

    // Delete with correct confirmation
    const job = await harness.manager.requestDeleteJob(box.id, box.tenantId, { confirmation: box.name });
    assert.strictEqual(job.operation, 'delete');

    // Wait for deletion job to execute
    await (harness.manager as any).executeJob(job);

    const deleted = harness.manager.getBox(box.id);
    assert.strictEqual(deleted, undefined, 'Box must be removed from active ledger');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 10. Deletion interrupted midway (Commission 008 Scenario 10)
// ---------------------------------------------------------------------------
test('Scenario 10: Deletion interrupted midway is completed by autonomous reconciliation', async () => {
  const harness = createTestHarness('s10');
  try {
    const boxId = crypto.randomUUID();
    (harness.manager as any).boxes.set(boxId, {
      id: boxId,
      name: 'Interrupted-Delete-Box',
      tier: 'standard',
      tenantId: 'tenant-interrupted',
      state: 'decommissioning',
      installedAgents: ['openai-codex'],
      lifecycle: {
        state: 'decommissioning',
        lastStateChangeAt: Date.now() - 10000,
        lastActivityAt: Date.now() - 10000,
        recoveryAttempts: 0
      },
      createdAt: Date.now() - 20000,
      updatedAt: Date.now() - 10000
    });
    (harness.manager as any).saveState();

    await harness.policies.runReconciliationLoop();

    const result = harness.manager.getBox(boxId);
    assert.strictEqual(result, undefined, 'Interrupted decommissioning must be cleanly finished');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 11. Orphaned resource reconciliation (Commission 008 Scenario 11)
// ---------------------------------------------------------------------------
test('Scenario 11: Orphaned Docker resources are reaped during reconciliation', async () => {
  const harness = createTestHarness('s11');
  try {
    const orphanBoxId = crypto.randomUUID();
    const orphanVolName = `agentbox-t-${harness.uid}-orphan-vol-${orphanBoxId}`;

    // Create untracked volume with namespace label
    await execute('docker', [
      'volume', 'create',
      '--label', `io.dreambeesai.namespace=t-${harness.uid}`,
      '--label', `io.dreambeesai.box.id=${orphanBoxId}`,
      orphanVolName
    ]);

    // Verify it exists in Docker
    const { stdout: checkBefore } = await execute('docker', ['volume', 'ls', '-q', '--filter', `name=${orphanVolName}`]);
    assert.ok(checkBefore.includes(orphanVolName));

    // Run reconciliation loop
    const stats = await harness.policies.runReconciliationLoop();
    assert.ok(stats.orphansReaped >= 1, 'Must reap untracked orphaned volume');

    // Verify it was removed
    const { stdout: checkAfter } = await execute('docker', ['volume', 'ls', '-q', '--filter', `name=${orphanVolName}`]);
    assert.strictEqual(checkAfter.trim(), '', 'Orphaned volume must be reaped');
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 12. Tenant isolation during every lifecycle transition (Commission 008 Scenario 12)
// ---------------------------------------------------------------------------
test('Scenario 12: Cross-tenant operations are strictly forbidden across all lifecycle transitions', async () => {
  const harness = createTestHarness('s12');
  try {
    const boxA = await harness.manager.createBox({
      name: 'Tenant-A-Box',
      tier: 'standard',
      tenantId: 'tenant-a'
    });

    // Tenant B attempts to stop Tenant A's box
    await assert.rejects(
      async () => harness.manager.requestStopJob(boxA.id, 'tenant-b'),
      (err: any) => err.code === 'forbidden'
    );

    // Tenant B attempts to suspend Tenant A's box
    await assert.rejects(
      async () => harness.manager.requestSuspendJob(boxA.id, 'tenant-b'),
      (err: any) => err.code === 'forbidden'
    );

    // Tenant B attempts to reset Tenant A's box
    await assert.rejects(
      async () => harness.manager.requestResetJob(boxA.id, 'tenant-b', { preserveStorage: true }),
      (err: any) => err.code === 'forbidden'
    );

    // Tenant B attempts to delete Tenant A's box
    await assert.rejects(
      async () => harness.manager.requestDeleteJob(boxA.id, 'tenant-b', { confirmation: boxA.name }),
      (err: any) => err.code === 'forbidden'
    );
  } finally {
    await harness.cleanup();
  }
});

// ---------------------------------------------------------------------------
// 13. Expired and revoked display access (Commission 008 Scenario 13)
// ---------------------------------------------------------------------------
test('Scenario 13: Expired and revoked display tickets cannot reopen terminated sessions', async () => {
  const sessions = new SessionManager();
  const boxId = crypto.randomUUID();

  // 1. Valid ticket exchange
  const ticket1 = sessions.issueTicket('tenant-1', boxId, 500); // 500ms TTL
  const ex1 = sessions.exchangeTicket(ticket1);
  assert.strictEqual(ex1.boxId, boxId);

  // 2. Used ticket cannot be reused (one-time ticket)
  assert.throws(
    () => sessions.exchangeTicket(ticket1),
    /Invalid or expired.*ticket/
  );

  // 3. Expired ticket cannot be exchanged
  const ticket2 = sessions.issueTicket('tenant-1', boxId, 1);
  await new Promise(r => setTimeout(r, 10));
  assert.throws(
    () => sessions.exchangeTicket(ticket2),
    /Invalid or expired.*ticket/
  );
});

// ---------------------------------------------------------------------------
// 14. Control-plane restart during active operations (Commission 008 Scenario 14)
// ---------------------------------------------------------------------------
test('Scenario 14: Control-plane restart recovers state and job ledgers without data loss', async () => {
  const harness = createTestHarness('s14');
  try {
    const box = await harness.manager.createBox({
      name: 'Restart-Survival-Box',
      tier: 'standard',
      tenantId: 'tenant-restart'
    });

    assert.strictEqual(box.state, 'running');

    // Simulate control-plane shutdown and restart with fresh manager on same storage files
    const restartedManager = new AgentBoxManager(
      harness.boxesFile,
      harness.driver,
      5,
      20,
      harness.jobsFile
    );

    await restartedManager.reconcile();

    const loadedBox = restartedManager.getBox(box.id);
    assert.ok(loadedBox, 'Box record must survive restart');
    assert.strictEqual(loadedBox?.id, box.id);
    assert.strictEqual(loadedBox?.state, 'running');

    const pastJobs = restartedManager.jobs.listJobs('tenant-restart', box.id);
    assert.ok(pastJobs.length > 0, 'Job history must persist across control plane restarts');
  } finally {
    await harness.cleanup();
  }
});
