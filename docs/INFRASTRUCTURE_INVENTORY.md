# HEAV3NS — ENGINEERING COMMISSION 008 (REVISION II)
## Deliverable 1: Infrastructure Inventory
### DreamBees Managed Agent Infrastructure — The Managed Hive

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008 Revision II — The Managed Hive  
**Operating Model:** Managed IT Services for Agent-Enabled Environments  
**Institutional Doctrine:** *"We manage the computers. Users operate the agents."*  
**Date:** October 2026  

---

## 1. Executive Summary

In adherence to Commission 008 Revision II, DreamBeesAI operates strictly as a managed IT infrastructure provider. DreamBees provisions, configures, isolates, secures, monitors, accounts for, and decommissions managed Linux workstations (AgentBoxes). We do not build proprietary frontier models, compete with agent research labs, or construct sprawling hyperscaler platforms.

This document registers the complete physical and logical infrastructure components of the DreamBees Managed Hive.

---

## 2. Control Plane & Management Modules

All management components reside in `/Users/bozoegg/Desktop/dreambeesai/src` and run as a lightweight, single-process Node.js/TypeScript daemon without requiring Kubernetes or external distributed orchestrators.

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| **Display & Session Gateway** | `src/gateway/display-gateway.ts` | Multi-tenant HTTP API, single-use ticket exchange, WebSocket-to-RFB TCP display bridge, rate limiting, and security headers. |
| **AgentBox Manager** | `src/provisioning/box-manager.ts` | Workstation lifecycle coordination, user assignment, operation mutex locks, job pipeline triggers, state ledger persistence (`boxes.json`). |
| **Job Control Plane** | `src/provisioning/job-manager.ts` | Asynchronous task queue, idempotency enforcement, step-by-step progress tracking (0–100%), fault-tolerant recovery (`jobs.json`). |
| **Lifecycle Policy Engine** | `src/provisioning/lifecycle-policy.ts` | Background reconciliation loop (every 30s), idle timeout enforcement (15 min default), max lease expiration, orphan container reaping, spending limit checks. |
| **Resource & Cost Accountant** | `src/provisioning/resource-accountant.ts` | Real-time tracking of active compute seconds, idle compute seconds, volume disk hours, and billable network egress. Automated spending limit suspension guardrails. |
| **Diagnostic Classifier** | `src/provisioning/diagnostic-classifier.ts` | Automated 4-tier failure classification engine enforcing strict service-boundary responsibility (`dreambees` vs `user`). |
| **Capacity Manager** | `src/provisioning/capacity-manager.ts` | Host-level concurrency throttling (`maxRunningBoxes: 5`, `maxTotalBoxes: 10`), CPU/RAM reservation tracking, queuing logic. |
| **Storage & Volume Manager** | `src/provisioning/storage-manager.ts` | Deterministic named Docker volumes for `/home/operator` (persistent settings/BYOK credentials) and `/home/operator/workspace` (user project artifacts). |
| **Container Driver** | `src/provisioning/box-driver.ts` | Low-level Docker daemon interface: container creation, start/stop/pause, exec, metrics sampling via Docker API socket, RFB stream bridging. |
| **Agent Catalog Service** | `src/catalog/agent-catalog.ts` | Metadata registry of approved, curated agent tools with installation methods, categories, and binary launchers. |
| **Agent Installer Engine** | `src/catalog/installer.ts` | User-space non-root installation recipes executed directly into persistent volumes (`~/.local/bin`), eliminating image rebuilding. |
| **CLI Administration Tool** | `src/cli/agentboxes-cli.ts` | Fleet administrator and operator CLI (`agentbox create`, `start`, `stop`, `suspend`, `accounting`, `diagnostics`, `assign`). |

---

## 3. Workstation Hardware Tier Specifications

Workstations are provisioned with strict cgroup resource constraints to guarantee polite host multi-tenancy and prevent runaway resource consumption:

| Tier | vCPUs | RAM Limit | PIDs Limit | Disk Quota | Shared Memory (`/dev/shm`) | Intended Workload |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Standard** | 2 | 4 GB | 512 | 20 GB | 512 MB | Lightweight CLI agents, terminal coders (Codex, Aider), single-task scripts. |
| **Power** | 4 | 8 GB | 1024 | 50 GB | 1 GB | Full IDEs (Cursor), multi-file compilation, parallel agent workflows. |
| **Titan** | 8 | 16 GB | 2048 | 100 GB | 2 GB | Autonomous multi-agent hives, heavy test suites, large context embeddings. |

---

## 4. Linux Desktop Base Image (`dreambeesai/agentbox:v1`)

The workstation runtime is built on an approved, hardened Debian/Ubuntu-based container image:

- **Base Image:** `dreambeesai/agentbox:v1` (derived from `galxai-relay-desktop:v1`).
- **Display Server:** Virtual Framebuffer (`Xvfb`) running at `:0`, 1280x800x24 truecolor default resolution.
- **Window Manager:** Lightweight XFCE4 Window Manager (`xfwm4`) with compositing, fast repaint, and low idle CPU footprint (< 0.5% CPU when idle).
- **VNC Bridge:** `x11vnc` bound strictly to loopback (`127.0.0.1:5900`), protected behind the host gateway's authenticated RFB WebSocket bridge.
- **Init System:** `tini` (`/usr/bin/tini`) ensuring clean process reaping and zombie prevention.
- **Operator Account:** Non-root user `operator` (`uid: 1000`, `gid: 1000`). Root escalation is forbidden.
- **Healthcheck:** Periodic probe validating `/tmp/desktop-ready`, `xfwm4` process, `x11vnc` socket, and `xdpyinfo`.

### Guest OS Filesystem Hierarchy
```
/opt/agentbox/
├── bin/
│   └── agentbox            # Guest CLI (status, catalog, install, BYOK verify)
├── open-app                # X11 desktop application launcher
├── launch-app              # Low-level application spawner
├── session.sh              # Session monitor and heartbeat broadcaster
└── start.sh                # Main container initialization entrypoint

/home/operator/ (Mounted Persistent Docker Volume)
├── .bashrc                 # Operator profile & customer BYOK environment variables
├── .local/
│   ├── bin/                # Agent binaries installed without root permissions
│   └── share/              # Agent support libraries and runtime caches
└── workspace/ (Mounted Persistent Docker Volume)
    └── [Customer Projects, Git Repositories, Code Artifacts]
```

---

## 5. Curated Agent Tooling Stack

DreamBees treats agents as applications installed on managed workstations, not as core platform abstractions. Agents run in user space using the customer's own Bring-Your-Own-Key (BYOK) provider credentials.

| Tool Identifier | Agent Name | Category | Primary Binary | Installation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `openai-codex` | OpenAI Codex CLI | Autonomous Agent | `codex` | Bundled in base image |
| `google-antigravity` | Google Antigravity (AGY) | Autonomous Agent | `agy` | Zero-root script to `~/.local/bin/agy` |
| `claude-code` | Claude Code (Anthropic) | Coding Companion | `claude` | User-space npm global package |
| `cursor` | Cursor Editor & Agent | Graphical IDE | `cursor` | Electron app launcher / Web preview |
| `hermes-agent` | Hermes Agent (Nous Research) | Autonomous Agent | `hermes-agent` | Isolated Python 3 venv (`~/.venv`) |
| `openclaw` | OpenClaw | Coding Companion | `openclaw` | Isolated Python 3 venv (`~/.venv`) |
| `grok-tools` | Grok Tools (xAI) | Terminal Agent | `grok` | Isolated Python 3 venv (`~/.venv`) |
| `aider` | Aider Chat | Coding Companion | `aider` | Isolated Python 3 venv (`~/.venv`) |
| `muse` | Muse Code Orchestrator | Coding Companion | `muse` | Zero-root script to `~/.local/bin/muse` |

---

## 6. Persistence & Network Topology

Each provisioned workstation receives dedicated storage and network isolation:

1. **Private Docker Bridge:** `agentbox-[namespace]-[tenantId]-[boxId]-net` (enforces strict cross-workstation network isolation; AgentBoxes cannot communicate directly with peer boxes).
2. **Operator Home Volume:** `agentbox-[namespace]-[tenantId]-[boxId]-home` (stores user shells, configuration, SSH keys, agent caches, and BYOK secrets).
3. **Operator Workspace Volume:** `agentbox-[namespace]-[tenantId]-[boxId]-workspace` (stores code repositories, compiled artifacts, and user deliverables).
4. **Suspension Decoupling:** During a `suspend` operation, container compute is halted and removed, eliminating CPU and RAM consumption. Persistent volumes remain safely attached to the storage layer, ready for instant resume.
