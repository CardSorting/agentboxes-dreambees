import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import path from 'node:path';
import os from 'node:os';

test('Acceptance Criterion 5: Workspace data survives container restart and reconnect', async (t) => {
  const testId = crypto.randomUUID();
  const testFile = path.join(os.tmpdir(), `test-boxes-${testId}.json`);
  const driver = new DockerBoxDriver('test-persist', 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(testFile, driver, 5, 10);

  let createdBox: any;
  try {
    // 1. Provision an isolated box
    createdBox = await manager.createBox({
      id: testId,
      name: `Persist-Test-${testId.slice(0, 6)}`,
      tier: 'standard',
      tenantId: 'test-tenant'
    });

    assert.ok(createdBox.id, 'Box must have an ID');
    assert.strictEqual(createdBox.state, 'running', 'Box must be running');

    // 2. Write persistent data to workspace
    const secretContent = `PERSISTENT_DATA_TOKEN_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const writeRes = await driver.exec(createdBox.id, [
      'bash', '-c',
      `echo "${secretContent}" > /home/operator/workspace/persistence-verification.txt && echo "export TEST_VAR=persisted" >> /home/operator/.bashrc`
    ]);
    assert.strictEqual(writeRes.exitCode, 0, 'Must successfully write test file');

    // 3. Stop the box (simulates disconnection / session end)
    await manager.stopBox(createdBox.id);
    const stoppedBox = manager.getBox(createdBox.id);
    assert.strictEqual(stoppedBox?.state, 'stopped', 'Box must be stopped');

    // 4. Resume the box
    await manager.startBox(createdBox.id);
    const resumedBox = manager.getBox(createdBox.id);
    assert.strictEqual(resumedBox?.state, 'running', 'Box must be resumed to running');

    // 5. Verify the data in the workspace and home directory survived
    const readRes = await driver.exec(createdBox.id, [
      'cat', '/home/operator/workspace/persistence-verification.txt'
    ]);
    assert.strictEqual(readRes.exitCode, 0, 'Must read the test file');
    assert.strictEqual(readRes.stdout.trim(), secretContent, 'Workspace data must survive restart and reconnect');

    const bashrcRes = await driver.exec(createdBox.id, ['tail', '-n', '1', '/home/operator/.bashrc']);
    assert.strictEqual(bashrcRes.stdout.trim(), 'export TEST_VAR=persisted', 'Home config must survive restart');
  } finally {
    // Clean up test box
    if (createdBox?.id) {
      await manager.deleteBox(createdBox.id).catch(() => {});
    }
  }
});
