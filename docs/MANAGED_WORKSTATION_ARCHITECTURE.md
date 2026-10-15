# HEAV3NS — ENGINEERING COMMISSION 008 (REVISION II)
## Deliverable 2: Managed Workstation Architecture
### DreamBees Managed Agent Infrastructure — The Managed Hive

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008 Revision II — The Managed Hive  
**Operating Model:** Managed IT Services for Agent-Enabled Environments  
**Institutional Doctrine:** *"We manage the computers. Users operate the agents."*  
**Date:** October 2026  

---

## 1. Architectural Philosophy

DreamBees operates as a **Managed IT Service Provider** for autonomous and assisted software development agents. 

We do not build proprietary frontier models, maintain custom neural architectures, or orchestrate autonomous worker swarms. We provision, configure, monitor, isolate, and decommission high-performance Linux workstations equipped with the industry's existing agent tooling.

```
+-------------------------------------------------------------------------+
|                                  USER                                   |
|               (Directs agents, manages code, supplies BYOK)             |
+-------------------------------------------------------------------------+
                                    |
                                    v HTTPS / WSS
+-------------------------------------------------------------------------+
|                    DREAMBEES ACCESS & GATEWAY LAYER                     |
|    - Single-Use Display Tickets      - Security Headers & CSRF          |
|    - Authenticated Cookie Sessions   - WebSocket-to-RFB TCP Proxy       |
+-------------------------------------------------------------------------+
                                    |
                                    v Docker Socket / Bridge
+-------------------------------------------------------------------------+
|                   MANAGED LINUX AGENTBOX (COMPUTE)                      |
|    - Isolated Linux Container        - XFCE4 / xfwm4 Window Manager     |
|    - Xvfb Virtual Framebuffer (:0)   - x11vnc Local Loopback (:5900)    |
|    - Unprivileged 'operator' User    - Non-Root Cgroup Hardware Limits  |
+-------------------------------------------------------------------------+
        |                                                 |
        v Mount                                           v Execution
+-------------------------------+       +---------------------------------+
|   PERSISTENT STORAGE LAYER    |       |   EXISTING AGENT TOOLING STACK  |
| - /home/operator (Home Vol)   |       | - OpenAI Codex CLI              |
|   (BYOK keys, configs, caches)|       | - Google Antigravity (AGY)      |
| - /home/operator/workspace    |       | - Claude Code, Cursor, Aider    |
|   (Customer Git Repos, Code)  |       | - Hermes Agent, OpenClaw        |
+-------------------------------+       +---------------------------------+
```

---

## 2. Core Architectural Layers

### A. Access Layer
- **Display Gateway (`src/gateway/display-gateway.ts`):** High-throughput HTTP/1.1 and WebSocket server built natively on Node.js standard libraries.
- **Single-Use Display Tickets:** Ephemeral, cryptographically secure 16-byte hex tokens (`issueTicket()`) with a 60-second time-to-live. Tickets are bound to a specific `(tenantId, boxId)` tuple and invalidated upon redemption.
- **Session Cookie Authentication:** Signed HTTP-only session cookies (`box_session`) establish persistent authenticated sessions for browser UI access.
- **RFB WebSocket Bridge:** Direct binary streaming pipe connecting the client's browser (running noVNC) to the container's local VNC server. TCP backpressure is handled via Node stream flow control (`pause()` / `resume()`).
- **Network Ingress Protection:** Container VNC ports (`5900`) are strictly internal to the private Docker bridge and are never published to public host interfaces.

### B. Compute Layer (The AgentBox)
- **Container Sandbox:** Runs from `dreambeesai/agentbox:v1`. Every workstation executes as an unprivileged user (`operator:1000:1000`).
- **Resource Enforcement (Cgroups):**
  - CPU quotas (`cpus: 2 | 4 | 8`) prevent noisy neighbor CPU exhaustion.
  - Memory ceilings (`memory: 4GB | 8GB | 16GB`) with strict OOM killer policies.
  - PIDs limits (`pidsLimit: 512 | 1024 | 2048`) protect against fork bombs.
- **Process Supervisor:** `tini` serves as PID 1, preventing zombie child accumulation caused by long-running agent compiler jobs.
- **Desktop Subsystem:** `Xvfb` creates a headless display at `:0`. `xfwm4` provides native window styling and compositing. `x11vnc` serves the display locally to the gateway bridge.

### C. Storage Layer (Persistent Workspaces)
To guarantee that compute can be terminated or suspended without destroying user work, compute is decoupled from storage:
1. **Home Volume (`agentbox-[ns]-[tenant]-[boxId]-home`):**
   - Mounted at `/home/operator`.
   - Stores shell configurations (`.bashrc`), SSH keys, global tools (`~/.local`), and customer Bring-Your-Own-Key (BYOK) environment variables.
2. **Workspace Volume (`agentbox-[ns]-[tenant]-[boxId]-workspace`):**
   - Mounted at `/home/operator/workspace`.
   - Stores customer source repositories, virtual environments, build artifacts, and output files.
3. **Suspension vs Decommissioning:**
   - **Suspension (`suspend`):** Container compute is stopped and released. Both Docker volumes remain intact on the host storage subsystem. Compute billing stops.
   - **Permanent Decommissioning (`delete`):** Container and both persistent volumes are permanently removed, releasing all host storage.

### D. Management Layer (The Hive Control Plane)
- **State Machine Engine (`src/provisioning/box-manager.ts`):** Implements the explicit 8-stage state machine:
  `REQUESTED -> QUEUED -> PROVISIONING -> READY -> RUNNING -> STOPPED / SUSPENDED -> DECOMMISSIONING -> DELETED`
- **Asynchronous Job Queue (`src/provisioning/job-manager.ts`):** Non-blocking background execution of provisioning, resets, and teardowns with atomic state persistence.
- **Lifecycle Policy Engine (`src/provisioning/lifecycle-policy.ts`):** Autonomous background reconciliation running every 30 seconds to enforce idle timeouts, lease expiries, and orphan container reaping.
- **Resource & Cost Accountant (`src/provisioning/resource-accountant.ts`):** Attributable consumption accounting tracking active compute seconds, idle compute seconds, disk volume hours, and network transfer.
- **Diagnostic Classifier (`src/provisioning/diagnostic-classifier.ts`):** 4-tier failure attribution engine enforcing operational service boundaries.

---

## 3. Operational Security & Isolation Boundaries

| Boundary | Enforcement Mechanism | Security Guarantee |
| :--- | :--- | :--- |
| **Cross-Tenant Compute** | Separate Docker containers with non-root namespaces | Zero process or memory visibility between tenants. |
| **Cross-Tenant Network** | Dedicated Docker bridge networks per AgentBox | Containers cannot communicate with peer workstations. |
| **Host Protection** | Cgroup CPU/RAM/PIDs limits, no privileged mode, no host mounts | User or agent code cannot compromise the host operating system. |
| **Credential Safety** | BYOK secrets reside only inside the customer's private home volume | DreamBees control plane never stores or transmits customer AI provider keys. |
| **Remote Access** | Ephemeral display tickets, WebSocket authentication | No unauthenticated or public VNC access. |
| **Financial Safeguard** | Automated spending limit monitoring and auto-suspend | Workstations cannot exceed customer-approved infrastructure budgets. |

---

## 4. Responsibility Matrix (Section V Service Definition)

To prevent scope creep and align with DreamBees' institutional mandate, operational boundaries are strictly codified:

```
+--------------------------------------------------------------------+
|  FAILURE TIER 1: Workstation & Connectivity Failures               |
|  - Container crash, Docker daemon failure, Xvfb death, RFB drop     |
|  -> RESPONSIBILITY: DREAMBEES (Automated recovery & infrastructure)|
+--------------------------------------------------------------------+
|  FAILURE TIER 2: Agent Installation & Environment Config           |
|  - Catalog install script syntax, ~/.local/bin symlink, OS deps    |
|  -> RESPONSIBILITY: DREAMBEES (Curated catalog maintenance)        |
+--------------------------------------------------------------------+
|  FAILURE TIER 3: Agent Execution & Model Reasoning                 |
|  - LLM API rate limits, provider 401s, hallucination, bad logic    |
|  -> RESPONSIBILITY: USER (BYOK credential, model provider choice)  |
+--------------------------------------------------------------------+
|  FAILURE TIER 4: User Workflow & Application Code                  |
|  - Syntax errors in customer code, failed builds, missing deps     |
|  -> RESPONSIBILITY: USER (Directs agent, verifies output)          |
+--------------------------------------------------------------------+
```
