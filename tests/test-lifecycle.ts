import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';

test('Acceptance Criteria 1, 3, 4, 7: Box Provisioning, Agent Installation, BYOK Auth, and Lifecycle Transitions', async () => {
  const testId = crypto.randomUUID();
  const testFile = path.join(os.tmpdir(), `test-boxes-lifecycle-${Date.now()}.json`);
  const driver = new DockerBoxDriver('test-life', 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(testFile, driver, 5, 10);

  let box: any;

  try {
    // 1. Provision an isolated Linux desktop (Criterion 1)
    box = await manager.createBox({
      id: testId,
      name: 'Lifecycle-Verification-Box',
      tier: 'standard',
      agents: ['google-antigravity']
    });

    assert.ok(box, 'Box must be provisioned');
    assert.strictEqual(box.state, 'running', 'Box must be in running state');
    assert.ok(box.installedAgents.includes('openai-codex'), 'Codex preinstalled in base');
    assert.ok(box.installedAgents.includes('google-antigravity'), 'Antigravity installed on creation');

    // 2. Install and launch an additional agent from catalog (Criterion 3)
    const installRes = await manager.installAgent(box.id, 'hermes-agent');
    assert.strictEqual(installRes.success, true, 'Agent installation must succeed');

    // Execute installed agent CLI in container
    const hermesExec = await driver.exec(box.id, ['hermes-agent', '--help']);
    assert.strictEqual(hermesExec.exitCode, 0, 'Installed agent must execute successfully');
    assert.ok(hermesExec.stdout.includes('Hermes Agent') || hermesExec.stdout.includes('Nous Research'), 'Agent output expected');

    // Launch app window/terminal through open-app dispatcher
    await manager.launchApp(box.id, 'terminal');

    // 3. Authenticate with customer provider credentials (BYOK) (Criterion 4)
    // Customer sets their own GEMINI_API_KEY in ~/.bashrc
    const dummyKey = 'AIzaSy_TEST_VERIFIED_BYOK_KEY_999';
    await driver.exec(box.id, [
      'bash', '-c',
      `echo "export GEMINI_API_KEY='${dummyKey}'" >> /home/operator/.bashrc`
    ]);

    // Test Antigravity doctor with customer key
    const agyTest = await driver.exec(box.id, [
      'bash', '-c',
      `source /home/operator/.bashrc && agy doctor`
    ]);
    assert.strictEqual(agyTest.exitCode, 0, 'Antigravity doctor must pass with configured BYOK key');
    assert.ok(agyTest.stdout.includes('Configured'), 'Must detect configured customer key');

    // 4. Test Stopping (Criterion 7)
    await manager.stopBox(box.id);
    const stopped = manager.getBox(box.id);
    assert.strictEqual(stopped?.state, 'stopped', 'Box must transition to stopped');

    // 5. Test Resuming (Criterion 7)
    await manager.startBox(box.id);
    const resumed = manager.getBox(box.id);
    assert.strictEqual(resumed?.state, 'running', 'Box must transition to running');

    // 6. Test Deletion (Criterion 7)
    await manager.deleteBox(box.id);
    const deleted = manager.getBox(box.id);
    assert.strictEqual(deleted, undefined, 'Box must be deleted from registry');
    box = null;
  } finally {
    if (box?.id) {
      await manager.deleteBox(box.id).catch(() => {});
    }
  }
});
