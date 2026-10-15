import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';
import { DockerBoxDriver } from '../src/provisioning/box-driver.js';
import { AgentBoxManager } from '../src/provisioning/box-manager.js';
import { DisplayGateway } from '../src/gateway/display-gateway.js';

test('Acceptance Criterion 2: Desktop opens through remote access gateway and streams RFB frames', async () => {
  const testId = crypto.randomUUID();
  const testFile = path.join(os.tmpdir(), `test-boxes-gw-${Date.now()}.json`);
  const driver = new DockerBoxDriver('test-gw', 'dreambeesai/agentbox:v1');
  const manager = new AgentBoxManager(testFile, driver, 5, 10);
  const testPort = 3039;
  const gateway = new DisplayGateway(manager, testPort, '127.0.0.1');

  await gateway.start();

  let box: any;

  try {
    // 1. Health API probe
    const healthRes = await fetch(`http://127.0.0.1:${testPort}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok');

    // 2. Provision box via API
    const createRes = await fetch(`http://127.0.0.1:${testPort}/api/boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testId,
        name: 'Gateway-Test-Box',
        tier: 'standard'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    box = createData.box;
    assert.ok(box?.id, 'Box created');
    assert.strictEqual(box.state, 'running');

    // 3. Issue connection ticket
    const ticketRes = await fetch(`http://127.0.0.1:${testPort}/api/boxes/${box.id}/ticket`, {
      method: 'POST'
    });
    assert.strictEqual(ticketRes.status, 200);
    const ticketData = await ticketRes.json();
    assert.ok(ticketData.ticket, 'Ticket must be returned');

    // 4. Test Clipboard API
    const testClip = `CLIPBOARD_SYNC_TEST_${Date.now()}`;
    const clipWriteRes = await fetch(`http://127.0.0.1:${testPort}/api/boxes/${box.id}/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testClip })
    });
    assert.strictEqual(clipWriteRes.status, 200);

    const clipReadRes = await fetch(`http://127.0.0.1:${testPort}/api/boxes/${box.id}/clipboard`);
    assert.strictEqual(clipReadRes.status, 200);
    const clipReadData = await clipReadRes.json();
    assert.strictEqual(clipReadData.text, testClip, 'Clipboard synchronization must be bidirectional');

    // 5. Test WebSocket RFB Display Stream (Acceptance Criterion 2)
    const wsUrl = `ws://127.0.0.1:${testPort}/api/boxes/${box.id}/display?ticket=${ticketData.ticket}`;
    
    const rfbReceived = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket RFB display connection timeout'));
      }, 10000);

      ws.on('open', () => {
        // Connection established
      });

      ws.on('message', (data: Buffer) => {
        clearTimeout(timer);
        // RFB server sends initial protocol handshake string: "RFB 003.008\n"
        const handshake = data.toString('utf8');
        if (handshake.startsWith('RFB')) {
          ws.close();
          resolve(true);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    assert.strictEqual(rfbReceived, true, 'Must receive initial RFB display handshake from x11vnc via display gateway');
  } finally {
    if (box?.id) {
      await manager.deleteBox(box.id).catch(() => {});
    }
    await gateway.stop();
  }
});
