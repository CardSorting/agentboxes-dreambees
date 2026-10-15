/**
 * DreamBeesAI AgentBoxes Configuration
 * Commission 007 & 008 Configuration Parameters & Lifecycle Policies
 */
import path from 'node:path';
import os from 'node:os';

export interface LifecyclePolicyConfig {
  idleTimeoutMinutes: number;
  provisioningTimeoutSeconds: number;
  maxRecoveryRetries: number;
  expirationGracePeriodHours: number;
  reconcileIntervalMs: number;
  maxConcurrentJobs: number;
  maxBoxesPerTenant: number;
}

export interface CostRateConfig {
  standardComputePerHour: number;
  powerComputePerHour: number;
  titanComputePerHour: number;
  idleComputePerHour: number;
  storagePerGiBMonth: number;
  networkPerGiB: number;
  defaultSpendingLimit: number;
}

export interface AppConfig {
  port: number;
  host: string;
  dataDir: string;
  boxesFile: string;
  jobsFile: string;
  dockerNamespace: string;
  baseImage: string;
  seccompPath: string;
  maxRunningBoxes: number;
  maxTotalBoxes: number;
  sessionTtlSeconds: number;
  adminApiKey: string;
  policies: LifecyclePolicyConfig;
  rates: CostRateConfig;
}

const dataDir = process.env.AGENTBOX_DATA_DIR || path.join(os.homedir(), '.dreambeesai');

export const config: AppConfig = {
  port: parseInt(process.env.AGENTBOX_PORT || process.env.PORT || '3030', 10),
  host: process.env.AGENTBOX_HOST || '127.0.0.1',
  dataDir,
  boxesFile: path.join(dataDir, 'boxes.json'),
  jobsFile: path.join(dataDir, 'jobs.json'),
  dockerNamespace: process.env.AGENTBOX_NAMESPACE || 'agentbox-prod',
  baseImage: process.env.AGENTBOX_IMAGE || 'dreambeesai/agentbox:v1',
  seccompPath: path.resolve(process.cwd(), 'desktop-image/seccomp.json'),
  maxRunningBoxes: parseInt(process.env.AGENTBOX_MAX_RUNNING || '10', 10),
  maxTotalBoxes: parseInt(process.env.AGENTBOX_MAX_TOTAL || '50', 10),
  sessionTtlSeconds: parseInt(process.env.AGENTBOX_SESSION_TTL || '86400', 10), // 24 hours
  adminApiKey: process.env.AGENTBOX_ADMIN_KEY || 'agentbox_dev_insecure_key',
  policies: {
    idleTimeoutMinutes: parseInt(process.env.AGENTBOX_IDLE_TIMEOUT_MINUTES || '30', 10),
    provisioningTimeoutSeconds: parseInt(process.env.AGENTBOX_PROVISIONING_TIMEOUT_SECONDS || '90', 10),
    maxRecoveryRetries: parseInt(process.env.AGENTBOX_MAX_RECOVERY_RETRIES || '3', 10),
    expirationGracePeriodHours: parseInt(process.env.AGENTBOX_GRACE_PERIOD_HOURS || '168', 10), // 7 days
    reconcileIntervalMs: parseInt(process.env.AGENTBOX_RECONCILE_INTERVAL_MS || '15000', 10),
    maxConcurrentJobs: parseInt(process.env.AGENTBOX_MAX_CONCURRENT_JOBS || '3', 10),
    maxBoxesPerTenant: parseInt(process.env.AGENTBOX_MAX_PER_TENANT || '5', 10)
  },
  rates: {
    standardComputePerHour: parseFloat(process.env.AGENTBOX_RATE_STANDARD || '0.05'),
    powerComputePerHour: parseFloat(process.env.AGENTBOX_RATE_POWER || '0.10'),
    titanComputePerHour: parseFloat(process.env.AGENTBOX_RATE_TITAN || '0.20'),
    idleComputePerHour: parseFloat(process.env.AGENTBOX_RATE_IDLE || '0.01'),
    storagePerGiBMonth: parseFloat(process.env.AGENTBOX_RATE_STORAGE || '0.10'),
    networkPerGiB: parseFloat(process.env.AGENTBOX_RATE_NETWORK || '0.01'),
    defaultSpendingLimit: parseFloat(process.env.AGENTBOX_DEFAULT_SPEND_LIMIT || '50.00')
  }
};
