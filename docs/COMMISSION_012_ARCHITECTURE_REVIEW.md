# COMMISSION 012 — ARCHITECTURE REVIEW
## The Invisible Computer: System Architecture, State Machine & Ergonomics

**From:** Deputy Gemini, Engineering Agent  
**To:** MAJO, Leading Executive Chair  
**Authority:** EGG, Founding Custodian  
**Status:** COMPLETE & VERIFIED  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Governing Principle:** *"One computer, multiple independent desktops, shared work, owner-controlled access — with the complexity hidden until it matters."*

---

## 1. Architectural Philosophy

DreamBees AgentBoxes are designed around the concept of **The Invisible Computer**. Instead of treating the cloud container as an ephemeral sandbox, DreamBees treats it as a persistent personal or shared workstation.

```
+-----------------------------------------------------------------------------------------+
|                                    DREAMBEES CLOUD                                      |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   |                        ONE AGENTBOX (VIRTUAL COMPUTER)                          |   |
|   |                                                                                 |   |
|   |   +--------------------------+             +--------------------------+         |   |
|   |   |   OWNER DESKTOP (:0)     |             | COLLABORATOR DESKTOP (:1)|         |   |
|   |   |   User: operator         |             | User: bob                |         |   |
|   |   |   Private Home: chmod 700|             | Private Home: chmod 700  |         |   |
|   |   |   Agent: Claude Code     |             | Agent: OpenAI Codex      |         |   |
|   |   |   Display: Xvfb :0       |             | Display: Xvfb :1         |         |   |
|   |   +------------+-------------+             +------------+-------------+         |   |
|   |                |                                        |                       |   |
|   |                +-------------------+--------------------+                       |   |
|   |                                    |                                            |   |
|   |                                    v                                            |   |
|   |                   +--------------------------------+                            |   |
|   |                   |    SHARED PROJECT WORKSPACE    |                            |   |
|   |                   |    Mount: /home/operator/work   |                            |   |
|   |                   |    Permissions: 2775 (SGID)    |                            |   |
|   |                   |    Group: desktop              |                            |   |
|   |                   |    Git: main branch tracking   |                            |   |
|   |                   +--------------------------------+                            |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
                                         ^
                                         | WebSocket RFB Streams
                        +----------------+----------------+
                        |                                 |
                        v                                 v
               [Owner Web Browser]              [Collaborator Web Browser]
```

---

## 2. Decoupled Storage Architecture

Following the mature pattern established by **GitHub Codespaces**, DreamBees strictly decouples **active compute** from **persistent storage**:

1. **Workspace Volume (`agentbox-ws-<id>`)**:
   - Backs `/home/operator/workspace`.
   - Formatted with POSIX group sticky-bit (`chmod 2775`) and owned by `1000:desktop`.
   - Default umask `002` ensures any file created by any collaborator is immediately readable and writable by other members of the `desktop` group.
   - Initialized with Git on branch `main`.

2. **Personal Home Volumes (`agentbox-home-<id>`)**:
   - Backs `/home/operator` and `/home/<username>`.
   - Strictly permissioned at `chmod 700`.
   - Houses personal AI provider credentials (`~/.claude.json`, `~/.codex/auth.json`, `~/.bashrc`, `~/.gitconfig`).
   - Ensures collaborators can work together on project files without any risk of credential cross-contamination.

3. **Suspension & Retention**:
   - When a computer is suspended, the Docker container and its virtual display processes are stopped, completely releasing CPU and RAM on the host.
   - Persistent volumes remain safely attached and untouched.
   - Compute costs immediately drop to **$0.00/hr**.

---

## 3. Display Streaming Multiplexer Architecture

DreamBees avoids the trap of screen sharing by implementing an independent session multiplexer within the guest container:

- **Display Gateway (`src/gateway/display-gateway.ts`)**:
  - Serves static assets, REST APIs, and bridges WebSocket RFB connections.
  - Dynamically routes incoming connections based on the authenticated member identity:
    * Owner connects to Display `:0` (RFB Port `5900`).
    * Collaborator 1 connects to Display `:1` (RFB Port `5901`).
    * Collaborator N connects to Display `:N` (RFB Port `5900 + N`).
  - Spawns and manages dedicated `Xvfb` and `x11vnc` instances per user via `startMemberDesktopSession`.
  - Enforces origin verification to defend against Cross-Site WebSocket Hijacking (CSWSH).

- **Ergonomic Web Viewer (`src/web/viewer.js`)**:
  - Automatically negotiates high-performance RFB streaming.
  - Bounded exponential backoff reconnection: attempts 5 retries with intervals doubling from 1s to 16s.
  - Minimal top toolbar exposes critical controls without obstructing the desktop workspace.

---

## 4. Formal Lifecycle State Machine

DreamBees enforces an explicit, deterministic state machine with validated transitions:

```
                      +----------------+
                      |    CREATING    |
                      +-------+--------+
                              |
                              v
                      +----------------+
                      |     READY      |
                      +-------+--------+
                              |
                              v
                      +----------------+       Network Drop
                      |    RUNNING     |<-----------------------+
                      +---+----+---+---+                        |
                          |    |   |                            |
          User Inactivity |    |   | Stop/Pause                 |
                          v    |   v                            |
                  +------------+ +-------------+                |
                  | SUSPENDING | | SUSPENDED   |                |
                  +-----+------+ +-----+-------+                |
                        |              |                        |
                        +-------+------+                        |
                                | Resume                        |
                                v                               |
                        +---------------+                       |
                        |   RESUMING    |                       |
                        +-------+-------+                       |
                                |                               |
                                +-------------------------------+
                                |
                  Delete Action |
                                v
                        +---------------+
                        |   DELETING    |
                        +-------+-------+
                                |
                                v
                        +---------------+
                        |    DELETED    |
                        +---------------+
```

### State Transition Specification Table

| From State | To State | Trigger / Event | Preconditions | Postconditions & Invariants |
| :--- | :--- | :--- | :--- | :--- |
| `none` | `creating` | `POST /api/boxes` | Valid tier, agent profile, host capacity check passed. | Job queued, capacity reserved on host. |
| `creating` | `ready` | Driver initialization complete | Container spawned, Xvfb running, Git repo initialized. | Capacity reservation released; machine ready for connection. |
| `ready` | `running` | Owner/Member connects | Active WebSocket connection established. | CPU/RAM active; heartbeat tracking initiated. |
| `running` | `reconnecting` | Client network disconnect | Browser socket drops unexpectedly. | State preserved in container; exponential retry backoff begins. |
| `reconnecting`| `running` | Client socket re-establishes | Valid ticket or member session token verified. | Stream resumed; no duplicate container or session spawned. |
| `running` | `suspending` | Idle timeout or user Pause | Inactivity threshold exceeded or `POST /api/boxes/:id/suspend`. | Member desktop processes signaled; unsaved buffers flushed. |
| `suspending` | `suspended` | Container stop complete | Container state = exited; storage volumes retained. | Compute charges drop to $0.00/hr; persistent volumes intact. |
| `suspended` | `resuming` | User Resume click | `POST /api/boxes/:id/resume`; host capacity re-checked. | Container restarted; active member desktops re-initialized. |
| `resuming` | `running` | Healthcheck passes | Xvfb and x11vnc healthy; RFB ports listening. | State restored; 100% workspace integrity verified. |
| `any` (except deleted) | `deleting` | User Delete action | Deliberate confirmation matching computer name. | Active sessions terminated; container stopped. |
| `deleting` | `deleted` | Teardown complete | Container destroyed; designated persistent volumes purged. | Record marked deleted; compute and storage fully released. |

---

## 5. Transparent Resource & Cost Accounting

DreamBees enforces honest, transparent accounting modeled after **Vercel** and **Railway**:

| Resource Category | State: Running | State: Suspended | Customer Billing Rate |
| :--- | :--- | :--- | :--- |
| **Compute (CPU/RAM)** | Active (2–8 vCPUs, 4–16GB RAM) | Stopped (0 vCPUs, 0 MB RAM) | **$0.05/hr** when running · **$0.00/hr** when paused |
| **Storage (Workspace)** | Retained (Persistent Volume) | Retained (Persistent Volume) | Retained at cost; no hidden container fees |
| **Model Tokens** | Direct BYOK (Anthropic / OpenAI) | Direct BYOK (Anthropic / OpenAI) | **$0.00 markup** (Billed directly to customer's AI account) |

---

## 6. Architecture Review Verdict

The architecture successfully unifies familiar desktop computing metaphors with cloud multi-tenancy. Compute complexity is hidden behind intuitive operations, while state transitions, security boundaries, and costs remain predictable and recoverable.
