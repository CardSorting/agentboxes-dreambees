# AgentBoxes: Autonomous Provisioning & Decommissioning
## Engineering Commission 008 Architecture & Operational Guide

> **"The customer requests a box. The infrastructure handles the rest."**  
> **"PROVISION ON DEMAND. PRESERVE WORK BY DEFAULT. RELEASE COMPUTE WHEN IDLE. DECOMMISSION ONLY WITH AUTHORITY. RECOVER WITHOUT DRAMA."**

---

### 1. Executive Summary

Engineering Commission 008 extends the Commission 007 foundation into a fully automated, on-demand environment provisioning service. A customer can obtain, suspend, resume, reset, and permanently decommission an AgentBox without manual host intervention.

---

### 2. Explicit Recoverable State Machine

Every AgentBox strictly adheres to an explicit, recoverable state machine:

```
[Customer Request]
       │
       ▼
  REQUESTED ──► QUEUED ──► PROVISIONING ──► READY ──► RUNNING
                                              │          │
                                              ▼          ▼
                                          SUSPENDED ◄──► STOPPED
                                              │          │
                                              ▼          ▼
                                       DECOMMISSIONING ──► DELETED
```

#### Supported Lifecycle States

| State | Classification | Description | Compute Status | Storage Status |
| :--- | :--- | :--- | :--- | :--- |
| **`REQUESTED`** | Transient | Request received and authenticated; capacity reserved. | Not Started | Unattached |
| **`QUEUED`** | Transient | Job enqueued in durable control plane; awaiting worker slot. | Not Started | Unattached |
| **`PROVISIONING`** | Active | Docker driver creating bridge network, volumes, Xvfb, and agents. | Starting | Initializing |
| **`READY`** | Stable | Desktop initialized, x11vnc verified, display ticket ready for client. | Active | Attached & Persisted |
| **`RUNNING`** | Stable | Active interactive or autonomous customer session connected. | Active | Attached & Persisted |
| **`STOPPED`** | Inactive | Compute stopped gracefully; customer data preserved. | Stopped | Preserved |
| **`SUSPENDED`** | Inactive | Compute stopped due to idle timeout; customer data preserved. | Stopped | Preserved |
| **`EXPIRED`** | Inactive | Rental period ended; compute stopped, data kept during grace period. | Stopped | Retained in Grace Period |
| **`RECOVERING`** | Transient | Automatic crash recovery in progress (bounded retries ≤ 3). | Restarting | Attached & Persisted |
| **`FAILED`** | Terminal/Alert | Provisioning or execution failed; actionable diagnostic saved. | Stopped | Preserved for Diagnostics |
| **`DECOMMISSIONING`** | Transient | Permanent purge authorized; releasing containers, volumes, networks. | Terminating | Purging |
| **`DELETED`** | Terminal | Completely removed from host and ledger; capacity freed. | None | Erased |

---

### 3. Asynchronous Durable Job Control Plane

All lifecycle operations (`provision`, `start`, `resume`, `stop`, `suspend`, `reset`, `delete`) are managed through `JobManager` (`src/provisioning/job-manager.ts`).

- **Durable Persistence**: All job states are atomically journaled to `jobs.json`. Control-plane restarts reload ongoing and completed jobs without losing state.
- **Strict Idempotency**: Repeated requests with the same `(tenantId, idempotencyKey)` return the existing box and job without duplicating containers, networks, or volumes.
- **Stage Progress Tracking**: Every job tracks progress from `0%` to `100%` across discrete operational stages:
  1. `reserving_capacity` (10%) — Hardware validation and host quotas.
  2. `creating_volumes` (25%) — Isolated customer home, workspace volumes, and private bridge network.
  3. `starting_desktop` (50%) — Xvfb virtual display (:0), x11vnc server, and AgentBoxes GTK3 shell.
  4. `installing_agents` (75%) — Selected curated agents pre-installed in persistent storage.
  5. `verifying_health` (95%) — Display readiness and RFB socket validation.
  6. `ready` (100%) — Box marked available for display streaming.

---

### 4. Compute Capacity Management & Host Boundaries

`CapacityManager` (`src/provisioning/capacity-manager.ts`) evaluates all provisioning and resume operations against host hardware boundaries:

- **Hardware Limits**: Evaluates available physical CPU cores (conservative 2.0x development overcommit limit) and RAM (reserving 10% for OS daemon).
- **Hard Quotas**:
  - Global concurrent running boxes limit (default: 10).
  - Maximum per-tenant active boxes quota (default: 5).
  - Maximum total ledger boxes (default: 50).
- **Reservations**: Capacity is reserved at `requested` state and released only when compute terminates or enters suspended/stopped state.
- **Deterministic Rejection**: Requests exceeding capacity are either cleanly queued or rejected with machine-readable error codes (`tenant_quota_exceeded`, `running_limit_reached`, `cpu_capacity_exhausted`, `memory_capacity_exhausted`).

---

### 5. Automated Decommissioning Protocol

Commission 008 distinguishes three distinct customer decommissioning actions:

#### 1. Stop
- Stops the running desktop container.
- All processes receive graceful `SIGTERM` followed by bounded `SIGKILL`.
- **Customer workspace data remains 100% intact.**

#### 2. Reset
- Destroys the container and recreates a pristine execution environment from `dreambeesai/agentbox:v1`.
- **Customer Storage Selection**: Customer explicitly chooses `preserveStorage: true` (retains `/home/operator/workspace` and credentials) or `preserveStorage: false` (complete factory reset).

#### 3. Delete Permanently
- **Explicit Confirmation**: Customer must type the exact box name to confirm.
- Revokes display access tokens and sessions immediately.
- Tears down container and private bridge network.
- Purges persistent Docker volumes (`home` and `workspace`).
- Releases all capacity reservations and deletes ledger entry.

---

### 6. Autonomous Lifecycle Policies & Self-Healing

The `LifecyclePolicyEngine` (`src/provisioning/lifecycle-policy.ts`) runs a periodic reconciliation loop:

- **Idle Compute Suspension**: Boxes idle for longer than `policies.idleTimeoutMinutes` (default: 30m) are automatically suspended to free compute, while customer workspace files remain preserved.
- **Subscription Expiration**: Expired boxes are transitioned to `expired` state, stopping compute while preserving customer storage for a configurable grace period (`policies.expirationGracePeriodHours`, default: 168 hours / 7 days).
- **Crash Recovery & Bounded Retries**: If a container terminates unexpectedly, the system enters `recovering` and attempts autonomous restart. If it crashes repeatedly exceeding `policies.maxRecoveryRetries` (default: 3), it transitions to `failed` with diagnostic details, **preventing infinite restart loops**.
- **Orphaned Docker Resource Cleanup**: Scans Docker for containers, networks, or volumes bearing the `io.dreambeesai.namespace` label that are missing from the ledger, safely purging them to prevent resource leaks.
- **Interrupted Deletion Recovery**: Any box left in `decommissioning` state due to a control plane interruption is automatically finished and purged on reboot.

---

### 7. REST & WebSocket API Reference

#### Endpoints

| Method | Path | Description | Response Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/boxes` | Request new AgentBox (supports `async: true` / `x-async`) | `202 Accepted` / `201 Created` |
| `GET` | `/api/boxes` | List boxes (supports `?tenantId=...`) | `200 OK` |
| `GET` | `/api/boxes/:id` | Get box state and metrics | `200 OK` |
| `POST` | `/api/boxes/:id/start` | Start or resume box | `200 OK` / `202 Accepted` |
| `POST` | `/api/boxes/:id/stop` | Stop running box (preserves storage) | `200 OK` / `202 Accepted` |
| `POST` | `/api/boxes/:id/suspend` | Suspend compute (preserves storage) | `200 OK` / `202 Accepted` |
| `POST` | `/api/boxes/:id/reset` | Reset execution environment (`preserveStorage`) | `202 Accepted` |
| `DELETE` | `/api/boxes/:id` | Permanently delete (`confirmation: box.name`) | `200 OK` |
| `GET` | `/api/jobs` | List control-plane lifecycle jobs | `200 OK` |
| `GET` | `/api/jobs/:id` | Get specific job status and progress (0-100%) | `200 OK` |
| `GET` | `/api/capacity` | Get host compute capacity and quotas | `200 OK` |
| `GET` | `/api/policies` | Get active lifecycle policy settings | `200 OK` |
| `POST` | `/api/reconcile` | Trigger manual lifecycle reconciliation loop | `200 OK` |
| `WS` | `/api/boxes/:id/display` | noVNC RFB display bridge stream | `101 Switching Protocols` |

---

### 8. Verification Matrix (14 Scenarios)

The test suite in `tests/test-autonomous-lifecycle.ts` verifies all 14 scenarios specified in Commission 008 Section X:

| # | Scenario | Test Case | Status |
| :--- | :--- | :--- | :--- |
| **1** | Successful automated provisioning | `requestProvisionJob` progresses 10%→100% to `ready` | **PASS** |
| **2** | Duplicate provisioning requests | Idempotency key returns existing box/job without duplication | **PASS** |
| **3** | Concurrent requests from multiple customers | Multi-tenant concurrency with distinct networks and volumes | **PASS** |
| **4** | Insufficient host capacity | Quotas reject with machine-readable error codes | **PASS** |
| **5** | Provisioning interruption and recovery | Interrupted provisioning resets safely to `stopped` | **PASS** |
| **6** | Container crash and restart | Autonomous restart with bounded retries (fails at attempt 3) | **PASS** |
| **7** | Persistent storage across suspension | Files in `/home/operator/workspace` survive suspend/resume | **PASS** |
| **8** | Subscription expiration | Compute halted, storage retained during grace period | **PASS** |
| **9** | Confirmed permanent deletion | Deletion rejected without matching name; purges when confirmed | **PASS** |
| **10** | Deletion interrupted midway | Interrupted `decommissioning` cleaned up by reconciliation | **PASS** |
| **11** | Orphaned resource reconciliation | Untracked Docker containers/volumes/networks reaped | **PASS** |
| **12** | Tenant isolation during transitions | Tenant B forbidden from operating Tenant A's boxes | **PASS** |
| **13** | Expired and revoked display access | Expired and reused tickets rejected with 403/error | **PASS** |
| **14** | Control-plane restart during operations | Ledger and jobs reloaded without data loss | **PASS** |
