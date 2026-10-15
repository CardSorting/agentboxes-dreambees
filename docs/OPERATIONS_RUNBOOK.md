# HEAV3NS — ENGINEERING COMMISSION 008 (REVISION II)
## Deliverable 5: Operations Runbook
### DreamBees Managed Agent Infrastructure — The Managed Hive

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008 Revision II — The Managed Hive  
**Operating Model:** Managed IT Services for Agent-Enabled Environments  
**Institutional Doctrine:** *"We manage the computers. Users operate the agents."*  
**Date:** October 2026  

---

## 1. Operational Philosophy & Boundary Rules

DreamBees operates as a managed IT infrastructure provider. Our primary operational duty is to keep the managed workstation healthy, isolated, and accessible.

> **CRITICAL RULE (Commission 008 Section V):**  
> **An agent failure is not automatically an infrastructure failure.**  
> Operators must strictly distinguish between workstation/infrastructure defects (DreamBees responsibility) and agent reasoning/code issues (User responsibility).

---

## 2. Failure Classification Matrix

When an issue is reported or detected, the `DiagnosticClassifier` (`src/provisioning/diagnostic-classifier.ts`) classifies it into one of four operational tiers:

| Tier | Category | Service Owner | Typical Symptoms | Remediation Action |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | `workstation_connectivity` | **DreamBees** | Container crash, Docker daemon disconnect, Xvfb death, RFB bridge 502/409, OOM killer triggered by host limit. | Execute Runbook 1 or 2 (restart desktop, re-create container, verify host bridge). |
| **Tier 2** | `agent_installation_config` | **DreamBees** | Catalog recipe fails, missing system dependencies, corrupted `~/.local/bin` symlink, permission denied in `/opt/agentbox`. | Execute Runbook 3 (re-run installer script, fix catalog recipe, verify file permissions). |
| **Tier 3** | `agent_execution_reasoning` | **User** | LLM API key invalid (401), rate limits exceeded (429), model context window overflow, hallucinations, stuck agent loops. | Refer user to provider documentation. Do not troubleshoot model reasoning. Verify BYOK key in `~/.bashrc`. |
| **Tier 4** | `user_workflow` | **User** | Syntax errors in customer code, missing npm/pip dependencies in project directory, failed tests, unhandled exceptions. | User responsibility. Do not troubleshoot application code. Workstation is healthy. |

---

## 3. Operational Diagnostic Commands

Fleet administrators can query environment health, failure diagnostics, and cost accounting via the unified CLI:

```bash
# 1. View all active workstations across tenants
npm run cli -- list

# 2. View failure diagnostics and categorized root causes for a workstation
npm run cli -- diagnostics <box-id>

# 3. View real-time resource consumption and billable costs
npm run cli -- accounting <box-id>

# 4. View fleet-wide financial accounting summary
npm run cli -- accounting

# 5. Assign a workstation to a specific authorized user
npm run cli -- assign <box-id> <user-id> [user-email]

# 6. Reconcile fleet state and reap orphaned containers
npm run cli -- reconcile
```

---

## 4. Runbook Procedures

### Runbook 1: Remote Desktop Connection Drops or 409 Conflict

**Symptoms:**
- User reports WebSocket connection refused or `409 Conflict`.
- Browser noVNC shows "Server disconnected (code: 1006)".

**Diagnostic Steps:**
1. Check workstation lifecycle state:
   ```bash
   npm run cli -- show <box-id>
   ```
2. If state is `stopped` or `suspended`, the user or policy engine suspended compute. Start the box:
   ```bash
   npm run cli -- start <box-id>
   ```
3. If state is `running`, verify container display processes:
   ```bash
   docker exec agentbox-<ns>-<tenant>-<boxId> pgrep -a x11vnc
   docker exec agentbox-<ns>-<tenant>-<boxId> pgrep -a xfwm4
   ```
4. If `x11vnc` is dead, restart the container:
   ```bash
   npm run cli -- stop <box-id>
   npm run cli -- start <box-id>
   ```

---

### Runbook 2: Automated Spending Limit Reached (Workstation Auto-Suspension)

**Symptoms:**
- Workstation transitions unexpectedly to `suspended`.
- Diagnostics show `failureReason: spending_limit_exceeded`.

**Root Cause:**
The workstation exceeded its configured spending limit (e.g. `$25.00` or `$50.00`). The `ResourceAccountant` triggered the protective safeguard to prevent an infinite infrastructure bill.

**Remediation:**
1. Check current accrued costs:
   ```bash
   npm run cli -- accounting <box-id>
   ```
2. Contact the user or customer billing administrator to authorize a spending limit increase.
3. Once approved, resume the workstation:
   ```bash
   npm run cli -- start <box-id>
   ```
4. Note: Customer persistent files and code in `/home/operator/workspace` are 100% preserved during suspension.

---

### Runbook 3: Agent Tool Installation Failure

**Symptoms:**
- `agentbox install <agent-id>` fails inside desktop.
- API returns 500 on `POST /api/boxes/:id/install`.

**Diagnostic Steps:**
1. Inspect the diagnostic records:
   ```bash
   npm run cli -- diagnostics <box-id>
   ```
2. Check disk space on persistent home volume:
   ```bash
   docker exec agentbox-<ns>-<tenant>-<boxId> df -h /home/operator
   ```
3. If disk space is available, verify outbound network access from container:
   ```bash
   docker exec agentbox-<ns>-<tenant>-<boxId> curl -Is https://registry.npmjs.org
   ```
4. If network is blocked by host firewall, verify Docker bridge routing. If npm/pip registry is down, classify as Tier 2 temporary upstream dependency outage.

---

### Runbook 4: Resetting a Broken Environment While Preserving User Work

**Scenario:**
A customer's agent installed conflicting system packages or corrupted shell configurations, but the customer needs to retain their code repositories in `/home/operator/workspace`.

**Remediation Procedure:**
1. Request an environment reset with storage preservation enabled:
   ```bash
   curl -X POST http://127.0.0.1:3000/api/boxes/<box-id>/reset \
     -H "Content-Type: application/json" \
     -d '{"preserveStorage": true}'
   ```
2. The control plane will:
   - Terminate the corrupted container.
   - Detach the persistent volumes.
   - Re-provision a pristine Linux container from `dreambeesai/agentbox:v1`.
   - Re-attach the existing `/home/operator/workspace` volume intact.
   - Transition workstation to `ready`.

---

### Runbook 5: Docker Network Pool Exhaustion Recovery

**Symptoms:**
- Provisioning jobs fail with: `could not find an available, non-overlapping IPv4 address pool`.

**Root Cause:**
Default Docker daemon bridge pool is limited (~31 networks on local daemon). High churn of test or abandoned boxes may leave uncollected networks.

**Remediation:**
1. Run the autonomous reconciliation cycle:
   ```bash
   npm run cli -- reconcile
   ```
2. Prune unused Docker networks:
   ```bash
   docker network prune -f
   ```
3. Verify available network pool:
   ```bash
   docker network ls | grep agentbox
   ```
