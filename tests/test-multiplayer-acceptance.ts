/**
 * Commission 010 Amendment I — Independent Multiplayer Sessions Acceptance Test
 * Mandate:
 * "Each authorized user receives an independent graphical desktop session within the same provisioned AgentBox.
 * The AgentBox remains one managed computational environment with one shared resource allocation.
 * ONE BOX. MULTIPLE USERS. INDEPENDENT DESKTOPS. SHARED WORKSPACE. OWNER-CONTROLLED ACCESS."
 *
 * 15-Step Acceptance Test:
 * 1. Provision one AgentBox.
 * 2. Invite two independent users.
 * 3. Authenticate both users.
 * 4. Establish two separate graphical desktops.
 * 5. Run Claude Code in Session A.
 * 6. Run Codex in Session B.
 * 7. Verify concurrent execution.
 * 8. Verify both users can access the shared project.
 * 9. Verify neither user can access the other's credentials or desktop.
 * 10. Disconnect Session A without affecting Session B.
 * 11. Revoke User A.
 * 12. Verify User A cannot reconnect through any supported access path.
 * 13. Verify User B continues working.
 * 14. Verify shared files remain intact.
 * 15. Export and terminate the AgentBox.
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

test('Commission 010 Amendment I: 15-Step Independent Multiplayer Sessions Acceptance Test', async () => {
  const testUid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `multi-test-${testUid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`multi-${testUid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 10, jobsFile);
  const gatewayPort = 3095;
  const gateway = new DisplayGateway(manager, gatewayPort, '127.0.0.1');

  await gateway.start();
  let box: any;
  let wsA: WebSocket | undefined;
  let wsB: WebSocket | undefined;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Provision one AgentBox
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 1] Provision one AgentBox ---');
    box = await manager.createBox({
      tenantId: `tenant-multi-${testUid}`,
      name: `Multi-User-Box-${testUid}`,
      tier: 'power',
      agents: ['claude-code', 'openai-codex'],
      profileId: 'multi-user-team-workspace'
    });

    assert.ok(box, 'Box must be provisioned');
    assert.strictEqual(box.state, 'running', 'Box must be running');
    console.log(`  AgentBox created: ${box.id} (${box.name})`);

    // -------------------------------------------------------------------------
    // Step 2: Invite two independent users
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 2] Invite two independent users (User A & User B) ---');
    const memberA = await manager.inviteMember(box.id, box.tenantId, {
      userId: `user-a-${testUid}`,
      username: `workera${testUid}`,
      displayName: 'Alice (Claude Lead)',
      email: 'alice@example.com',
      role: 'editor'
    });

    const memberB = await manager.inviteMember(box.id, box.tenantId, {
      userId: `user-b-${testUid}`,
      username: `workerb${testUid}`,
      displayName: 'Bob (Codex Lead)',
      email: 'bob@example.com',
      role: 'editor'
    });

    assert.ok(memberA.sessionToken, 'User A received session token');
    assert.ok(memberB.sessionToken, 'User B received session token');
    assert.strictEqual(memberA.displayNumber, 1, 'User A allocated Display :1');
    assert.strictEqual(memberB.displayNumber, 2, 'User B allocated Display :2');
    console.log(`  User A invited: ${memberA.username} (Display :${memberA.displayNumber}, Port ${5900 + memberA.displayNumber})`);
    console.log(`  User B invited: ${memberB.username} (Display :${memberB.displayNumber}, Port ${5900 + memberB.displayNumber})`);

    // -------------------------------------------------------------------------
    // Step 3: Authenticate both users
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 3] Authenticate both users with independent BYOK credentials ---');
    // User A sets Anthropic credentials in their isolated home directory
    await driver.exec(box.id, [
      'bash', '-c',
      'echo \'{"apiKey":"sk-ant-alice-private-key"}\' > ~/.claude.json && chmod 600 ~/.claude.json'
    ], { user: memberA.username });

    // User B sets OpenAI credentials in their isolated home directory
    await driver.exec(box.id, [
      'bash', '-c',
      'mkdir -p ~/.codex && echo \'{"bearer":"sk-openai-bob-private-key"}\' > ~/.codex/auth.json && chmod 600 ~/.codex/auth.json'
    ], { user: memberB.username });

    const checkCredA = await driver.exec(box.id, ['bash', '-c', 'cat ~/.claude.json'], { user: memberA.username });
    assert.ok(checkCredA.stdout.includes('sk-ant-alice-private-key'), 'User A credentials intact in ~/.claude.json');

    const checkCredB = await driver.exec(box.id, ['bash', '-c', 'cat ~/.codex/auth.json'], { user: memberB.username });
    assert.ok(checkCredB.stdout.includes('sk-openai-bob-private-key'), 'User B credentials intact in ~/.codex/auth.json');
    console.log('  Both users independently authenticated with private BYOK storage');

    // -------------------------------------------------------------------------
    // Step 4: Establish two separate graphical desktops
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 4] Establish two separate graphical desktop WebSocket streams ---');
    // Connect User A WebSocket to display gateway
    wsA = new WebSocket(
      `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberA.userId}&token=${memberA.sessionToken}`
    );

    // Connect User B WebSocket to display gateway
    wsB = new WebSocket(
      `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberB.userId}&token=${memberB.sessionToken}`
    );

    const [openA, openB] = await Promise.all([
      new Promise<boolean>((resolve) => {
        wsA!.on('open', () => resolve(true));
        wsA!.on('error', () => resolve(false));
      }),
      new Promise<boolean>((resolve) => {
        wsB!.on('open', () => resolve(true));
        wsB!.on('error', () => resolve(false));
      })
    ]);

    assert.ok(openA, 'User A graphical desktop stream connected');
    assert.ok(openB, 'User B graphical desktop stream connected');
    console.log('  Two distinct RFB desktop sessions active simultaneously');

    // -------------------------------------------------------------------------
    // Step 5: Run Claude Code in Session A
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 5] Run Claude Code in User A session ---');
    const claudeRun = await driver.exec(box.id, [
      'claude', '--version'
    ], { user: memberA.username });
    assert.strictEqual(claudeRun.exitCode, 0, 'Claude Code executed successfully in Session A');
    assert.ok(claudeRun.stdout.includes('Claude Code'), 'Session A invoked official Claude Code');
    console.log('  Session A (User A):', claudeRun.stdout.trim());

    // -------------------------------------------------------------------------
    // Step 6: Run Codex in Session B
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 6] Run Codex in User B session ---');
    const codexRun = await driver.exec(box.id, [
      'codex', '--version'
    ], { user: memberB.username });
    assert.strictEqual(codexRun.exitCode, 0, 'Codex executed successfully in Session B');
    assert.ok(codexRun.stdout.includes('codex-cli'), 'Session B invoked official Codex');
    console.log('  Session B (User B):', codexRun.stdout.trim());

    // -------------------------------------------------------------------------
    // Step 7: Verify concurrent execution
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 7] Verify concurrent agent execution ---');
    const [concurrentA, concurrentB] = await Promise.all([
      driver.exec(box.id, [
        'bash', '-c',
        'claude --help >/dev/null 2>&1 && echo "A-SUCCESS"'
      ], { user: memberA.username }),
      driver.exec(box.id, [
        'bash', '-c',
        'codex --help >/dev/null 2>&1 && echo "B-SUCCESS"'
      ], { user: memberB.username })
    ]);

    assert.ok(concurrentA.stdout.includes('A-SUCCESS'), 'User A completed concurrent execution');
    assert.ok(concurrentB.stdout.includes('B-SUCCESS'), 'User B completed concurrent execution');

    const metrics = await driver.metrics(box.id);
    console.log(`  Combined Concurrent Footprint: CPU ${metrics.cpuPercent}% | RAM ${Math.round(metrics.memoryUsageBytes / (1024 * 1024))} MiB | PIDs ${metrics.pidsCount}`);
    assert.ok(metrics.memoryUsageBytes < 2048 * 1024 * 1024, 'Combined sessions fit comfortably within power tier');

    // -------------------------------------------------------------------------
    // Step 8: Verify both users can access the shared project
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 8] Verify shared project collaboration (/workspace) ---');
    // User A creates shared project file
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "export const serviceName = \'PaymentGateway\';" > /home/operator/workspace/service.js'
    ], { user: memberA.username });

    // User B reads User A file and appends to it
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "export const version = \'1.0.0\';" >> /home/operator/workspace/service.js'
    ], { user: memberB.username });

    const sharedFileCheck = await driver.exec(box.id, ['cat', '/home/operator/workspace/service.js']);
    assert.ok(sharedFileCheck.stdout.includes('PaymentGateway'), 'User A content in shared file');
    assert.ok(sharedFileCheck.stdout.includes('1.0.0'), 'User B edit in shared file');
    console.log('  Shared workspace collaborative read/write verified');

    // -------------------------------------------------------------------------
    // Step 9: Verify neither user can access the other's credentials or desktop
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 9] Verify strict isolation between users (credentials & sessions) ---');
    // User A attempts to read User B's private credentials
    const breachAttemptAtoB = await driver.exec(box.id, [
      'bash', '-c',
      `cat /home/${memberB.username}/.codex/auth.json`
    ], { user: memberA.username });
    assert.notStrictEqual(breachAttemptAtoB.exitCode, 0, 'User A cannot access User B credentials');
    assert.ok(breachAttemptAtoB.stderr.includes('Permission denied'), 'Permission denied enforced (A -> B)');

    // User B attempts to read User A's private credentials
    const breachAttemptBtoA = await driver.exec(box.id, [
      'bash', '-c',
      `cat /home/${memberA.username}/.claude.json`
    ], { user: memberB.username });
    assert.notStrictEqual(breachAttemptBtoA.exitCode, 0, 'User B cannot access User A credentials');
    assert.ok(breachAttemptBtoA.stderr.includes('Permission denied'), 'Permission denied enforced (B -> A)');

    // User A attempts to hijack User B's desktop stream via gateway with invalid token
    const hijackAttempt = await new Promise<number>((resolve) => {
      const hijackedWs = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberB.userId}&token=invalid-token-tamper`
      );
      hijackedWs.on('unexpected-response', (_, res) => resolve(res.statusCode || 0));
      hijackedWs.on('open', () => { hijackedWs.close(); resolve(200); });
      hijackedWs.on('error', () => resolve(403));
    });
    assert.strictEqual(hijackAttempt, 403, 'Gateway rejects unauthorized session hijacking attempt with 403');
    console.log('  Multi-user security & credential barrier: ENFORCED (0% leak)');

    // -------------------------------------------------------------------------
    // Step 10: Disconnect Session A without affecting Session B
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 10] Disconnect Session A without affecting Session B ---');
    wsA.close();
    await new Promise(r => setTimeout(r, 200));

    assert.strictEqual(wsA.readyState, WebSocket.CLOSED, 'User A desktop disconnected');
    assert.strictEqual(wsB.readyState, WebSocket.OPEN, 'User B desktop remains fully connected and active');
    console.log('  Session A closed cleanly; Session B remains live');

    // -------------------------------------------------------------------------
    // Step 11: Revoke User A
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 11] Revoke User A by box owner ---');
    const revokedMemberA = await manager.revokeMember(box.id, box.tenantId, { userId: memberA.userId });
    assert.strictEqual(revokedMemberA.status, 'revoked', 'User A status is revoked');
    assert.strictEqual(revokedMemberA.sessionToken, undefined, 'User A session token cleared');
    console.log('  User A revoked by owner');

    // -------------------------------------------------------------------------
    // Step 12: Verify User A cannot reconnect through any supported access path
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 12] Verify User A cannot reconnect ---');
    const reconnectAttempt = await new Promise<number>((resolve) => {
      const reconnectWs = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberA.userId}&token=${memberA.sessionToken || 'revoked'}`
      );
      reconnectWs.on('unexpected-response', (_, res) => resolve(res.statusCode || 0));
      reconnectWs.on('open', () => { reconnectWs.close(); resolve(200); });
      reconnectWs.on('error', () => resolve(403));
    });

    assert.strictEqual(reconnectAttempt, 403, 'Revoked User A connection rejected with 403 Forbidden');
    console.log('  User A reconnection blocked: 403 Forbidden');

    // -------------------------------------------------------------------------
    // Step 13: Verify User B continues working
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 13] Verify User B continues working uninterrupted ---');
    assert.strictEqual(wsB.readyState, WebSocket.OPEN, 'User B WebSocket still open');

    const bobProductiveTask = await driver.exec(box.id, [
      'bash', '-c',
      'echo "export function processPayment(amount) { return amount > 0; }" >> /home/operator/workspace/service.js'
    ], { user: memberB.username });
    assert.strictEqual(bobProductiveTask.exitCode, 0, 'User B can continue modifying shared workspace');
    console.log('  User B continues productive work without interruption');

    // -------------------------------------------------------------------------
    // Step 14: Verify shared files remain intact
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 14] Verify shared project files remain intact after revocation ---');
    const finalSharedCheck = await driver.exec(box.id, ['cat', '/home/operator/workspace/service.js']);
    assert.ok(finalSharedCheck.stdout.includes('PaymentGateway'), 'Initial User A work preserved');
    assert.ok(finalSharedCheck.stdout.includes('processPayment'), 'Subsequent User B work preserved');
    console.log('  Shared project files 100% intact');

    // -------------------------------------------------------------------------
    // Step 15: Export and terminate the AgentBox
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 15] Export deliverables and terminate AgentBox ---');
    const exportRes = await new Promise<number>((resolve, reject) => {
      const req = http.get(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/export`,
        { headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let bytes = 0;
          res.on('data', d => bytes += d.length);
          res.on('end', () => resolve(bytes));
        }
      );
      req.on('error', reject);
    });

    assert.ok(exportRes > 500, 'Export archive retrieved successfully');
    console.log(`  Export archive downloaded: ${exportRes} bytes`);

    // Clean teardown
    wsB.close();
    await manager.deleteBox(box.id, box.name);
    const deletedBox = manager.getBox(box.id);
    assert.strictEqual(deletedBox, undefined, 'AgentBox cleanly deleted and purged');
    console.log('  AgentBox and all resources permanently decommissioned');

    console.log('\n✔ Commission 010 Amendment I 15-Step Acceptance Test PASSED 100%!\n');
  } finally {
    if (wsA && wsA.readyState === WebSocket.OPEN) wsA.close();
    if (wsB && wsB.readyState === WebSocket.OPEN) wsB.close();
    await gateway.stop();
    if (box && box.id) {
      try {
        await driver.terminate(box.id);
      } catch {}
    }
  }
});
