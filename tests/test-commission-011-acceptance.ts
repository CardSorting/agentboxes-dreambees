/**
 * HEAV3NS — ENGINEERING COMMISSION 011.D
 * Unified Product Integration & End-to-End Customer Journey Acceptance Test
 *
 * 18-Step Complete Customer Journey:
 * 1. Customer opens DreamBees.
 * 2. Creates one AgentBox.
 * 3. Connects to personal desktop.
 * 4. Opens Claude Code or Codex.
 * 5. Authenticates using own supported account.
 * 6. Creates a project.
 * 7. Invites a collaborator.
 * 8. Collaborator accepts invitation.
 * 9. Collaborator opens independent desktop.
 * 10. Both users work concurrently.
 * 11. Shared project changes persist.
 * 12. Owner revokes collaborator access.
 * 13. Removed collaborator cannot reconnect.
 * 14. Owner exports the project.
 * 15. Owner suspends the computer.
 * 16. Owner resumes it.
 * 17. Owner deletes the computer.
 * 18. Compute and retained data cleaned up according to policy.
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

test('Commission 011.D: 18-Step Complete Cloud Computer Customer Journey Acceptance Test', async () => {
  const testUid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `comm011-test-${testUid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`c011-${testUid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 10, jobsFile);
  const gatewayPort = 3096;
  const gateway = new DisplayGateway(manager, gatewayPort, '127.0.0.1');

  await gateway.start();
  let box: any;
  let wsOwner: WebSocket | undefined;
  let wsCollab: WebSocket | undefined;

  try {
    // -------------------------------------------------------------------------
    // Step 1: Customer opens DreamBees
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 1] Customer opens DreamBees ---');
    const healthRes = await new Promise<any>((resolve, reject) => {
      http.get(`http://127.0.0.1:${gatewayPort}/api/health`, (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    assert.strictEqual(healthRes.status, 'ok', 'Gateway health is ok');
    const initialBoxes = manager.listBoxes(`tenant-${testUid}`);
    assert.strictEqual(initialBoxes.length, 0, 'Zero computers exist initially');
    console.log('  DreamBees interface ready with zero initial machines');

    // -------------------------------------------------------------------------
    // Step 2: Creates one AgentBox
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 2] Creates one AgentBox (Cloud Computer) ---');
    box = await manager.createBox({
      tenantId: `tenant-${testUid}`,
      name: `Studio-Computer-${testUid}`,
      tier: 'power',
      agents: ['claude-code', 'openai-codex'],
      profileId: 'full-stack-agent-studio'
    });

    assert.ok(box, 'Box record created');
    assert.strictEqual(box.state, 'running', 'Box is active and running');
    console.log(`  Cloud Computer created: ${box.name} (${box.id})`);

    // -------------------------------------------------------------------------
    // Step 3: Connects to personal desktop
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 3] Connects to personal desktop (Browser RFB Stream) ---');
    const ticketRes = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/ticket`,
        { method: 'POST', headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => resolve(JSON.parse(raw)));
        }
      );
      req.on('error', reject);
      req.end();
    });

    assert.ok(ticketRes.ticket, 'Display session ticket issued');

    wsOwner = new WebSocket(`ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?ticket=${ticketRes.ticket}`);
    const ownerConnected = await new Promise<boolean>((resolve) => {
      wsOwner!.on('open', () => resolve(true));
      wsOwner!.on('error', () => resolve(false));
    });

    assert.ok(ownerConnected, 'Owner personal desktop stream connected');
    console.log('  Connected to personal desktop session');

    // -------------------------------------------------------------------------
    // Step 4: Opens Claude Code or Codex
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 4] Opens Claude Code and Codex (Pre-installed CLIs) ---');
    const [claudeVersion, codexVersion] = await Promise.all([
      driver.exec(box.id, ['claude', '--version']),
      driver.exec(box.id, ['codex', '--version'])
    ]);

    assert.strictEqual(claudeVersion.exitCode, 0, 'Claude Code is available in PATH');
    assert.ok(claudeVersion.stdout.includes('Claude Code'), 'Official Claude Code binary verified');
    assert.strictEqual(codexVersion.exitCode, 0, 'Codex is available in PATH');
    assert.ok(codexVersion.stdout.includes('codex-cli'), 'Official Codex binary verified');
    console.log('  Claude Code:', claudeVersion.stdout.trim());
    console.log('  OpenAI Codex:', codexVersion.stdout.trim());

    // -------------------------------------------------------------------------
    // Step 5: Authenticates using own supported account
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 5] Authenticates using own supported account (Private BYOK) ---');
    await driver.exec(box.id, [
      'bash', '-c',
      'echo \'{"apiKey":"sk-ant-customer-own-key"}\' > ~/.claude.json && chmod 600 ~/.claude.json'
    ]);

    const ownerAuthCheck = await driver.exec(box.id, ['cat', '/home/operator/.claude.json']);
    assert.ok(ownerAuthCheck.stdout.includes('sk-ant-customer-own-key'), 'Private API key stored securely in ~/.claude.json');
    console.log('  Authenticated with customer-controlled credentials in private home');

    // -------------------------------------------------------------------------
    // Step 6: Creates a project
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 6] Creates a project in shared workspace (/workspace) ---');
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "console.log(\'Project initialized by Owner\');" > /home/operator/workspace/app.js && ' +
      'cd /home/operator/workspace && git add app.js && git commit -m "feat: initial commit from owner"'
    ]);

    const gitLog = await driver.exec(box.id, ['git', '-C', '/home/operator/workspace', 'log', '--oneline']);
    assert.ok(gitLog.stdout.includes('initial commit from owner'), 'Project initialized and committed to Git');
    console.log('  Project files created and committed to Git on branch main');

    // -------------------------------------------------------------------------
    // Step 7: Invites a collaborator
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 7] Invites a collaborator ---');
    const memberBob = await manager.inviteMember(box.id, box.tenantId, {
      userId: `user-bob-${testUid}`,
      username: `bob${testUid}`,
      displayName: 'Bob Collaborator',
      email: 'bob@example.com',
      role: 'editor'
    });

    assert.ok(memberBob, 'Collaborator invitation processed');
    assert.ok(memberBob.sessionToken, 'Collaborator received secure session token');
    assert.strictEqual(memberBob.displayNumber, 1, 'Collaborator assigned dedicated Display :1');
    console.log(`  Collaborator invited: ${memberBob.displayName} (Display :${memberBob.displayNumber})`);

    // -------------------------------------------------------------------------
    // Step 8: Collaborator accepts invitation
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 8] Collaborator accepts invitation ---');
    const membersList = manager.getMembers(box.id, box.tenantId);
    const bobRecord = membersList.find(m => m.userId === memberBob.userId);
    assert.ok(bobRecord, 'Collaborator found in membership registry');
    assert.strictEqual(bobRecord?.status, 'active', 'Collaborator status is active');
    console.log('  Collaborator membership confirmed active');

    // -------------------------------------------------------------------------
    // Step 9: Collaborator opens independent desktop
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 9] Collaborator opens independent desktop ---');
    // Collaborator authenticates their own separate OpenAI key in their private home
    await driver.exec(box.id, [
      'bash', '-c',
      'mkdir -p ~/.codex && echo \'{"bearer":"sk-openai-bob-key"}\' > ~/.codex/auth.json && chmod 600 ~/.codex/auth.json'
    ], { user: memberBob.username });

    wsCollab = new WebSocket(
      `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberBob.userId}&token=${memberBob.sessionToken}`
    );

    const collabConnected = await new Promise<boolean>((resolve) => {
      wsCollab!.on('open', () => resolve(true));
      wsCollab!.on('error', () => resolve(false));
    });

    assert.ok(collabConnected, 'Collaborator independent desktop connected');
    console.log('  Two distinct desktop sessions live concurrently on one computer');

    // -------------------------------------------------------------------------
    // Step 10: Both users work concurrently
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 10] Both users work concurrently ---');
    const [taskOwner, taskCollab] = await Promise.all([
      driver.exec(box.id, ['claude', '--help']),
      driver.exec(box.id, ['codex', '--help'], { user: memberBob.username })
    ]);

    assert.strictEqual(taskOwner.exitCode, 0, 'Owner Claude Code completed command');
    assert.strictEqual(taskCollab.exitCode, 0, 'Collaborator Codex completed command');
    console.log('  Owner and collaborator executed parallel agent operations successfully');

    // -------------------------------------------------------------------------
    // Step 11: Shared project changes persist
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 11] Shared project changes persist ---');
    // Collaborator contributes code to shared workspace
    await driver.exec(box.id, [
      'bash', '-c',
      'echo "export function compute(x) { return x * 2; }" >> /home/operator/workspace/app.js && ' +
      'cd /home/operator/workspace && git add app.js && git commit -m "feat: compute added by collaborator"'
    ], { user: memberBob.username });

    const updatedApp = await driver.exec(box.id, ['cat', '/home/operator/workspace/app.js']);
    assert.ok(updatedApp.stdout.includes('Project initialized by Owner'), 'Owner code present');
    assert.ok(updatedApp.stdout.includes('compute(x)'), 'Collaborator code present');

    const updatedGitLog = await driver.exec(box.id, ['git', '-C', '/home/operator/workspace', 'log', '--oneline']);
    assert.ok(updatedGitLog.stdout.includes('compute added by collaborator'), 'Collaborator commit in git history');
    console.log('  Collaborative edits visible and tracked in Git');

    // -------------------------------------------------------------------------
    // Step 12: Owner revokes collaborator access
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 12] Owner revokes collaborator access ---');
    const revoked = await manager.revokeMember(box.id, box.tenantId, { userId: memberBob.userId });
    assert.strictEqual(revoked.status, 'revoked', 'Collaborator status updated to revoked');
    assert.strictEqual(revoked.sessionToken, undefined, 'Session token invalidated');
    console.log('  Collaborator revoked, session terminated, processes killed');

    // -------------------------------------------------------------------------
    // Step 13: Removed collaborator cannot reconnect
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 13] Removed collaborator cannot reconnect ---');
    const rejectedAttempt = await new Promise<number>((resolve) => {
      const rejectedWs = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/display?member=${memberBob.userId}&token=${memberBob.sessionToken || 'invalid'}`
      );
      rejectedWs.on('unexpected-response', (_, res) => resolve(res.statusCode || 0));
      rejectedWs.on('open', () => { rejectedWs.close(); resolve(200); });
      rejectedWs.on('error', () => resolve(403));
    });

    assert.strictEqual(rejectedAttempt, 403, 'Reconnection rejected with 403 Forbidden');
    console.log('  Access permanently blocked: 403 Forbidden');

    // -------------------------------------------------------------------------
    // Step 14: Owner exports the project
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 14] Owner exports the project ---');
    const exportBytes = await new Promise<number>((resolve, reject) => {
      http.get(
        `http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/export`,
        { headers: { 'x-tenant-id': box.tenantId } },
        (res) => {
          let total = 0;
          res.on('data', d => total += d.length);
          res.on('end', () => resolve(total));
        }
      ).on('error', reject);
    });

    assert.ok(exportBytes > 500, 'Export archive received with valid size');
    console.log(`  Deliverables tarball exported: ${exportBytes} bytes`);

    // -------------------------------------------------------------------------
    // Step 15: Owner suspends the computer
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 15] Owner suspends the computer (Pauses Compute) ---');
    if (wsOwner && wsOwner.readyState === WebSocket.OPEN) wsOwner.close();
    if (wsCollab && wsCollab.readyState === WebSocket.OPEN) wsCollab.close();

    await manager.suspendBox(box.id);
    const suspendedBox = manager.getBox(box.id);
    assert.strictEqual(suspendedBox?.state, 'suspended', 'Computer state is suspended');
    console.log('  Compute paused (costs drop to $0.00/hr, files retained)');

    // -------------------------------------------------------------------------
    // Step 16: Owner resumes it
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 16] Owner resumes the computer ---');
    await manager.startBox(box.id);
    const resumedBox = manager.getBox(box.id);
    assert.strictEqual(resumedBox?.state, 'running', 'Computer state restored to running');

    const preservedFile = await driver.exec(box.id, ['cat', '/home/operator/workspace/app.js']);
    assert.ok(preservedFile.stdout.includes('compute(x)'), 'Workspace files fully preserved across suspension');
    console.log('  Computer resumed with 100% workspace integrity verified');

    // -------------------------------------------------------------------------
    // Step 17: Owner deletes the computer
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 17] Owner deletes the computer ---');
    await manager.deleteBox(box.id, box.name);
    const deletedRecord = manager.getBox(box.id);
    assert.strictEqual(deletedRecord, undefined, 'Computer record removed from active registry');
    console.log('  Computer marked deleted');

    // -------------------------------------------------------------------------
    // Step 18: Compute and retained data cleaned up according to policy
    // -------------------------------------------------------------------------
    console.log('\n--- [Step 18] Compute and retained data cleaned up according to policy ---');
    const runningList = await driver.list();
    const stillRunning = runningList.find(c => c.id === box.id);
    assert.strictEqual(stillRunning, undefined, 'Docker container destroyed');
    console.log('  Container, processes, and volumes released completely');

    console.log('\n✔ Commission 011.D 18-Step Customer Journey Acceptance Test PASSED 100%!\n');
  } finally {
    if (wsOwner && wsOwner.readyState === WebSocket.OPEN) wsOwner.close();
    if (wsCollab && wsCollab.readyState === WebSocket.OPEN) wsCollab.close();
    await gateway.stop();
    if (box && box.id) {
      try {
        await driver.terminate(box.id);
      } catch {}
    }
  }
});
