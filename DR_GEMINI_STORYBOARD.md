# DR. GEMINI: CINEMATIC STORYBOARD & MOTION DESIGN SPECIFICATION
## Scene-by-Scene Visual Breakdown, Animations, Diagrams & Assets

**Presenter Identity:** DR. GEMINI (Acting Research Presenter, HEAV3NS)  
**Commission:** HEAV3NS Research Commission 016  
**Format:** 16:9 Widescreen (1920 × 1080)  
**Color Palette:**  
- **Background Deep Navy:** `#0b0f19`  
- **Card Surface:** `#1e293b`  
- **Primary Accent Sky Blue:** `#0284c7`  
- **Verified Success Emerald:** `#10b981`  
- **Adversarial Amber:** `#f59e0b`  
- **Remediated Vulnerability Red:** `#ef4444`  
- **Text Crisp White:** `#f8fafc`  

---

## Scene Overview & Motion Specifications

```
┌────────────────────────────────────────────────────────────────────────┐
│ [SCENE 01] Title & The Central Research Question (00:00 - 01:10)       │
│ • Visual: 3D wireframe computer container floating in dark space.      │
│ • Motion: Zooms through browser window into active terminal prompt.    │
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 02] Historical Evolution & Commissioning (01:10 - 02:15)        │
│ • Visual: Tree diagram branching from Comm 001 to 014.                 │
│ • Motion: Red strike-throughs on rejected dead-ends; green path locks. │
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 03] System Architecture & Independent Desktops (02:15 - 04:00)  │
│ • Visual: Flow diagram: Gateway -> Display :0 (Port 5900) & :1 (5901). │
│ • Motion: Dual-split viewport: Alice on :0 and Bob on :1 working.      │
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 04] Empirical Latency & Performance Baselines (04:00 - 05:30)   │
│ • Visual: Interactive latency chart: Cold provision 2.3s, Connect 12ms.│
│ • Motion: Animate progress bars with standard deviation error brackets.│
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 05] Adversarial Failure Analysis & Remediations (05:30 - 07:15) │
│ • Visual: Side-by-side code diffs of the 3 major security escapes.     │
│ • Motion: Animated red warning icon morphs to green verified checkmark.│
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 06] Scientific Disclosures & Limitations (07:15 - 08:30)        │
│ • Visual: Academic transparency scorecard (VERIFIED vs BLOCKED).       │
│ • Motion: Highlighting blocked human trials; honest WAN disclosures.   │
├────────────────────────────────────────────────────────────────────────┤
│ [SCENE 07] Conclusion & Archival Preservation (08:30 - 10:00)          │
│ • Visual: Repository view, 10-chapter wiki, Apache 2.0 license.        │
│ • Motion: Zoom out to HEAV3NS institutional seal: Billions Must Compute│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Scene Specifications

### Scene 01: Research Opening
- **Framing:** Medium close-up on synthetic presentation lectern. Left third displays presenter card (*Dr. Gemini · Acting Research Presenter · HEAV3NS*). Right two-thirds display a glowing animated Docker container topology.
- **On-Screen Text Callout:**  
  *CENTRAL RESEARCH QUESTION:*  
  *"Can existing autonomous agent infrastructure be repurposed to provision familiar, multi-user computing environments without developing another autonomous agent?"*

### Scene 02: Historical Evolution
- **Framing:** Full-width animated tree graph.
- **Graphic Transition:**
  1. *Commission 001–007:* "Autonomous Agent Swarms" appears in muted gray with an amber strike-through.
  2. *Commission 009:* "Separate Per-Agent Boxes" struck through in red.
  3. *Commission 010:* "Screen-Sharing Collaboration" struck through in red.
  4. Node branches converge onto single solid blue line: **"The Unified AgentBox & The Boringly Excellent Computer"**.

### Scene 03: Architecture & Dual Desktop Multiplexing
- **Framing:** 3-tier architectural diagram.
- **Live Motion Demo Inset:**
  - Left pane: `DISPLAY :0` — User `operator` running Claude Code in terminal window.
  - Right pane: `DISPLAY :1` — User `collab_1` running Codex in separate terminal window.
  - Bottom pane: Shared file tree `/home/operator/workspace` updating simultaneously with zero lock contention.

### Scene 04: Empirical Benchmarks
- **Framing:** Data dashboard card with typography inspired by Nature / IEEE.
- **Data Callouts:**
  - Provisioning Latency: `2,342 ms ± 115 ms` (Target: `< 6,000 ms`)
  - Connection Latency: `12.4 ms ± 1.2 ms` (Target: `< 100 ms`)
  - Revocation Terminate: `12.1 ms ± 0.9 ms` (Target: `< 50 ms`)
  - Tarball Export: `82.3 ms ± 4.5 ms` (Target: `< 500 ms`)

### Scene 05: Failure Analysis & Security Defenses
- **Framing:** Split code comparison card.
  - *Left (Pre-013 Vulnerability):*
    ```bash
    # Vulnerable wildcard trust
    git config --system safe.directory "*"
    # Naïve symlink export follows escapes
    tar -chzf workspace.tar.gz /home/operator/workspace
    ```
  - *Right (Remediated Architecture):*
    ```python
    # Hardened Python realpath validator
    real_target = os.path.realpath(filepath)
    if real_target.startswith(real_root + os.sep):
        tar.add(filepath)
    ```

### Scene 06: Honest Disclosures
- **Framing:** Clean academic limitation card.
  - `[BLOCKED]` Human Usability Clinical Trials (0 real human subjects fabricated).
  - `[VERIFIED]` Local loopback latency measured (12ms); WAN network latency unmodeled.
  - `[DISCLOSED]` Intentional collaborative code execution boundary in shared workspace.

### Scene 07: Conclusion & Archival Preservation
- **Framing:** Deep navy backdrop with golden HEAV3NS emblem.
- **Callout:**  
  *Repository:* `git@github.com:CardSorting/agentboxes-dreambees.git`  
  *License:* Apache License, Version 2.0  
  *Motto:* **BILLIONS. MUST. COMPUTE.**
