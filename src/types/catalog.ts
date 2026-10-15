/**
 * Curated Agent Catalog Contracts
 * Covers tool compatibility, installation recipes, authentication models, and licensing.
 */

export type AgentCategory =
  | 'ide'
  | 'terminal_agent'
  | 'autonomous_agent'
  | 'coding_companion'
  | 'browser_agent';

export type AgentStatus = 'available' | 'preview' | 'unavailable';

export type AgentAuthModel =
  | 'byok_api_key'
  | 'browser_oauth'
  | 'device_code'
  | 'subscription';

export interface AgentCatalogItem {
  id: string;
  name: string;
  tagline: string;
  publisher: string;
  version: string;
  category: AgentCategory;
  status: AgentStatus;
  statusReason?: string;
  authModel: AgentAuthModel;
  authProvider: string;
  authEnvVars: string[];
  authInstructions: string;
  supportedArchitectures: ('x86_64' | 'aarch64')[];
  license: string;
  homepage: string;
  docsUrl: string;
  iconSvg: string;
  // Installation & runtime
  installMethod: 'npm' | 'pip' | 'appimage' | 'binary' | 'bundled';
  installCommand?: string;
  launchType: 'terminal' | 'window' | 'browser';
  launchCommand: string;
  binaryPath: string;
  isPreinstalled: boolean;
  estimatedInstallSeconds: number;
  diskRequirementMb: number;
}

export interface AgentInstallationProgress {
  agentId: string;
  phase: 'queued' | 'downloading' | 'installing' | 'verifying' | 'completed' | 'failed';
  message: string;
  percent: number;
  error?: string;
  installedAt?: number;
}
