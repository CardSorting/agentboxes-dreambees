/**
 * AgentBoxes Type Definitions & Lifecycle Contracts
 * Implements the explicit state machine defined in Engineering Commission 008:
 * REQUESTED -> QUEUED -> PROVISIONING -> READY -> RUNNING -> STOPPED -> DECOMMISSIONING -> DELETED
 * Plus: FAILED, RECOVERING, SUSPENDED, EXPIRED.
 */

export type BoxTier = 'standard' | 'power' | 'titan';

export interface BoxTierSpec {
  id: BoxTier;
  name: string;
  description: string;
  cpus: number;
  memoryLimit: string;
  memoryBytes: number;
  pidsLimit: number;
  diskQuotaGb: number;
  shmSize: string;
}

export const BOX_TIERS: Record<BoxTier, BoxTierSpec> = {
  standard: {
    id: 'standard',
    name: 'Standard AgentBox',
    description: '2 vCPUs, 4GB RAM — Ideal for lightweight coding agents, CLI runners, and single-task agents.',
    cpus: 2,
    memoryLimit: '4g',
    memoryBytes: 4 * 1024 * 1024 * 1024,
    pidsLimit: 512,
    diskQuotaGb: 20,
    shmSize: '512m'
  },
  power: {
    id: 'power',
    name: 'Power AgentBox',
    description: '4 vCPUs, 8GB RAM — Recommended for full IDE agents (Cursor), heavy compilation, and multi-tool workflows.',
    cpus: 4,
    memoryLimit: '8g',
    memoryBytes: 8 * 1024 * 1024 * 1024,
    pidsLimit: 1024,
    diskQuotaGb: 50,
    shmSize: '1g'
  },
  titan: {
    id: 'titan',
    name: 'Titan AgentBox',
    description: '8 vCPUs, 16GB RAM — High-throughput autonomous multi-agent environments, large context indices, and parallel builds.',
    cpus: 8,
    memoryLimit: '16g',
    memoryBytes: 16 * 1024 * 1024 * 1024,
    pidsLimit: 2048,
    diskQuotaGb: 100,
    shmSize: '2g'
  }
};

export type BoxState =
  | 'requested'
  | 'queued'
  | 'provisioning'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'suspended'
  | 'recovering'
  | 'expired'
  | 'failed'
  | 'decommissioning'
  | 'deleted';

export interface BoxMetrics {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  diskUsageBytes: number;
  pidsCount: number;
  networkRxBytes: number;
  networkTxBytes: number;
  measuredAt: number;
}

export interface BoxLifecycleRecord {
  state: BoxState;
  previousState?: BoxState;
  lastStateChangeAt: number;
  lastActivityAt: number;
  expiresAt?: number;
  recoveryAttempts: number;
  failureReason?: string;
}

export interface WorkstationUserAssignment {
  userId: string;
  userEmail?: string;
  assignedAt: number;
}

export type FailureCategory =
  | 'workstation_connectivity'     // 1. Workstation or connectivity failure (DreamBees owns)
  | 'agent_installation_config'   // 2. Agent installation or configuration failure (DreamBees owns)
  | 'agent_execution_reasoning'    // 3. Agent execution or reasoning failure (User owns)
  | 'user_workflow';               // 4. User workflow or code defect (User owns)

export interface DiagnosticRecord {
  id: string;
  timestamp: number;
  category: FailureCategory;
  summary: string;
  details?: string;
  remediation?: string;
  serviceOwner: 'dreambees' | 'user';
}

export interface BoxResourceAccounting {
  boxId: string;
  tenantId: string;
  tier: BoxTier;
  createdAt: number;
  provisioningDurationMs: number;
  activeComputeSeconds: number;
  idleComputeSeconds: number;
  lastStateChangeAt: number;
  currentState: BoxState;
  
  // Storage & Memory
  allocatedMemoryGiB: number;
  persistentStorageGiB: number;
  storageDurationHours: number;
  
  // Network
  networkRxBytes: number;
  networkTxBytes: number;
  
  // Billing & Cost Attribution
  rates: {
    computePerHour: number;
    idleComputePerHour: number;
    storagePerGiBMonth: number;
    networkPerGiB: number;
  };
  costs: {
    activeComputeCost: number;
    idleComputeCost: number;
    storageCost: number;
    networkCost: number;
    totalCost: number;
  };
  spendingLimit?: number;
  spendingLimitReached?: boolean;
}

export interface AgentBox {
  id: string;
  tenantId: string;
  name: string;
  tier: BoxTier;
  state: BoxState;
  lifecycle: BoxLifecycleRecord;
  installedAgents: string[];
  createdAt: number;
  updatedAt: number;
  containerId?: string;
  metrics?: BoxMetrics;
  error?: string;
  idempotencyKey?: string;
  assignedUser?: WorkstationUserAssignment;
  profileId?: string;
  accounting?: BoxResourceAccounting;
  diagnostics?: DiagnosticRecord[];
  members?: BoxMember[];
}

export type MemberRole = 'owner' | 'editor' | 'viewer';
export type MemberStatus = 'active' | 'revoked';

export interface BoxMember {
  userId: string;
  username: string;
  displayName?: string;
  email?: string;
  role: MemberRole;
  displayNumber: number;
  status: MemberStatus;
  invitedAt: number;
  expiresAt?: number;
  lastActiveAt?: number;
  sessionToken?: string;
}

export interface InviteMemberRequest {
  userId: string;
  username: string;
  displayName?: string;
  email?: string;
  role?: MemberRole;
  expiresAt?: number;
}

export interface RevokeMemberRequest {
  userId: string;
  reason?: string;
}

export interface CreateBoxRequest {
  id?: string;
  name: string;
  tier?: BoxTier;
  agents?: string[];
  tenantId?: string;
  idempotencyKey?: string;
  rentalHours?: number;
  idleTimeoutMinutes?: number;
  assignedUser?: { userId: string; userEmail?: string };
  profileId?: string;
  spendingLimit?: number;
  async?: boolean;
}

export interface ResetBoxRequest {
  preserveStorage?: boolean;
}

export interface DeleteBoxRequest {
  confirmation: string;
}

export interface BoxSessionTicket {
  ticket: string;
  boxId: string;
  tenantId: string;
  expiresAt: number;
  createdAt: number;
}

export interface BoxContainerRecord {
  id: string;
  containerId: string;
  running: boolean;
  healthy: boolean;
  status: string;
}

export type JobOperationType =
  | 'provision'
  | 'start'
  | 'stop'
  | 'suspend'
  | 'resume'
  | 'reset'
  | 'delete';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface LifecycleJob {
  id: string;
  boxId: string;
  tenantId: string;
  operation: JobOperationType;
  status: JobStatus;
  progress: number;
  stage: string;
  stageMessage: string;
  createdAt: number;
  startedAt?: number;
  updatedAt: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: {
    message: string;
    code: string;
    recoverable: boolean;
  };
  outcome?: any;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface CapacitySnapshot {
  hostCpuCount: number;
  hostTotalMemoryBytes: number;
  hostFreeMemoryBytes: number;
  allocatedCpus: number;
  allocatedMemoryBytes: number;
  availableCpus: number;
  availableMemoryBytes: number;
  activeReservations: number;
  runningBoxCount: number;
  maxRunningBoxes: number;
  totalBoxCount: number;
  maxTotalBoxes: number;
  tierAvailability: Record<BoxTier, boolean>;
}
