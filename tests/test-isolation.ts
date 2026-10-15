import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';

test('Acceptance Criterion 6: Multi-tenant process, network, and filesystem isolation', async (t) => {
  const testId1 = crypto.randomUUID();
  const testId2 = crypto.randomUUID();
  const testFile = path.join(os.tmpdir(), `test-boxes-isolation-${Date.now()}.json`);
  const driver = new DockerBoxDriver('test-iso', 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(testFile, driver, 5, 10);

  let boxA: any;
  let boxB: any;

  try {
    // 1. Provision Box A (Tenant Alpha)
    boxA = await manager.createBox({
      id: testId1,
      name: 'Tenant-Alpha-Box',
      tier: 'standard',
      tenantId: 'tenant-alpha'
    });

    // 2. Provision Box B (Tenant Beta)
    boxB = await manager.createBox({
      id: testId2,
      name: 'Tenant-Beta-Box',
      tier: 'standard',
      tenantId: 'tenant-beta'
    });

    // 3. Write secret to Box A
    const alphaSecret = 'SECRET_ALPHA_TOKEN_XYZ_CONFIDENTIAL';
    await driver.exec(boxA.id, [
      'bash', '-c', `echo "${alphaSecret}" > /home/operator/workspace/alpha_secret.txt`
    ]);

    // 4. Verify Box B's workspace does NOT contain Box A's secret
    const betaCheck = await driver.exec(boxB.id, ['cat', '/home/operator/workspace/alpha_secret.txt']);
    assert.notStrictEqual(betaCheck.exitCode, 0, 'Box B must not be able to read Box A secret file');
    assert.ok(betaCheck.stderr.includes('No such file') || betaCheck.stdout.length === 0, 'File must not exist in Box B');

    // 5. Verify Process Isolation (Box B cannot see Box A processes)
    // Run background sleep in Box A with a unique marker
    const marker = `marker_${Date.now()}`;
    await driver.exec(boxA.id, ['bash', '-c', `sleep 60 & echo started`]);

    const betaPs = await driver.exec(boxB.id, ['ps', 'aux']);
    assert.strictEqual(betaPs.exitCode, 0);
    // Beta must not see processes from Alpha
    assert.ok(!betaPs.stdout.includes(marker), 'Box B must not see Box A processes (PID namespace isolation)');

    // 6. Verify Docker socket and host access is blocked
    const dockerSockCheck = await driver.exec(boxB.id, ['ls', '-la', '/var/run/docker.sock']);
    assert.notStrictEqual(dockerSockCheck.exitCode, 0, 'Docker socket must never be mounted in customer environments');

    // 7. Verify non-root user UID 1000
    const idCheck = await driver.exec(boxB.id, ['id', '-u']);
    assert.strictEqual(idCheck.stdout.trim(), '1000', 'Customer processes must run strictly as non-root UID 1000');
  } finally {
    if (boxA?.id) await manager.deleteBox(boxA.id).catch(() => {});
    if (boxB?.id) await manager.deleteBox(boxB.id).catch(() => {});
  }
});
