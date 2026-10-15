# HEAV3NS — ENGINEERING COMMISSION 008.V-B
## UX, Ergonomics & Information Architecture Audit
### Modernization of the DreamBees Customer Journey

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008.V-B — UX, Ergonomics & Information Architecture  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Status:** COMPLETED AUDIT & SPECIFICATION  
**Mandate:** *"MAKE THE COMPLEXITY DISAPPEAR, NOT THE USER'S CONTROL."*  
**Date:** October 2026  

---

## 1. Executive Summary

This audit assesses the usability, ergonomics, information architecture, and accessibility of DreamBees AgentBoxes. The institutional objective is to ensure that non-technical customers who want to try Claude Code or other AI coding agents can do so effortlessly:

$$\textbf{CHOOSE AGENT} \longrightarrow \textbf{PROVISION BOX} \longrightarrow \textbf{SIGN IN} \longrightarrow \textbf{WORK} \longrightarrow \textbf{FINISH}$$

---

## 2. UX Defect & Friction Audit (Current Implementation)

Our inspection of the incumbent user interface identified the following friction points across cognitive load, ergonomics, and accessibility:

### A. Navigation Complexity & Unclear Terminology
1. **Infrastructure Jargon Leaks:**
   - Elements reference low-level Docker concepts: `shmSize`, `pidsLimit`, `cgroups`, `containerId: sha256:...`, `Docker bridge`.
   - Non-technical users do not know or care what "512 PIDs" or "shmSize 512m" mean; these create unnecessary anxiety.
2. **Ambiguous Lifecycle States:**
   - The distinction between `ready`, `running`, `stopped`, and `suspended` is confusing when presented as raw technical status strings.
   - Users need to know two essential facts: *Is my box active (costing compute)?* and *Are my files safe?*

### B. Unnecessary Decisions & Configuration Fatigue
1. **Modal Form Overload:**
   - The "New AgentBox" dialog previously presented a 3-column tier selector, a freeform name input, and 9 checkboxes of agent tools.
   - For a customer who simply wants a Claude Code environment, this requires 4-5 manual decisions before compute can be provisioned.

### C. The Remote Desktop Viewing Experience
1. **Window Canvas Encroachment:**
   - In `viewer.html`, an intrusive top navigation bar consumes valuable vertical screen space from the remote desktop canvas.
   - Remote desktop users need an **immersive edge-to-edge canvas** where the surrounding browser interface recedes into a minimalist, non-blocking control pill.
2. **Missing In-Session Artifact Retrieval:**
   - Once Claude Code writes code to `/home/operator/workspace`, the user has no direct UI mechanism to download their files to their personal computer without opening a browser or writing terminal transfer commands.

### D. Accessibility & Ergonomics Deficiencies (WCAG 2.2 AA Baseline)
1. **Focus Rings:**
   - Buttons and interactive cards lacked explicit high-contrast `:focus-visible` indicators for keyboard-only navigation.
2. **Reduced Motion:**
   - No `@media (prefers-reduced-motion: reduce)` rules were declared to honor system accessibility preferences.
3. **Semantic Landmarks:**
   - Modal dialogs lacked descriptive `aria-labelledby` attributes and keyboard `Esc` escape traps.

---

## 3. Revised Information Architecture (IA)

The application structure is streamlined into three clean, focused tiers:

```
+-----------------------------------------------------------------------------------+
|                              DREAMBEES AGENTBOXES                                 |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ ⚡ QUICK LAUNCH BANNER ]                                                       |
|  Claude Code — Ready-to-Use Linux Workspace                                        |
|  (1-Click: Standard Tier · Preinstalled v0.2.29 · 2 vCPUs · 4GB RAM)              |
|                                                                                   |
|  [ NAVIGATION TABS ]                                                              |
|  +-------------------------------------+---------------------------------------+  |
|  |           1. MY WORKSPACES          |         2. WORKSPACE LIBRARY          |  |
|  |   (Active, Suspended, Recent Boxes) |  (Curated Environments & Templates)   |  |
|  +-------------------------------------+---------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Level 1: Quick Launch Banner
A prominent hero card dedicated to the primary customer journey: **"Claude Code Ready-to-Use Workspace"**.
- Displays the 3-step sequence: `1. Provision` → `2. Sign In (BYOK)` → `3. Start Working`.
- Single primary button: **"⚡ Launch Claude Code Box"**.
- Eliminates configuration fatigue entirely.

### Level 2: My Workspaces (Primary Operational View)
Presents the user's active and saved environments as clean, scannable cards:
- **Status Pills:** Human-friendly badges (`🟢 Active`, `⏸️ Suspended`, `⏳ Starting`).
- **Billing Transparency:** Plain-language accrued cost (`$0.02 incurred`).
- **Primary Actions:**
  - If Active: **Open Desktop** (primary), **Suspend**, **Export Work**, **Delete**.
  - If Suspended: **Resume Desktop** (primary), **Export Work**, **Delete**.
- **Progressive Disclosure:** An expandable "System Specs" toggle hides technical details (vCPUs, RAM, PIDs) until requested.

### Level 3: Workspace Library (Catalog)
A clean, visual catalog displaying curated environment options:
- Claude Code (Featured / Preinstalled)
- OpenAI Codex (Terminal Coding Agent)
- Cursor IDE (Full Graphical Desktop Editor)
- Google Antigravity (AGY Agentic Runtime)
- Hermes Agent, OpenClaw, Grok, Aider

---

## 4. Remote Desktop Ergonomics (Viewer Subsystem)

To provide an immersive, distraction-free environment, `viewer.html` is redesigned with a **Floating Session Control Pill**:

```
+-----------------------------------------------------------------------------------+
| [ REMOTE DESKTOP CANVAS (Edge-to-Edge: Xvfb / xfwm4 / Claude Code / Chrome) ]     |
|                                                                                   |
|                                          +-------------------------------------+  |
|                                          | 🟢 Running | 📋 | 💾 Export | ⏸ | ✕ |  |
|                                          +-------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Floating Session Pill Controls:
1. **Status Pill (`🟢 Running`):** Displays connection health and live pulse.
2. **Clipboard (`📋`):** Bidirectional text sync between client OS and container X11 clipboard.
3. **Export Work (`💾 Export`):** 1-click download of `/home/operator/workspace` as a `.tar.gz` archive.
4. **Suspend (`⏸️`):** Pauses container compute to arrest costs while preserving files.
5. **Exit / Teardown (`✕`):** Clean exit menu with option to disconnect or permanently terminate.

---

## 5. Accessibility & Ergonomic Standards (WCAG 2.2 AA)

1. **Color Contrast:** Text and interactive elements maintain minimum contrast ratios of **4.5:1** for normal text and **3:1** for large text/icons against dark backgrounds (`#070913`).
2. **Focus Indicators:** High-contrast amber outline (`2px solid #f6ad55`, `outline-offset: 2px`) for keyboard tab navigation.
3. **Screen Reader Landmarks:** Full semantic HTML5 (`<header>`, `<main>`, `<nav>`, `<dialog>`, `aria-live="polite"` status announcements).
4. **Motion Ergonomics:** Respects `@media (prefers-reduced-motion: reduce)` by disabling transitions and animations.
5. **Destructive Confirmations:** Permanent box deletion requires explicit user confirmation matching the box name, preventing accidental data loss.
