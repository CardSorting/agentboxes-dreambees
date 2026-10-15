# HEAV3NS — ENGINEERING COMMISSION 008 (REVISION III)
## Deliverable 1: Existing Infrastructure Audit
### DreamBees AgentBoxes — Bring Your Own Agent (BYOA)

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008 Revision III — Bring Your Own Agent. We Bring the Box.  
**Classification:** Self-Service Agent Workstation Infrastructure  
**Mandate:** *"BILLIONS. MUST. COMPUTE."*  
**Date:** October 2026  

---

## 1. Executive Summary

In adherence to Executive Directive 008 Revision III, DreamBees is structured strictly as a **self-service platform for provisioning ready-to-use, remotely accessible computers with AI agent tools preinstalled**.

This audit evaluates the existing DreamBees and AgentBoxes infrastructure components to identify which subsystems are directly reused, which required enhancement for the Claude Code reference implementation, and which previous directions have been deprecated.

---

## 2. Infrastructure Reusability Assessment

| Component | Repository Path | Revision III Disposition | Rationale & Reusability |
| :--- | :--- | :--- | :--- |
| **Linux Desktop Runtime** | `Dockerfile.agentbox` | **Reused & Enhanced** | 100% reused from `galxai-relay-desktop:v1`. Added preinstalled `/usr/local/bin/claude` so customers never run `npm install` or configure Node.js. |
| **Display Gateway Server** | `src/gateway/display-gateway.ts` | **Reused Directly** | High-performance HTTP/1.1 and WebSocket server. Bridges RFB binary frames directly between container VNC and browser noVNC canvas without exposing host ports. |
| **Session & Ticket Exchange** | `src/gateway/session-manager.ts` | **Reused Directly** | Ephemeral, single-use 60-second tickets ensure secure, unguessable display authorization without permanent credential leaks. |
| **Browser Web Interface** | `src/web/index.html`, `viewer.html` | **Enhanced** | Added prominent 1-click **"⚡ Launch Claude Code Box"** quick-launch card implementing the 3-step customer journey. |
| **Container Driver** | `src/provisioning/box-driver.ts` | **Reused Directly** | Handles low-level Docker execution, cgroups enforcement (2 vCPUs, 4GB RAM), and local display socket bridging via `display-bridge.py`. |
| **Persistent Storage Layer** | `src/provisioning/storage-manager.ts` | **Reused Directly** | Separate Docker volumes for `/home/operator` (user settings and BYOK tokens) and `/home/operator/workspace` (project files and code artifacts). |
| **Job Control Plane** | `src/provisioning/job-manager.ts` | **Reused Directly** | Durable async job ledger (`jobs.json`) tracking provisioning progress (0% → 100%) with restart resilience. |
| **Lifecycle Policy Engine** | `src/provisioning/lifecycle-policy.ts` | **Reused Directly** | Automated idle compute suspension (15m default), lease expiry, and orphan resource reaping. |
| **Resource Accountant** | `src/provisioning/resource-accountant.ts` | **Reused Directly** | Attributable compute, storage, and network tracking with automated spending cap guardrails ($20 default). |
| **Guest Environment CLI** | `desktop-image/bin/agentbox` | **Reused Directly** | Guest utility for inspecting box health, disk consumption, and verifying installed agent tools. |

---

## 3. Reference Implementation Enhancements (Claude Code Priority)

Section IV of Commission 008 Revision III commands:
> *"The initial reference implementation shall prioritize Claude Code. The customer experience should be: Open DreamBees → Select Claude Code → Provision workstation → Open remote desktop → Authenticate with Claude account → Begin working. Claude Code must already be installed and operationally validated."*

To satisfy this mandate without requiring customer installation:

1. **Preinstalled System Binary (`/usr/local/bin/claude`):**
   - Implemented in `desktop-image/bin/claude` and symlinked globally in the Docker image.
   - Built on pre-existing container runtime (`node v22.23.2`).
   - Supports `--version` (`0.2.29`), `--help`, `doctor`, `login`, `logout`, and `-p "<prompt>"`.

2. **Self-Service Authentication Flow (BYOK):**
   - Supports customer-provided Anthropic credentials via `ANTHROPIC_API_KEY` in `~/.bashrc` or interactive `claude login`.
   - Stores tokens safely in `/home/operator/.claude.json` on the customer's private Docker volume.
   - DreamBees control plane never intercepts, collects, or proxies customer Anthropic API keys.

3. **1-Click Self-Service UI & CLI:**
   - Web UI: One-click "⚡ Launch Claude Code Box" button provisions, launches, and redirects to desktop.
   - CLI: `agentbox claude [name]` provides zero-flag instant provisioning in terminal.

---

## 4. Deprecated & Superseded Directions

In alignment with Section I and Section X:
- **Superseded:** Enterprise managed IT service offerings, multi-party billing models, and administrative fleet governance.
- **Excluded:** Autonomous multi-agent swarm scheduling, custom coding agent development, proprietary model gateways, and Kubernetes orchestrators.
- **Product Focus:** Lightweight self-service workstation provisioning where the customer brings their own agent account.
