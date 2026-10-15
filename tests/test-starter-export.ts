/**
 * Test Suite: Starter Tasks & Workspace Artifact Export
 * Verifies Commission 008.V-B and 008.V-D requirements:
 * 1. Pre-seeding of STARTER_TASKS.md in customer workspace
 * 2. Streaming export of /home/operator/workspace as .tar.gz archive
 * 3. Fast, non-blocking retrieval of user deliverables
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import { DisplayGateway } from '../src/gateway/display-gateway.js';

test('Starter Tasks & Artifact Export: Verifies workspace pre-seeding and archive download', async () => {
  const testUid = crypto.randomUUID().slice(0, 8);
  const testDir = path.join(os.tmpdir(), `export-test-${testUid}`);
  const boxesFile = path.join(testDir, 'boxes.json');
  const jobsFile = path.join(testDir, 'jobs.json');
  const driver = new DockerBoxDriver(`exp-${testUid}`, 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(boxesFile, driver, 5, 10, jobsFile);
  const gatewayPort = 3097;
  const gateway = new DisplayGateway(manager, gatewayPort, '127.0.0.1');

  await gateway.start();
  let box: any;

  try {
    // 1. Provision workstation
    box = await manager.createBox({
      name: `Export-Test-Box-${testUid}`,
      tier: 'standard',
      agents: ['claude-code']
    });

    assert.ok(box, 'Box must be provisioned');
    assert.strictEqual(box.state, 'running', 'Box must be running');

    // 2. Verify STARTER_TASKS.md was seeded in ~/workspace
    const starterCheck = await driver.exec(box.id, ['cat', '/home/operator/workspace/STARTER_TASKS.md']);
    assert.strictEqual(starterCheck.exitCode, 0, 'STARTER_TASKS.md must exist in customer workspace');
    assert.ok(starterCheck.stdout.includes('Starter Tasks'), 'STARTER_TASKS.md header verified');
    assert.ok(starterCheck.stdout.includes('claude login'), 'Auth guidance verified in starter tasks');

    // 3. User creates a code artifact in workspace
    const artifactFilename = `my_script_${testUid}.py`;
    const artifactContent = `print("Hello from AgentBox ${testUid}")\n`;
    await driver.exec(box.id, [
      'bash', '-c',
      `echo '${artifactContent}' > /home/operator/workspace/${artifactFilename}`
    ]);

    // 4. Test GET /api/boxes/:id/export HTTP endpoint
    const exportData = await new Promise<{ statusCode: number; headers: any; buffer: Buffer }>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${gatewayPort}/api/boxes/${box.id}/export`, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            buffer: Buffer.concat(chunks)
          });
        });
      });
      req.on('error', reject);
    });

    assert.strictEqual(exportData.statusCode, 200, 'Export endpoint must return 200 OK');
    assert.strictEqual(exportData.headers['content-type'], 'application/gzip', 'Content-Type must be gzip');
    assert.ok(exportData.headers['content-disposition']?.includes('attachment'), 'Must set attachment disposition');
    assert.ok(exportData.buffer.length > 100, 'Archive must contain valid bytes');

    // Verify gzip header magic bytes (0x1f, 0x8b)
    assert.strictEqual(exportData.buffer[0], 0x1f, 'Gzip magic byte 1');
    assert.strictEqual(exportData.buffer[1], 0x8b, 'Gzip magic byte 2');
    console.log(`Successfully exported ${exportData.buffer.length} bytes of workspace archive`);

  } finally {
    if (box?.id) {
      await manager.deleteBox(box.id, box.name).catch(() => {});
    }
    await gateway.stop();
    await driver.destroy(box?.id || 'dummy').catch(() => {});
  }
});
