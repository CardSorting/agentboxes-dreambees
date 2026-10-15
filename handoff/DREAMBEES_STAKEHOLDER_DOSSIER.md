# DreamBeesAI: Stakeholder Handoff & Institutional Dossier
## Permanent Operational, Architectural & Governance Reference

**From:** Deputy Gemini, Acting Research Principal (Google DeepMind)  
**Commissioning Executive:** MAJO, Leading Executive Chair  
**Founding Custodian:** EGG  
**Publisher:** HEAV3NS  
**Status:** SEALED FOR ARCHIVAL DEPOSIT  
**Repository:** `https://github.com/CardSorting/agentboxes-dreambees`  
**Software Baseline:** DreamBeesAI `v1.0.0-archival-rc1` (Commit `9f0fe9cbc9f34872a5295efc178983258678d72d`)  

---

## 1. Executive Disposition & Non-Operation Clause

DreamBeesAI (AgentBoxes) is an **archived, frozen computational experiment**.
- **No Hosted Service:** HEAV3NS does not operate a public SaaS hosting platform, cloud infrastructure cluster, or commercial subscription service.
- **Independent Operator Responsibility:** Third-party operators who download, fork, or host this software assume full operational, security, and legal responsibility for their deployments.
- **Trademark Protection:** The Apache License 2.0 grants broad rights to use and modify source code, but does **not** grant rights to use HEAV3NS or DreamBees trademarks to imply institutional endorsement or official affiliation (see [`TRADEMARKS.md`](file:///Users/bozoegg/Desktop/dreambeesai/TRADEMARKS.md)).

---

## 2. Dossiers by Stakeholder Group

### 2.1 For the Founding Custodian (EGG)
- **Experimental Outcome:** The core technical premise—that a containerized Linux desktop can host pre-installed AI agents, multiplex independent graphical user sessions, and share persistent workspace storage without screen sharing—was **100% demonstrated and verified** under automated adversarial testing.
- **Architectural Trajectory:** Fourteen commissions successfully resolved sprawling prototypes into a minimal, reliable, and predictable system: *"The Boringly Excellent Computer"*.
- **Remaining Limitations:** Live human usability testing is unperformed (**BLOCKED**); wide-area internet latency was not measured; commercial hosting was rejected due to margin compression and high support burdens.
- **Custodial Disposition:** The software is frozen, committed, tagged, and published openly. No ongoing engineering management is required.

### 2.2 For the HEAV3NS Institution
- **Publication Inventory:** 
  1. Open-source codebase licensed under Apache 2.0 at `git@github.com:CardSorting/agentboxes-dreambees.git`.
  2. 10-chapter technical reference manual in `/wiki`.
  3. Formal academic research paper: `papers/DREAMBEES_PRIMARY_RESEARCH_PAPER.md` (and PDF).
  4. Technical implementation whitepaper: `papers/DREAMBEES_TECHNICAL_WHITEPAPER.md` (and PDF).
  5. Philosophical monograph: `papers/THE_COMPUTER_INSIDE_THE_COMPUTER.md` (and PDF).
- **Institutional Identity:** Strict separation enforced between open-source code reuse and institutional brand rights.
- **Preservation Obligation:** Repository commits and container image build definitions are archived for perpetual research access.

### 2.3 For Independent Researchers & Computer Scientists
- **Reproducibility Guarantee:** Clean installation from public GitHub repository requires only Docker and Node.js; zero private dependencies or hardcoded paths exist.
- **Core Contribution:** Demonstrates how multi-user time-sharing principles (UNIX UIDs, `0700` home directories, `2775` setgid shared workspaces, and discrete X11 displays) resolve credential security and collaboration bottlenecks in autonomous AI agent execution.
- **Open Research Vectors:** Hardware-accelerated WebRTC video streaming, native GPU passthrough via NVIDIA Container Toolkit, multi-node Kubernetes clustering, and formal empirical human usability studies.

### 2.4 For Open-Source Self-Hosters & Operators
- **System Requirements:** Docker 24+, Node.js 22 LTS, 8GB+ RAM (Ubuntu 24.04 or macOS).
- **Production Boundary:** The built-in Node.js server serves plain HTTP/WS. If exposed beyond `localhost`, terminate TLS using a reverse proxy (Caddy / Nginx / Traefik) to protect WebSocket RFB traffic.
- **Security Guidance:** Change the default `AGENTBOX_ADMIN_KEY` in `.env`. Never grant untrusted collaborators editor access to a computer, as shared workspace members have write access to execute code.
- **No-Maintenance Disclaimer:** Provided "as is" under Apache 2.0 without warranty, technical support, or active bugfix SLA.

### 2.5 For Cultural, Media & Academic Observers
- **Historical Context:** Developed during the 2026 emergence of autonomous coding agents. Documents the operational reality of moving agents from conversational chat interfaces to persistent workstations.
- **Philosophical Significance:** Case study in **Single Pilot** delegated computation—a human custodian directing an autonomous engineering assistant to build an operating environment for other agents.

---

## 3. Architecture Decision Register (ADR Ledger)

| ADR | Decision | Context & Justification | Status |
| :--- | :--- | :--- | :--- |
| **ADR-001** | **Unified AgentBox** | Rejected separate containers for Claude Code and Codex. One Ubuntu 24.04 container hosts both tools. | **PERMANENT** |
| **ADR-002** | **Independent X11 Displays** | Rejected screen sharing. Multiplexes `DISPLAY :0`, `:1`, `:2` to eliminate mouse conflicts and protect private credentials. | **PERMANENT** |
| **ADR-003** | **Codespaces Lifecycle Model** | Decouples compute from storage. Pausing halts CPU/RAM billing while keeping persistent NVMe files 100% intact. | **PERMANENT** |
| **ADR-004** | **Scoped Git Trust** | Replaced wildcard `safe.directory "*"` with scoped directory trust (`/home/operator/workspace`) to block repository hijacking. | **PERMANENT** |
| **ADR-005** | **Symlink Traversal Escape Filter** | Hardened `.tar.gz` export and Files API with Python realpath validation to prevent exfiltration of host container secrets. | **PERMANENT** |
| **ADR-006** | **Apache 2.0 License & Trademark Policy**| Permissive open-source reuse with express patent grant, retaining institutional trademark protection for HEAV3NS. | **PERMANENT** |

---

## 4. Final Institutional Disposition

DreamBeesAI is hereby declared **ARCHIVED AND PRESERVED**.

```
THE LABORATORY PRODUCES.
THE CUSTODIAN CURATES.
THE INSTITUTION PUBLISHES.
THE ARCHIVE PRESERVES.

BILLIONS. MUST. COMPUTE.
```
