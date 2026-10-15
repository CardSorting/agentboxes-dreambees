import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_CATALOG, AgentCatalogService } from '../src/catalog/agent-catalog.js';

test('Agent Catalog: All required tools are registered and categorized', () => {
  const service = new AgentCatalogService();
  const all = service.getAll();

  assert.ok(all.length >= 9, 'Catalog must contain at least 9 curated tools');

  const ids = all.map(a => a.id);
  assert.ok(ids.includes('cursor'), 'Cursor must be in catalog');
  assert.ok(ids.includes('google-antigravity'), 'Google Antigravity must be in catalog');
  assert.ok(ids.includes('hermes-agent'), 'Hermes Agent must be in catalog');
  assert.ok(ids.includes('openclaw'), 'OpenClaw must be in catalog');
  assert.ok(ids.includes('openai-codex'), 'OpenAI Codex must be in catalog');
  assert.ok(ids.includes('claude-code'), 'Claude Code must be in catalog');
  assert.ok(ids.includes('grok-tools'), 'Grok-compatible tools must be in catalog');
  assert.ok(ids.includes('muse'), 'Muse must be in catalog');
  assert.ok(ids.includes('apple-xcode-agent'), 'Xcode entry must exist for honest compatibility reporting');
});

test('Agent Catalog: Honest compatibility reporting without fabrication', () => {
  const service = new AgentCatalogService();
  const xcode = service.getById('apple-xcode-agent');

  assert.ok(xcode, 'Xcode entry must exist');
  assert.strictEqual(xcode.status, 'unavailable', 'Xcode must be marked unavailable on Linux');
  assert.ok(xcode.statusReason && xcode.statusReason.includes('macOS'), 'Must provide concrete explanation');
});

test('Agent Catalog: Every available agent has verified BYOK authentication contracts', () => {
  const service = new AgentCatalogService();
  const available = service.getAvailable();

  for (const agent of available) {
    assert.ok(agent.authModel, `Agent ${agent.id} must define an authModel`);
    assert.ok(agent.authProvider, `Agent ${agent.id} must define authProvider`);
    assert.ok(agent.authInstructions, `Agent ${agent.id} must define clear BYOK instructions`);
    assert.ok(agent.docsUrl, `Agent ${agent.id} must define official docs URL`);
  }
});

test('Agent Catalog: Validation rejects unavailable or invalid agents', () => {
  const service = new AgentCatalogService();
  const res = service.validateSelectedAgents(['cursor', 'apple-xcode-agent', 'non-existent-agent']);

  assert.deepStrictEqual(res.valid, ['cursor']);
  assert.deepStrictEqual(res.unavailable, ['apple-xcode-agent']);
  assert.deepStrictEqual(res.invalid, ['non-existent-agent']);
});
