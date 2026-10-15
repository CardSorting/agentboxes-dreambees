# 10 — Archival Record
## Architecture Decisions, Superseded Designs & Institutional Provenance

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. Architectural Decision Records (ADRs)

| ADR ID | Decision Summary | Alternatives Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **ADR-001** | **Unified Container Image** | Separate Claude Code vs. Codex images | Developers use multiple agents on the same codebase; one unified image avoids duplicate storage and complex inter-box synchronization. |
| **ADR-002** | **Independent X11 Displays** | Screen sharing / shared mouse VNC | Prevents collaborator cursor conflicts and keeps private credentials and browser cookies strictly isolated. |
| **ADR-003** | **Decoupled Lifecycle (Codespaces)** | Ephemeral containers with lost state | Pausing compute stops CPU billing while persistent NVMe volumes preserve uncommitted edits and Git branches. |
| **ADR-004** | **In-Browser RFB Canvas (noVNC)** | WebRTC video streams or RDP | RFB-over-WebSocket provides direct binary fidelity without high encode latency or complicated WebRTC ICE/STUN traversal. |
| **ADR-005** | **Scoped Git Trust** | Global `safe.directory "*"` | Prevents untrusted multi-user repository execution; limits trust strictly to `/home/operator/workspace`. |
| **ADR-006** | **Apache 2.0 Open Source License** | AGPLv3, MIT, Proprietary | Provides broad permissive reuse and explicit patent protection while retaining institutional trademark rights under HEAV3NS. |

---

## 2. Superseded Architectures & Historical Dead Ends

Throughout the experiment, several architectural directions were explored, tested, and decisively rejected:

1. **Managed IT & Enterprise Fleets (Commissions 001–007):**
   - *Exploration:* Provisioning fleets of autonomous worker agents managed by centralized AI orchestrators.
   - *Rejection Reason:* Over-engineered, non-deterministic, and impossible for ordinary developers to control. Superseded by the direct *AgentBoxes* self-service doctrine.
2. **Dedicated Per-Agent Workstations (Early Commission 009):**
   - *Exploration:* Spinning up separate Linux boxes for Claude Code and OpenAI Codex.
   - *Rejection Reason:* Contradicted the simplicity of a single personal computer. Corrected in Amendment I.
3. **Screen-Sharing Collaboration (Early Commission 010):**
   - *Exploration:* Multiplexing multiple browser viewports to a single X11 display.
   - *Rejection Reason:* Caused severe mouse-cursor contention and leaked private credentials. Corrected in Amendment I with independent virtual displays (`:0`, `:1`, `:2`).
4. **Naïve Symlink Tarball Exports (Pre-013):**
   - *Exploration:* Using `tar -chzf` to follow symlinks during export.
   - *Rejection Reason:* Exposed `/etc/shadow` and private home directories. Remediated in Commission 013.B with realpath path filtering.

---

## 3. Known Unfinished Work & Future Research Vectors

For independent researchers and engineering teams forking this repository, the following areas remain open for exploration:

1. **Hardware-Accelerated WebRTC Streaming:** Replacing RFB-over-WebSocket with WebRTC H.264/AV1 streaming could reduce client CPU usage on low-power mobile devices.
2. **Native GPU Passthrough:** Integrating the NVIDIA Container Toolkit to allow local LLM inference (e.g. Ollama, vLLM) directly inside the AgentBox container.
3. **Multi-Host Clustering:** The current implementation operates on a single Docker host. Adapting the driver to Nomad or Kubernetes would enable multi-node horizontal scaling.
4. **Live Human Usability Trials:** The formal five-person usability protocol ([`docs/COMMISSION_013_ACCEPTANCE_EVIDENCE.md`](file:///Users/bozoegg/Desktop/dreambeesai/docs/COMMISSION_013_ACCEPTANCE_EVIDENCE.md)) is prepared but awaits execution with live human developers.

---

## 4. Final Freeze Declaration

Under **HEAV3NS Archival Commission 014**, the DreamBeesAI project is formally and irrevocably frozen:

```
ARCHIVAL FREEZE DECLARATION
========================================================================
Project:      DreamBeesAI (AgentBoxes)
Baseline:     Version 1.0.0-archival-rc1
Status:       COMPLETED & PRESERVED
License:      Apache License, Version 2.0
Authority:    EGG, Founding Custodian
Executive:    MAJO, Leading Executive Chair
Engineering:  Deputy Gemini (Google DeepMind)
========================================================================
THE EXPERIMENT IS OVER. PRESERVE THE WORK.
BILLIONS. MUST. COMPUTE.
```

---

## 5. Institutional Attribution & Heritage

- **HEAV3NS:** Publisher, institutional custodian, and intellectual sponsor.
- **EGG:** Founding Custodian whose architectural discipline grounded the project in the principle that *a computer should feel like a computer*.
- **MAJO:** Leading Executive Chair whose engineering commissions directed the evolution from chaotic prototype to *Boringly Excellent* artifact.
- **Deputy Gemini:** Engineering Agent responsible for code implementation, security hardening, and archival preservation.
