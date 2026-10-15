import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOX_TIERS } from '../src/types/box.js';
import { BoxStorageManager } from '../src/provisioning/storage-manager.js';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';

test('Provisioning Specs: Tier specifications enforce polite neighbor limits', () => {
  assert.strictEqual(BOX_TIERS.standard.cpus, 2);
  assert.strictEqual(BOX_TIERS.standard.memoryLimit, '4g');
  assert.strictEqual(BOX_TIERS.standard.pidsLimit, 512);

  assert.strictEqual(BOX_TIERS.power.cpus, 4);
  assert.strictEqual(BOX_TIERS.power.memoryLimit, '8g');
  assert.strictEqual(BOX_TIERS.power.pidsLimit, 1024);

  assert.strictEqual(BOX_TIERS.titan.cpus, 8);
  assert.strictEqual(BOX_TIERS.titan.memoryLimit, '16g');
  assert.strictEqual(BOX_TIERS.titan.pidsLimit, 2048);
});

test('Provisioning Storage: Generates deterministic volume and network names per tenant and box', () => {
  const storage = new BoxStorageManager('testns');
  const spec1 = storage.getVolumeSpec('tenant-alpha', 'box-1234');
  const spec2 = storage.getVolumeSpec('tenant-beta', 'box-5678');

  assert.strictEqual(spec1.homeVolume, 'agentbox-testns-tenant-alpha-box-1234-home');
  assert.strictEqual(spec1.workspaceVolume, 'agentbox-testns-tenant-alpha-box-1234-workspace');
  assert.strictEqual(spec1.networkName, 'agentbox-testns-tenant-alpha-box-1234-net');

  // Multi-tenant volume separation
  assert.notStrictEqual(spec1.homeVolume, spec2.homeVolume);
  assert.notStrictEqual(spec1.workspaceVolume, spec2.workspaceVolume);
  assert.notStrictEqual(spec1.networkName, spec2.networkName);
});

test('Provisioning Driver: Base image availability check', async () => {
  const driver = new DockerBoxDriver('testns', 'dreambeesai/agentbox:v1');
  const isAvailable = await driver.available();
  assert.strictEqual(isAvailable, true, 'dreambeesai/agentbox:v1 must be available in Docker daemon');
});
