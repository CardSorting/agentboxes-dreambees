import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';

test('Acceptance Criterion 8: Operational resource usage can be measured', async () => {
  const testId = crypto.randomUUID();
  const testFile = path.join(os.tmpdir(), `test-boxes-metrics-${Date.now()}.json`);
  const driver = new DockerBoxDriver('test-metrics', 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(testFile, driver, 5, 10);

  let box: any;

  try {
    box = await manager.createBox({
      id: testId,
      name: 'Metrics-Verification-Box',
      tier: 'standard'
    });

    assert.ok(box, 'Box created');
    assert.strictEqual(box.state, 'running');

    // Fetch live metrics
    const metrics = await manager.getMetrics(box.id);

    assert.ok(metrics, 'Metrics object must be returned');
    assert.ok(Number.isFinite(metrics.cpuPercent), 'CPU percent must be finite');
    assert.ok(metrics.memoryUsageBytes > 0, 'Memory usage must be measured and > 0');
    assert.ok(metrics.memoryLimitBytes > 0, 'Memory limit must be measured and > 0');
    assert.ok(metrics.pidsCount > 0, 'PIDs count must be > 0 (Xvfb, dbus, xfwm4 running)');
    assert.ok(metrics.measuredAt > 0, 'Timestamp must be recorded');

    console.log(`Measured: CPU ${metrics.cpuPercent}% | RAM: ${Math.round(metrics.memoryUsageBytes / (1024 * 1024))} MiB | PIDs: ${metrics.pidsCount}`);
  } finally {
    if (box?.id) {
      await manager.deleteBox(box.id).catch(() => {});
    }
  }
});
