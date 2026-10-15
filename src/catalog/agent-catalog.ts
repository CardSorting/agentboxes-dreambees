/**
 * Curated Agent Catalog Definition
 * Authoritative registry of third-party agent tools for AgentBoxes.
 * Adheres strictly to Commission 007:
 * - Verified Linux distribution methods and packaging.
 * - Explicit authentication requirements (BYOK).
 * - Honest compatibility reporting (unavailable tools marked without fabrication).
 */

import type { AgentCatalogItem } from '../types/catalog.js';

export const AGENT_CATALOG: AgentCatalogItem[] = [
  {
    id: 'openai-codex',
    name: 'OpenAI Codex',
    tagline: 'CLI coding agent with file-backed session tokens and device login',
    publisher: 'OpenAI',
    version: '0.162.1',
    category: 'terminal_agent',
    status: 'available',
    authModel: 'device_code',
    authProvider: 'OpenAI (ChatGPT Plus / Team / API)',
    authEnvVars: ['OPENAI_API_KEY', 'CODEX_HOME'],
    authInstructions: 'Run "codex login" in terminal or sign in via browser device code at auth.openai.com/codex/device. Saved in ~/.codex/auth.json.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Proprietary / Developer CLI',
    homepage: 'https://openai.com/codex',
    docsUrl: 'https://platform.openai.com/docs',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16"/></svg>',
    installMethod: 'bundled',
    launchType: 'terminal',
    launchCommand: 'codex',
    binaryPath: '/usr/local/bin/codex',
    isPreinstalled: true,
    estimatedInstallSeconds: 0,
    diskRequirementMb: 45
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    tagline: 'Anthropic agentic CLI that understands your codebase and executes edits',
    publisher: 'Anthropic',
    version: '2.1.300',
    category: 'terminal_agent',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'Anthropic (Claude API / Console)',
    authEnvVars: ['ANTHROPIC_API_KEY'],
    authInstructions: 'Set ANTHROPIC_API_KEY in ~/.bashrc or run "claude" and follow interactive browser OAuth verification.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Anthropic Commercial / Free CLI',
    homepage: 'https://anthropic.com/claude-code',
    docsUrl: 'https://docs.anthropic.com/claude/docs/claude-code',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    installMethod: 'bundled',
    launchType: 'terminal',
    launchCommand: 'claude',
    binaryPath: '/usr/local/bin/claude',
    isPreinstalled: true,
    estimatedInstallSeconds: 0,
    diskRequirementMb: 50
  },
  {
    id: 'cursor',
    name: 'Cursor',
    tagline: 'AI-first code editor with inline generation, multi-file edits, and chat',
    publisher: 'Anysphere',
    version: '0.42.0',
    category: 'ide',
    status: 'available',
    authModel: 'browser_oauth',
    authProvider: 'Cursor (Anysphere account / Pro)',
    authEnvVars: ['CURSOR_API_KEY'],
    authInstructions: 'Launch Cursor from the Dock and sign in via the embedded Chrome browser with your Cursor credentials.',
    supportedArchitectures: ['x86_64'],
    license: 'Proprietary',
    homepage: 'https://cursor.com',
    docsUrl: 'https://docs.cursor.com',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l7 17 2-7 7-2L4 4z"/></svg>',
    installMethod: 'appimage',
    installCommand: '/opt/agentbox/scripts/install-cursor.sh',
    launchType: 'window',
    launchCommand: 'cursor --no-sandbox',
    binaryPath: '/home/operator/.local/bin/cursor',
    isPreinstalled: false,
    estimatedInstallSeconds: 45,
    diskRequirementMb: 350
  },
  {
    id: 'google-antigravity',
    name: 'Google Antigravity',
    tagline: 'Next-gen agentic development CLI & IDE tools from Google DeepMind',
    publisher: 'Google DeepMind',
    version: '2.4.0',
    category: 'terminal_agent',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'Google AI Studio / Vertex AI',
    authEnvVars: ['GEMINI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'],
    authInstructions: 'Export GEMINI_API_KEY=AIza... in ~/.bashrc or run "agy auth login" to authenticate with Google.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Google Developer License',
    homepage: 'https://deepmind.google/technologies/gemini/',
    docsUrl: 'https://ai.google.dev/docs',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    installMethod: 'npm',
    installCommand: '/opt/agentbox/scripts/install-antigravity.sh',
    launchType: 'terminal',
    launchCommand: 'agy',
    binaryPath: '/home/operator/.local/bin/agy',
    isPreinstalled: false,
    estimatedInstallSeconds: 20,
    diskRequirementMb: 85
  },
  {
    id: 'hermes-agent',
    name: 'Hermes Agent',
    tagline: 'Nous Research autonomous reasoning & tool-use execution agent',
    publisher: 'Nous Research',
    version: '1.2.0',
    category: 'autonomous_agent',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'OpenRouter / Nous Portal / Local Ollama',
    authEnvVars: ['OPENROUTER_API_KEY', 'HERMES_API_BASE'],
    authInstructions: 'Set OPENROUTER_API_KEY in ~/.bashrc or pass custom OpenAI-compatible endpoint to "hermes-agent --api-base".',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Apache 2.0',
    homepage: 'https://nousresearch.com',
    docsUrl: 'https://github.com/NousResearch/Hermes-Function-Calling',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>',
    installMethod: 'pip',
    installCommand: '/home/operator/.venv/bin/pip install hermes-agent',
    launchType: 'terminal',
    launchCommand: 'hermes-agent',
    binaryPath: '/home/operator/.local/bin/hermes-agent',
    isPreinstalled: false,
    estimatedInstallSeconds: 30,
    diskRequirementMb: 110
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    tagline: 'Autonomous web scraping, workflow orchestration, and data extraction agent',
    publisher: 'OpenClaw Project',
    version: '0.8.4',
    category: 'autonomous_agent',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'OpenClaw Cloud / Self-hosted API key',
    authEnvVars: ['OPENCLAW_API_KEY'],
    authInstructions: 'Configure OPENCLAW_API_KEY in ~/.config/openclaw/credentials.json or export in environment.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'MIT',
    homepage: 'https://openclaw.dev',
    docsUrl: 'https://openclaw.dev/docs',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    installMethod: 'pip',
    installCommand: '/opt/agentbox/scripts/install-openclaw.sh',
    launchType: 'terminal',
    launchCommand: 'openclaw',
    binaryPath: '/home/operator/.local/bin/openclaw',
    isPreinstalled: false,
    estimatedInstallSeconds: 25,
    diskRequirementMb: 75
  },
  {
    id: 'grok-tools',
    name: 'Grok CLI & Tools',
    tagline: 'xAI Grok reasoning SDK and interactive prompt execution utilities',
    publisher: 'xAI',
    version: '0.6.1',
    category: 'terminal_agent',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'xAI Developer Console',
    authEnvVars: ['XAI_API_KEY'],
    authInstructions: 'Set XAI_API_KEY in ~/.bashrc or ~/.config/xai/config.json.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Apache 2.0',
    homepage: 'https://x.ai',
    docsUrl: 'https://docs.x.ai',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    installMethod: 'pip',
    installCommand: '/home/operator/.venv/bin/pip install xai-sdk grok-cli',
    launchType: 'terminal',
    launchCommand: 'grok',
    binaryPath: '/home/operator/.local/bin/grok',
    isPreinstalled: false,
    estimatedInstallSeconds: 20,
    diskRequirementMb: 60
  },
  {
    id: 'muse',
    name: 'Muse Autonomous Agent',
    tagline: 'Dynamic multimodal generation and autonomous software sculpting agent',
    publisher: 'Muse AI',
    version: '0.4.0',
    category: 'autonomous_agent',
    status: 'preview',
    statusReason: 'Under active developer preview for Linux environments.',
    authModel: 'byok_api_key',
    authProvider: 'Muse / Custom Model Provider',
    authEnvVars: ['MUSE_API_KEY'],
    authInstructions: 'Set MUSE_API_KEY in ~/.bashrc. Compatible with standard OpenAI/Anthropic gateway endpoints.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Developer Preview',
    homepage: 'https://muse.galx.ai',
    docsUrl: 'https://muse.galx.ai/docs',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>',
    installMethod: 'npm',
    installCommand: '/opt/agentbox/scripts/install-muse.sh',
    launchType: 'terminal',
    launchCommand: 'muse',
    binaryPath: '/home/operator/.local/bin/muse',
    isPreinstalled: false,
    estimatedInstallSeconds: 20,
    diskRequirementMb: 50
  },
  {
    id: 'aider',
    name: 'Aider Chat',
    tagline: 'Pair programming in your terminal, git-aware, multi-file editing assistant',
    publisher: 'Paul Gauthier',
    version: '0.72.0',
    category: 'coding_companion',
    status: 'available',
    authModel: 'byok_api_key',
    authProvider: 'Any LLM Provider (OpenAI, Anthropic, DeepSeek, Google, Groq)',
    authEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY'],
    authInstructions: 'Set any major LLM API key in ~/.bashrc. Aider auto-detects and connects.',
    supportedArchitectures: ['x86_64', 'aarch64'],
    license: 'Apache 2.0',
    homepage: 'https://aider.chat',
    docsUrl: 'https://aider.chat/docs/',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    installMethod: 'pip',
    installCommand: '/home/operator/.venv/bin/pip install aider-chat',
    launchType: 'terminal',
    launchCommand: 'aider',
    binaryPath: '/home/operator/.local/bin/aider',
    isPreinstalled: false,
    estimatedInstallSeconds: 30,
    diskRequirementMb: 140
  },
  {
    id: 'apple-xcode-agent',
    name: 'Apple Xcode Agent',
    tagline: 'Xcode-integrated autonomous coding agent for Apple ecosystem development',
    publisher: 'Apple Inc.',
    version: 'N/A',
    category: 'ide',
    status: 'unavailable',
    statusReason: 'Apple Xcode is strictly proprietary to macOS/Darwin. No native Linux runtime or distribution exists. Compatibility cannot be fabricated.',
    authModel: 'subscription',
    authProvider: 'Apple Developer Account',
    authEnvVars: [],
    authInstructions: 'Not supported on Linux systems.',
    supportedArchitectures: [],
    license: 'Apple Proprietary',
    homepage: 'https://developer.apple.com/xcode/',
    docsUrl: 'https://developer.apple.com/documentation/xcode',
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.84.94-2.91-1 .04-2.15.67-2.82 1.44-.58.67-1.1 1.76-.96 2.81 1.11.09 2.21-.57 2.84-1.34z"/></svg>',
    installMethod: 'bundled',
    launchType: 'terminal',
    launchCommand: '',
    binaryPath: '',
    isPreinstalled: false,
    estimatedInstallSeconds: 0,
    diskRequirementMb: 0
  }
];

export class AgentCatalogService {
  private readonly items = new Map<string, AgentCatalogItem>();

  constructor() {
    for (const item of AGENT_CATALOG) {
      this.items.set(item.id, item);
    }
  }

  getAll(): AgentCatalogItem[] {
    return Array.from(this.items.values());
  }

  getAvailable(): AgentCatalogItem[] {
    return this.getAll().filter(item => item.status === 'available' || item.status === 'preview');
  }

  getById(id: string): AgentCatalogItem | undefined {
    return this.items.get(id);
  }

  validateSelectedAgents(agentIds: string[]): { valid: string[]; invalid: string[]; unavailable: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const unavailable: string[] = [];

    for (const id of agentIds) {
      const item = this.items.get(id);
      if (!item) {
        invalid.push(id);
      } else if (item.status === 'unavailable') {
        unavailable.push(id);
      } else {
        valid.push(id);
      }
    }

    return { valid, invalid, unavailable };
  }
}
