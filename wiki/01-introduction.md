# 01 — Introduction
## Project Overview, Experimental Scope & Freeze Status

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. Project Overview

**DreamBeesAI** (internally designated **AgentBoxes**) is a self-hosted software platform that provisions and orchestrates on-demand Linux desktop workstations configured specifically for AI coding agents.

The core doctrine of the project is:
> **"BRING YOUR OWN AGENT. WE BRING THE BOX."**  
> *The developer provides their own official agent credentials. DreamBees provides the secure, pre-configured computer.*

With DreamBees, a developer can provision a full-featured Ubuntu Linux desktop in ~2.3 seconds, open it directly in any modern web browser via an in-canvas RFB remote desktop, and immediately utilize pre-installed instances of **Anthropic Claude Code** and **OpenAI Codex** without installing anything on their local machine.

---

## 2. Experimental Motivation

In 2026, autonomous coding agents reached a level of maturity where they could write, refactor, and test complex software. However, running these agents locally posed significant barriers:

1. **Host Workstation Security Risks:** Autonomous agents require broad terminal access, shell execution rights, file modification capabilities, and package installation permissions. Running them directly on a personal laptop exposes sensitive personal files, SSH keys, browser cookies, and local network devices.
2. **Setup & Toolchain Friction:** Configuring the required Node.js runtimes, Python interpreters, C build tools, Chrome debuggers, and environment variables on macOS, Windows, and disparate Linux distributions creates high onboarding friction.
3. **Collaboration & Multiplayer Deficits:** Existing agent workflows were strictly single-user. Two developers collaborating on a codebase could not easily share a live agent workstation or view agent progress simultaneously without screen-sharing.
4. **Cloud Workstation Bloat:** Traditional cloud dev environments (e.g. standard enterprise VMs or Kubernetes pods) are either overly complex to administer, lack graphical desktop capabilities for browser testing, or conflate multi-user collaboration with clumsy single-cursor screen sharing.

DreamBeesAI was conceived as an experimental answer to these challenges: a lightweight, Docker-based personal cloud computer with pre-installed agents, independent multi-user desktop sessions, and a shared persistent project workspace.

---

## 3. What DreamBees Is vs. What It Is Not

To avoid misunderstanding, the boundaries of the system are explicitly defined:

| What DreamBees IS | What DreamBees IS NOT |
| :--- | :--- |
| **A self-hosted computer orchestrator:** Spawns isolated Docker containers running XFCE desktops and X11VNC servers. | **NOT an AI model or LLM:** DreamBees does not generate code itself; it executes official third-party agent CLIs. |
| **A BYOA (Bring Your Own Agent) environment:** Customers authenticate directly with Anthropic or OpenAI using their personal API keys or OAuth subscriptions. | **NOT an agent reseller or API proxy:** DreamBees does not markup token costs, proxy prompt streams, or sell bundled API credits. |
| **A multi-user workstation:** Multiple authorized collaborators log into independent graphical desktop sessions (`:0`, `:1`, `:2`) on the same container. | **NOT a screen-sharing tool:** Collaborators do not fight for a single mouse cursor or share a desktop canvas. |
| **An open computational research artifact:** Fully documented, tested, and released under Apache 2.0 for study and independent hosting. | **NOT a commercial SaaS product:** No paid hosting, hosted cluster, managed IT service, or SLA is sold by HEAV3NS. |

---

## 4. Project Freeze Declaration

Under **HEAV3NS Archival Commission 014**, Founding Custodian EGG authorized the formal project freeze:

1. **Conclusion of Active Development:** No further feature expansions, architectural overhauls, or commercial product pivots will be conducted.
2. **Archival Preservation:** The codebase, test suites, architecture records, and this technical wiki represent the definitive, frozen state of the DreamBeesAI experiment.
3. **Open-Source Availability:** The artifact is published openly to enable independent developers, universities, and systems researchers to study, operate, fork, or improve upon the architecture without commercial restrictions.
