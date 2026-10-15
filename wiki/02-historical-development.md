# 02 — Historical Development
## Chronology of Commissions 008 through 013

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. The Evolutionary Arc

The development of DreamBeesAI progressed through fourteen intensive engineering commissions. The project began as a broad exploration of autonomous agent swarms and managed IT infrastructure before converging onto a singular, disciplined thesis: **a familiar, multi-user computer with AI tools preinstalled**.

```
┌────────────────────────────────────────────────────────────────────────┐
│  COMMISSION 001–007: Managed IT & Autonomous Swarms (Superseded)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 008: AgentBoxes Doctrine Scaffolding                       │
│  "Bring Your Own Agent. We Bring the Box."                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 009: The Unified AgentBox (Amendment I)                   │
│  Single computer hosting both Claude Code & OpenAI Codex               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 010: Independent Multiplayer Desktops (Amendment I)        │
│  Eliminated screen sharing; dedicated X11 displays (:0, :1..N)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 011: Consolidation & Codespaces Lifecycle Model            │
│  Decoupled active compute from retained persistent storage             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 012: The Invisible Computer                                │
│  Consumer interaction patterns (macOS, Windows, Google Drive, Figma)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 013: The Boringly Excellent Computer                       │
│  Adversarial hardening, scoped Git trust, symlink defenses & honesty   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  COMMISSION 014: Archival Preservation & Project Freeze                │
│  Open-source publication under Apache 2.0; documentation archive       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chronological Milestones

### Commission 008 (Revisions I–VII) — The AgentBoxes Mandate
- **The Turning Point:** Founding Custodian EGG dissolved earlier speculative directions around managed IT services and enterprise agent swarms. The mandate was codified: *Self-service workstation infrastructure. Billions must compute.*
- **Core Architecture:** Built the initial Docker provisioning engine (`DockerBoxDriver`), persistent dual-volume binding (`home` and `workspace`), cgroup resource governance, and the noVNC/WebSocket display bridge.
- **Verification Audit:** Conducted seven verification sub-audits validating Claude Code execution, BYOA credential isolation, and automated container reconciliation.

### Commission 009 (Amendment I) — The Unified AgentBox
- **Executive Correction:** Initial proposals mistakenly considered provisioning separate boxes for Claude Code and OpenAI Codex. Executive Chair MAJO issued Amendment I: *One box. Multiple agents.*
- **Outcome:** A unified Linux desktop image containing both `@anthropic-ai/claude-code` and `@openai/codex` pre-baked into `/usr/local/bin`, sharing a common POSIX workspace directory (`/home/operator/workspace`).

### Commission 010 (Amendment I) — Independent Multiplayer Sessions
- **Executive Correction:** Early multiplayer ideas drifted toward screen sharing. Custodian EGG and MAJO firmly corrected the design: *Multiplayer is not screen sharing; it is a multi-user computer.*
- **Outcome:** Implemented discrete virtual X11 display multiplexing over RFB. The primary owner connects to Display `:0` (RFB port 5900), while invited collaborators connect to dedicated personal displays (`:1` on port 5901, `:2` on port 5902). Each collaborator has their own window manager, terminal shell, and private home directory.

### Commission 011 — Consolidation & Codespaces Lifecycle
- **Mission:** Streamline the sprawling feature set into one coherent computing experience.
- **Outcome:** Codified the GitHub Codespaces lifecycle model. Pausing an AgentBox drops active compute charges to $0.00/hr while keeping all code, branches, and Docker volumes intact. Resuming the box restores the container in < 2 seconds with 100% file persistence.

### Commission 012 — The Invisible Computer
- **Mission:** Eliminate infrastructure vocabulary ("containers", "bridges", "subnets") in favor of familiar computing paradigms drawn from macOS, Windows, Google Drive, Figma, and Kasm Workspaces.
- **Outcome:** Re-architected the Web UI into a clean two-level hierarchy (`My Computers` ➔ `Inside a Computer`). Implemented 1-click desktop launching, an interactive file tree with Git branch tracking, and the Google Drive sharing model (Owner vs. Editor roles).

### Commission 013 — The Boringly Excellent Computer
- **Mission:** Adversarial refinement commission. Test whether familiarity survives actual concurrent multi-user execution, hostile symlink traversal, network exhaustion, and resource contention.
- **Outcome:**
  - Hardened Git security: replaced wildcard `safe.directory "*"` with scoped directory trust.
  - Hardened file systems: eliminated symlink traversal vulnerabilities in both the Files API and `.tar.gz` export.
  - Implemented 24-hour invitation TTLs, token rotation endpoints, and instant WebSocket termination upon revocation.
  - Self-healing Docker storage: auto-recovers from Docker subnet address pool exhaustion.
  - Honest economics: replaced misleading "$0.00/hr total" claims with itemized accounting ($0.01/hr idle reserve + $0.15/GiB-month storage).

### Archival Commission 014 — The Final Preservation
- **Mission:** Project freeze, comprehensive technical wiki, public README rewrite, open-source licensing preparation (Apache 2.0), security sanitization, and release candidate tag (`v1.0.0-archival-rc1`).
