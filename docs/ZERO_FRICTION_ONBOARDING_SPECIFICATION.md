# HEAV3NS — ENGINEERING COMMISSION 008.V-D
## Zero-Friction Onboarding Design Specification
### Making Agent Workstations Approachable to Everyone

**Author:** Deputy Gemini, Engineering Agent  
**Commission:** 008.V-D — Zero-Friction Onboarding  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Status:** COMPLETED SPECIFICATION  
**Mandate:** *"THE FIRST TEN MINUTES ARE THE PRODUCT."*  
**Date:** October 2026  

---

## 1. Executive Summary

This specification defines the first-run customer experience for DreamBees AgentBoxes. 

Our target user wants to experiment with **Claude Code** without installing Node.js, compiling Linux dependencies, or giving autonomous software access to personal files on their laptop. 

The onboarding journey must feel as approachable as modern consumer software while preserving the full power of an isolated Linux environment:

$$\textbf{VISIT} \longrightarrow \textbf{CHOOSE CLAUDE} \longrightarrow \textbf{LAUNCH} \longrightarrow \textbf{SIGN IN} \longrightarrow \textbf{STARTER TASK} \longrightarrow \textbf{EXPORT}$$

---

## 2. The 9-Stage Zero-Friction Customer Journey

### Stage 1: Immediate Plain-Language Comprehension (0–15 seconds)
- When a user lands on `http://127.0.0.1:3030`, the hero banner presents three simple facts:
  1. **What is an AgentBox?** A disposable remote Linux computer where Claude Code is already installed.
  2. **Why use it?** Zero installation on your personal computer; isolated from your personal files.
  3. **How does it work?** You bring your Anthropic account. We provide the computer.

### Stage 2: 1-Click Launch (15–30 seconds)
- Prominent **"⚡ Launch Claude Code Box"** quick-launch button.
- Default settings pre-applied: Standard tier (2 vCPUs, 4GB RAM), pre-installed Claude Code v0.2.29, isolated persistent workspace.
- No mandatory forms, tier comparison quizzes, or credit card collection during the initial test.

### Stage 3: Visible Provisioning Sequence (30–35 seconds)
- Instead of a static loading spinner, an animated 4-step sequence displays actual progress:
  - `✔ Reserving compute allocation` (10%)
  - `✔ Attaching isolated storage & network` (30%)
  - `✔ Initializing Linux desktop display` (60%)
  - `✔ Pre-validating Claude Code readiness` (100%)
- Typical duration: **1.2 to 1.8 seconds**.

### Stage 4: Seamless Browser Remote Desktop (35–45 seconds)
- The browser opens `viewer.html` in the same window.
- The user sees a crisp, responsive Linux desktop running in true color with a clean dark theme.
- Surrounding platform UI is collapsed into a non-intrusive floating top pill (`🟢 Running | 📋 | 💾 Export | ⏸ | ✕`).

### Stage 5: Guided First-Run Authentication (BYOK) (45–120 seconds)
- On the desktop, a pre-opened terminal window displays the Claude Code welcome guidance:
  ```
  ========================================
         CLAUDE CODE — AGENTBOX
  ========================================
  Agent:     Claude Code v0.2.29 (Preinstalled)
  Workspace: /home/operator/workspace
  
  To begin, sign into your Anthropic account:
  👉 Type: claude login
     or export ANTHROPIC_API_KEY="sk-ant-..."
  
  Your API keys remain strictly inside your private box.
  DreamBees never sees or stores your credentials.
  ========================================
  ```
- The customer executes `claude login` or pastes their API key. Authentication succeeds in seconds.

### Stage 6: Safe Starter Tasks (2–5 minutes)
To prevent the "blank terminal paralysis", three pre-baked starter tasks are provided in `~/workspace/STARTER_TASKS.md`:
1. **Task A (Code Generation):**  
   `claude -p "Create an interactive CLI weather dashboard in Python"`
2. **Task B (Code Refactoring):**  
   `claude -p "Inspect hello.js, add input validation, and write unit tests"`
3. **Task C (Web Application):**  
   `claude -p "Create a single-page HTML canvas game and open it in Chrome"`

### Stage 7: In-Session Artifact Export (5–7 minutes)
- When Claude finishes generating code, the user clicks **"💾 Export Work"** on the floating session bar.
- The browser immediately triggers a download of `workspace-export-[boxId].tar.gz` containing all created project files.
- Zero git configuration, FTP, or terminal scp commands required.

### Stage 8: Transparent Session Control & Exit (7–10 minutes)
The user clicks the exit control (`✕`), which presents three clear choices:
- 🚪 **Disconnect:** Leave the desktop. The box continues running or auto-suspends after 15 minutes of inactivity.
- ⏸️ **Suspend Box:** Stop compute immediately to arrest active costs while preserving all workspace files.
- 🗑️ **Destroy Box:** Permanently delete the container and purge all stored files and credentials.

---

## 3. Usability Test Protocol

To validate this onboarding flow against the Acceptance Criterion (*"At least four of five first-time non-technical testers independently authenticate and complete a meaningful task"*):

### Protocol Structure:
1. **Participants:** 5 non-infrastructure users (developers, product managers, or tech enthusiasts who have never installed Claude Code locally).
2. **Setup:** Provide a browser URL (`http://127.0.0.1:3030`) and a test Anthropic API key.
3. **Prompt:** *"Provision a Claude Code workspace, generate a simple Python script, and download the resulting file to your computer."*
4. **Measured Metrics:**
   - **Time to First Useful Interaction:** Target < 5 minutes.
   - **Assistance Requests:** Target ≤ 1 per user.
   - **Task Completion Rate:** Target ≥ 80% (4 of 5).
   - **Confusion Points:** Log any hesitation on buttons, modals, or terminal instructions.
