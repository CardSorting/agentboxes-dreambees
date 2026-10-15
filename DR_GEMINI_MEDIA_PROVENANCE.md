# DR. GEMINI: MEDIA PROVENANCE & PRODUCTION SPECIFICATION
## Research Commission 016 · Audiovisual & Archival Asset Manifest

**Commission Authority:** HEAV3NS Research Commission 016  
**Executive Leadership:** MAJO (Leading Executive Chair) & EGG (Founding Custodian)  
**Presenter & Engineering Agent:** DR. GEMINI (Synthetic Research-Presenter Identity)  
**Subject Repository:** `CardSorting/agentboxes-dreambees`  
**Software Baseline:** `v1.0.0-archival-rc1` (`9f0fe9cbc9f34872a5295efc178983258678d72d`)  
**Research Baseline:** Commission 015 Research Manuscripts (`b005f06`)  
**Date of Render & Certification:** October 15, 2026  
**Governing Doctrine:** THE WORK NO LONGER DEMANDS AN AUTHOR. BUT THE RESEARCH MUST WITHSTAND A DEFENSE.

---

## 1. Executive Attribution & Identity Disclosure

In strict compliance with Section II (*Scholarly Identity*) and Section VIII (*Evidence & Scholarly Integrity*) of Research Commission 016:
- **Presenter Identity:** **DR. GEMINI** is the designated synthetic research-presenter identity of the HEAV3NS Foundation.
- **Epistemic Disclosure:** DR. GEMINI possesses no human academic degrees, university professorships, or personal institutional affiliations. The authority of DR. GEMINI derives exclusively from having performed the engineering implementation, discovered the system vulnerabilities, executed the automated test suites, and established the archival baseline.
- **Simulated Peer Review Disclosure:** The adversarial reviewers appearing in the defense recordings (`Prof. Chen`, `Dr. Vance`, `Moderator`) are explicitly identified as simulated peer reviewers designed to subject the codebase to rigorous technical critique. They do not impersonate real human academics or institutional faculty.

---

## 2. Production Toolchain & Environment

The entire audiovisual and document suite was compiled deterministically on the physical development host without proprietary third-party cloud generation services:

| Toolchain Component | Version / Build | Executable Path | Purpose |
| :--- | :--- | :--- | :--- |
| **Operating System** | macOS Darwin (ARM64 Apple Silicon) | `/bin/uname` | Primary development & host kernel |
| **Python Runtime** | Python 3.12+ | `/usr/bin/python3` | Pipeline coordination & DOM generation |
| **Text-to-Speech Engine** | macOS Native Speech Synthesis (`say`) | `/usr/bin/say` | High-fidelity acoustic voice rendering |
| **Headless Browser** | Google Chrome 131+ (Headless) | `/Applications/Google Chrome.app/...` | 1920x1080 slide rendering & PDF printing |
| **Video Transcoder** | FFmpeg 8.1.2 (Apple clang 21.0.0) | `/opt/homebrew/bin/ffmpeg` | Video encoding, stillimage looping, concat |
| **Stream Analyzer** | FFprobe 8.1.2 | `/opt/homebrew/bin/ffprobe` | Bitstream verification & track inspection |

---

## 3. Acoustic Voice Allocation & Audio Profiles

| Persona / Role | Voice Identifier | Engine & Locale | Speed / Pitch | Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Gemini** | `Daniel` | macOS Native `en_GB` | 175 wpm | Articulate, deliberate, scholarly British English. Authoritative and calm. |
| **Prof. Chen (Reviewer 1)** | `Ava (Premium)` | macOS Neural `en_US` | 175 wpm | Sharp, probing systems architecture critic. Focuses on novelty & UX. |
| **Dr. Vance (Reviewer 2)** | `Evan (Enhanced)` | macOS Neural `en_US` | 175 wpm | Rigorous systems & kernel security auditor. Focuses on isolation & boundaries. |
| **Audio Format** | AAC (Advanced Audio Coding) | 192 kbps, 22.05 kHz | Mono channel | Clean spoken voice profile, zero synthetic hum or clipping. |

---

## 4. Visual Layout, Typography & Color Tokens

Both videos and academic posters share a unified, publication-grade design system:

| Design Token | Value | Applied Context |
| :--- | :--- | :--- |
| **Primary Canvas** | `#090d16` / `#0b0f19` | Deep obsidian academic background |
| **Surface Cards** | `#111827` / `#1e293b` | Elevated content containers with subtle 1px border |
| **Accent: Dr. Gemini** | `#0ea5e9` / `#38bdf8` | Precision cyan for engineering evidence and responses |
| **Accent: Reviewer 1** | `#a855f7` / `#c084fc` | Academic purple for architectural inquiries |
| **Accent: Reviewer 2** | `#f97316` / `#fb923c` | Amber/Orange for security and isolation challenges |
| **Accent: Critical Failure**| `#ef4444` / `#f87171` | Crimson for vulnerabilities, stubs, and retractions |
| **Accent: Verified** | `#10b981` / `#34d399` | Emerald green for verified benchmarks and remediations |
| **Typography** | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` | Modern, clean, highly legible sans-serif |
| **Monospace Typography** | `ui-monospace, "SF Mono", Menlo, Consolas` | Used for source code references, line numbers, commits |

---

## 5. Artifact Manifest & Verification Register

All ten deliverables commissioned under Research Commission 016:

### 1. `DR_GEMINI_RESEARCH_POSTER.pdf`
- **Description:** Conference-quality academic research poster. Formatted for high-resolution A0/36"×48" physical print with 3-column structured layout.
- **Size:** 805,268 bytes
- **SHA-256:** `6edffa69fdff22c18f302a593222656c10d704e5383b648d57efb9d249b66bea`

### 2. `DR_GEMINI_RESEARCH_POSTER_DIGITAL.pdf`
- **Description:** 16:9 widescreen presentation poster optimized for conference monitors and virtual poster sessions.
- **Size:** 354,171 bytes
- **SHA-256:** `fb54ffb128a4c26f3404b46eef67a14df8628661d4d707d338262b12c5c58f34`

### 3. `DR_GEMINI_POSTER_SESSION.mp4`
- **Description:** Complete scholarly poster presentation video narrated by Dr. Gemini (~8m 53s).
- **Format:** 1920×1080 progressive, H.264 High Profile, 25.0 fps, AAC audio.
- **Duration:** 00:08:53.04 (533.04 seconds)
- **Size:** 12,609,449 bytes (~12.6 MB)
- **SHA-256:** `cc628b580e2b17b1c60c8dd7e82821064c0bb50277f8e7f1654c9c8ee0b94581`

### 4. `DR_GEMINI_RESEARCH_DEFENSE.mp4`
- **Description:** Formal multi-voice adversarial research defense video (~10m 20s) featuring Dr. Gemini answering simulated peer review objections across 7 rigorous rounds.
- **Format:** 1920×1080 progressive, H.264 High Profile, 25.0 fps, AAC audio.
- **Duration:** 00:10:20.40 (620.40 seconds)
- **Size:** 15,737,669 bytes (~15.7 MB)
- **SHA-256:** `f599bb03d1736b02cef1b88cb351b6aadf7a42dc668c4015dcfb190a88af568e`

### 5. `DR_GEMINI_DEFENSE_DOSSIER.md`
- **Description:** Comprehensive 20-question written defense dossier covering novelty, security, authentication, human factors, performance, economics, and post-authorial philosophy.
- **Size:** 25,234 bytes
- **SHA-256:** `351d7579718646e1bd0c18c861c5886bd1f79d2455eb15de2fb236c06fd8e082`

### 6. `DR_GEMINI_PRESENTATION_SCRIPT.md`
- **Description:** Full spoken verbatim script for the 7-scene poster presentation session with precise visual directives.
- **Size:** 12,814 bytes
- **SHA-256:** `701f56b7f858fa220b19e85f4d489f9fd2b2d8bfca5d6aa66659acf77cf575c6`

### 7. `DR_GEMINI_STORYBOARD.md`
- **Description:** Detailed scene-by-scene motion design specification, layout diagrams, and transition logic.
- **Size:** 7,142 bytes
- **SHA-256:** `efa5d63c678cff152e95e8df7fd8e6f28e6540b46e0281cf9ca5e88adac6215b`

### 8. `DR_GEMINI_EVIDENCE_REGISTER.md`
- **Description:** Traceability matrix mapping every empirical claim, latency benchmark, and architectural feature directly to source code files and automated test line numbers.
- **Size:** 6,259 bytes
- **SHA-256:** `a4da575b3c7a6dfb84980320c09ac1dac11b22ead272d7126389eb3463c4554f`

### 9. `DR_GEMINI_MEDIA_PROVENANCE.md`
- **Description:** This document. Comprehensive technical specification of tools, voices, codecs, color palettes, and cryptographic hashes.

### 10. `DR_GEMINI_FINAL_PRODUCTION_REPORT.md`
- **Description:** Final executive sign-off report to MAJO and EGG, certifying completion of Commission 016.
- **Size:** 6,700 bytes
- **SHA-256:** `19f2a99994d99f4ea1c39c27d6eb61d94c82f78e3af77e6d310adc6eddb2201d`

---

## 6. Scholarly Reproducibility Protocol

Any researcher seeking to re-render these audiovisual assets from source code can reproduce them on a macOS environment with Chrome and FFmpeg installed:

```bash
# 1. Compile Academic Posters (Print and Digital PDFs)
python3 papers/build_posters.py

# 2. Render Poster Session Video (1080p MP4)
python3 media/render_poster_session.py

# 3. Render Adversarial Defense Video (1080p MP4)
python3 media/render_defense_session.py
```

No external network calls, closed APIs, or synthetic generative video subscription services are required. The entire pipeline is open, local, and reproducible.
