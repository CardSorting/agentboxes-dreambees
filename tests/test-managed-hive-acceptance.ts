/**
 * Commission 008 Revision II — Initial Acceptance Test
 * Demonstrates the 13-Step Managed Agent Workstation Lifecycle (Section VIII):
 * 1. Provision one Linux AgentBox from the existing image
 * 2. Apply its approved configuration
 * 3. Assign the workstation to an authorized test user
 * 4. Establish secure remote desktop access
 * 5. Launch an existing agent tool
 * 6. Execute a bounded user-directed task
 * 7. Save an artifact to the designated workspace
 * 8. Disconnect and reconnect successfully
 * 9. Inspect workstation health and resource accounting
 * 10. Suspend or terminate the environment
 * 11. Verify the expected data-retention behavior
 * 12. Decommission the environment and confirm resource release
 * 13. Report measured costs, failures, and unresolved risks
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import { DisplayGateway } from '../src/gateway/display-gateway.js';

test('Commission 008 Revision II: 13-Step Managed Workstation Lifecycle Demonstration', async () => {
  const testUid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `hive-test-${testUid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`hive-${testUid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 10, jobsFile);
  const gatewayPort = 3099;
  const gateway = new DisplayGateway(manager, gatewayPort, '127.0.0.1');

  await gateway.start();

  let box: any;
  const testUser = {
    userId: 'cust_heav3ns_alpha_01',
    userEmail: 'cust.alpha@heav3ns.institution'
  };

  try {
    console.log('\n--- [Step 1 & 2] Provision Linux AgentBox & Apply Approved Configuration ---');
    const provisionRes = await manager.requestProvisionJob({
      name: `Managed-Workstation-${testUid}`,
      tier: 'standard',
      tenantId: 'tenant-heav3ns-hive',
      agents: ['google-antigravity'],
      profileId: 'approved-heav3ns-standard-v1',
      assignedUser: testUser,
      spendingLimit: 25.00
    });

    assert.ok(provisionRes.box, 'Workstation box record must be created');
    assert.strictEqual(provisionRes.isNew, true);

    // Await async provisioning completion
    let job = manager.jobs.getJob(provisionRes.job.id);
    const startWait = Date.now();
    while (job && job.status !== 'completed' && job.status !== 'failed' && (Date.now() - startWait < 20000)) {
      await new Promise(r => setTimeout(r, 200));
      job = manager.jobs.getJob(provisionRes.job.id);
    }
    assert.strictEqual(job?.status, 'completed', 'Workstation provisioning job must complete');
    box = manager.getBox(provisionRes.box.id)!;
    assert.strictEqual(box.state, 'ready', 'Workstation must transition to ready state');

    console.log('\n--- [Step 3] Assign Workstation to Authorized Test User ---');
    assert.ok(box.assignedUser, 'Workstation must record assigned user');
    assert.strictEqual(box.assignedUser.userId, testUser.userId);
    assert.strictEqual(box.assignedUser.userEmail, testUser.userEmail);
    assert.strictEqual(box.profileId, 'approved-heav3ns-standard-v1');

    console.log('\n--- [Step 4] Establish Secure Remote Desktop Access (RFB WebSocket Bridge) ---');
    // Issue single-use connection ticket
    const ticket = (gateway as any).sessions.issueTicket(box.tenantId, box.id);
    assert.ok(ticket, 'Security ticket must be issued');

    // Connect via authenticated WebSocket RFB bridge
    const rfbHandshakeReceived = await new Promise<boolean>((resolve, reject) => {
      const wsUrl = `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?ticket=${ticket}`;
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Remote desktop RFB connection timeout'));
      }, 8000);

      ws.on('message', (data: Buffer) => {
        const str = data.toString('utf8');
        if (str.startsWith('RFB')) {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    assert.strictEqual(rfbHandshakeReceived, true, 'Desktop gateway must bridge authenticated RFB handshake');

    console.log('\n--- [Step 5 & 6] Launch Agent Tool & Execute Bounded User-Directed Task ---');
    // Launch agent application window in desktop environment
    await manager.launchApp(box.id, 'terminal');

    // Execute existing agent CLI (Google Antigravity) version
    const agentExec = await driver.exec(box.id, ['agy', 'version']);
    assert.strictEqual(agentExec.exitCode, 0, 'Pre-configured agent tool must execute successfully');
    assert.ok(agentExec.stdout.includes('Antigravity'));

    // User configures BYOK credential in persistent home and verifies tool health
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "export GEMINI_API_KEY=\'heav3ns-byok-test-key\'" >> /home/operator/.bashrc'
    ]);
    const doctorExec = await driver.exec(box.id, [
      'bash', '-c',
      'source /home/operator/.bashrc && agy doctor'
    ]);
    assert.strictEqual(doctorExec.exitCode, 0, 'Agent doctor passes with user BYOK key');
    assert.ok(doctorExec.stdout.includes('Configured'));

    const guestStatus = await driver.exec(box.id, ['agentbox', 'status']);
    assert.strictEqual(guestStatus.exitCode, 0, 'Guest agentbox status must succeed');

    // Execute bounded user-directed compilation / task
    const userTaskExec = await driver.exec(box.id, [
      'bash', '-c',
      'python3 -c "import math; print(\'COMPUTED_HASH:\', math.factorial(10))"'
    ]);
    assert.strictEqual(userTaskExec.exitCode, 0);
    assert.ok(userTaskExec.stdout.includes('3628800'));

    console.log('\n--- [Step 7] Save Artifact to Designated Workspace ---');
    const artifactContent = `HEAV3NS_COMMISSION_008_REV2_ARTIFACT_${Date.now()}`;
    await driver.exec(box.id, [
      'bash', '-c',
      `echo "${artifactContent}" > /home/operator/workspace/result.txt`
    ]);

    const checkArtifact = await driver.exec(box.id, ['cat', '/home/operator/workspace/result.txt']);
    assert.ok(checkArtifact.stdout.includes(artifactContent), 'Artifact must be saved in workspace');

    console.log('\n--- [Step 8] Disconnect and Reconnect Successfully ---');
    // Issue a second fresh ticket simulating reconnection
    const reconnectTicket = (gateway as any).sessions.issueTicket(box.tenantId, box.id);
    const reconnected = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?ticket=${reconnectTicket}`);
      const timeout = setTimeout(() => { ws.terminate(); reject(new Error('Reconnect timeout')); }, 8000);
      ws.on('message', (data: Buffer) => {
        if (data.toString('utf8').startsWith('RFB')) {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      });
      ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });
    assert.strictEqual(reconnected, true, 'User must be able to reconnect to running workstation');

    console.log('\n--- [Step 9] Inspect Workstation Health and Resource Accounting ---');
    const metrics = await manager.getMetrics(box.id);
    assert.ok(metrics.memoryUsageBytes > 0, 'Memory usage must be measured');
    assert.ok(metrics.pidsCount > 0, 'PIDs must be positive');

    const accounting = manager.getAccounting(box.id);
    assert.ok(accounting, 'Accounting record must exist');
    assert.strictEqual(accounting?.tier, 'standard');
    assert.strictEqual(accounting?.spendingLimit, 25.00);
    assert.ok(accounting?.costs.totalCost >= 0, 'Total cost must be calculated');
    console.log(`Measured Active Compute: ${accounting?.activeComputeSeconds}s | Total Incurred Cost: $${accounting?.costs.totalCost.toFixed(4)}`);

    console.log('\n--- [Step 10 & 11] Suspend Environment and Verify Data Retention ---');
    await manager.suspendBox(box.id, 'user_requested_suspend');
    const suspendedBox = manager.getBox(box.id);
    assert.strictEqual(suspendedBox?.state, 'suspended', 'Workstation must be suspended');

    // Resume environment
    await manager.startBox(box.id);
    const resumedBox = manager.getBox(box.id);
    assert.strictEqual(resumedBox?.state, 'running', 'Workstation must resume to running');

    // Verify workspace file persisted intact
    const verifyPersist = await driver.exec(box.id, ['cat', '/home/operator/workspace/result.txt']);
    assert.strictEqual(verifyPersist.exitCode, 0);
    assert.ok(verifyPersist.stdout.includes(artifactContent), 'Customer workspace artifact must survive suspension');

    console.log('\n--- [Step 12] Decommission Environment and Confirm Resource Release ---');
    await manager.deleteBox(box.id, box.name);
    const deletedBox = manager.getBox(box.id);
    assert.strictEqual(deletedBox, undefined, 'Workstation must be completely deleted from active ledger');

    console.log('\n--- [Step 13] Report Measured Costs, Failures, and Risks ---');
    const fleetSummary = manager.getFleetAccountingSummary();
    console.log('Final Fleet Summary:', JSON.stringify(fleetSummary, null, 2));
    assert.ok(fleetSummary, 'Fleet accounting summary must be generated');
  } finally {
    if (box?.id) {
      await manager.deleteBox(box.id, box.name).catch(() => {});
    }
    await gateway.stop();
    // Clean test namespace resources
    await driver.destroy(box?.id || 'dummy').catch(() => {});
  }
});
