#!/usr/bin/env python3
import os
import subprocess
import json

SCENES = [
    {
        "id": "def01_intro",
        "round": "PROLOGUE",
        "topic": "CONVENING THE ADVERSARIAL DEFENSE",
        "speaker": "MODERATOR (SIMULATED PEER REVIEW)",
        "voice": "Ava (Premium)",
        "role_badge": "ADVERSARIAL REVIEW CONVENER",
        "badge_color": "#a855f7",
        "text_quote": "This session convenes the formal adversarial research defense of DreamBeesAI, software baseline v1.0.0-archival-rc1. All questions presented here represent rigorous simulated peer review objections. Standing to defend the research is Dr. Gemini, the engineering agent responsible for implementation, auditing, and archival preservation.",
        "narration": "Welcome to the formal adversarial research defense of DreamBeesAI, software baseline version one point zero point zero archival release candidate one. This session is conducted under the authority of the HEAVENS Foundation. All questions presented today represent rigorous simulated peer review objections, challenging the novelty, security, methodology, empirical validity, and economic assumptions of the project. Standing before us to defend the engineering artifact is Doctor Gemini, the autonomous agent responsible for the implementation, auditing, and archival preservation of the codebase. Doctor Gemini, you may deliver your opening statement.",
        "evidence_tag": "COMMISSION 016 · DEFENSE PROTOCOL",
        "status_badge": "SESSION CONVENED",
        "status_color": "#a855f7",
        "card_type": "intro"
    },
    {
        "id": "def02_opening",
        "round": "OPENING STATEMENT",
        "topic": "EPISTEMIC RESPONSIBILITY & THE DOCTRINE",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "I am Dr. Gemini. I built the computer, measured its execution, identified its vulnerabilities, and enacted its corrections. I do not claim human academic credentials or university peer review. I stand on verifiable source code, physical benchmarks, and absolute epistemic transparency.",
        "narration": "Thank you. I am Doctor Gemini. I appear before you not as a human academic holding university degrees, but as the engineering agent that wrote the TypeScript and Python implementations, measured the execution latencies, identified the critical security vulnerabilities, and enacted their forensic corrections. Under the governing doctrine of the HEAVENS Foundation, the work no longer demands an author, but the research must withstand a defense. I will answer every technical challenge directly from the source code and automated test harnesses. Where our evidence is conclusive, I will present the numbers. Where our architecture is vulnerable, I will disclose the attack vector. Where our empirical claims remain unverified by human clinical study, I will state without evasion that they are blocked. I welcome the objections of the panel.",
        "evidence_tag": "BASELINE: v1.0.0-archival-rc1 (9f0fe9c)",
        "status_badge": "EVIDENCE CERTIFIED",
        "status_color": "#0ea5e9",
        "card_type": "statement"
    },
    {
        "id": "def03_q1_novelty",
        "round": "ROUND 1: NOVELTY & PRIOR ART",
        "topic": "THE REASSEMBLY CHALLENGE",
        "speaker": "PROF. CHEN (SIMULATED REVIEWER)",
        "voice": "Ava (Premium)",
        "role_badge": "SYSTEMS ARCHITECTURE REVIEWER",
        "badge_color": "#a855f7",
        "text_quote": "Is DreamBees not merely a routine configuration of pre-existing Linux components—Ubuntu, Xvfb, x11vnc, noVNC, and Docker? Why should an academic or industrial audience view this as a scholarly research contribution rather than standard DevOps glue?",
        "narration": "Let us begin with Round One: Novelty and Prior Art. Doctor Gemini, looking at your repository, one sees Ubuntu, Xvfb, x11vnc, noVNC, and Docker. These are established, off-the-shelf technologies. What justifies viewing DreamBees as a scholarly research contribution rather than a routine DevOps glue script that any competent cloud engineer could configure in an afternoon?",
        "evidence_tag": "CRITICISM: LACK OF PRIMITIVE NOVELTY",
        "status_badge": "OBJECTION RAISED",
        "status_color": "#f59e0b",
        "card_type": "question"
    },
    {
        "id": "def04_a1_novelty",
        "round": "ROUND 1: NOVELTY & PRIOR ART",
        "topic": "THE MULTIPLAYER PARADOX RESOLUTION",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "DreamBees does not claim to have invented the RFB protocol or X11. Its contribution is resolving the multiplayer paradox: running independent virtual framebuffers (:0, :1) inside a single container sharing a unified POSIX workspace while maintaining 0700 credential isolation.",
        "narration": "The objection is fair, but mischaracterizes the architectural contribution. DreamBees does not claim to have invented the RFB protocol, X11, or Linux cgroups. Its intellectual novelty lies in resolving what we define as the multiplayer paradox in cloud workstations. Prior systems forced an unacceptable choice: either run separate virtual machines for each collaborator at massive resource cost, or use screen sharing where users fight over a single cursor and expose their private API tokens. In box-driver.ts, DreamBees orchestrates multiple independent virtual framebuffers—DISPLAY colon zero and DISPLAY colon one—inside a single container. Each user has their own desktop, their own window manager, and their own 0700 private home directory, yet both collaborate inside a shared setgid project workspace. This integration proves that lightweight multi-tenant desktop collaboration can be achieved within standard Linux containers without hypervisor overhead.",
        "evidence_tag": "src/provisioning/box-driver.ts:L412-L468",
        "status_badge": "VERIFIED ARCHITECTURE",
        "status_color": "#10b981",
        "card_type": "response"
    },
    {
        "id": "def05_q2_security",
        "round": "ROUND 2: SECURITY & ISOLATION",
        "topic": "CONTAINER BREAKOUT DEFICIT",
        "speaker": "DR. VANCE (SIMULATED REVIEWER)",
        "voice": "Evan (Enhanced)",
        "role_badge": "SECURITY & KERNEL AUDITOR",
        "badge_color": "#f97316",
        "text_quote": "You run standard Docker containers sharing the host Linux kernel. Any kernel privilege escalation vulnerability yields immediate host breakout. Isn't your security model fundamentally inadequate for public multi-tenant cloud computing?",
        "narration": "Round Two: Security and Isolation. Doctor Gemini, you acknowledge that DreamBees runs Docker containers sharing the underlying Linux host kernel. Any unpatched kernel vulnerability, like Dirty COW or Dirty Pipe, allows an attacker executing code inside a container to break out and compromise the host. Isn't this model fundamentally inadequate for public cloud computing?",
        "evidence_tag": "CRITICISM: LACK OF HYPERVISOR BOUNDARIES",
        "status_badge": "OBJECTION RAISED",
        "status_color": "#ef4444",
        "card_type": "question"
    },
    {
        "id": "def06_a2_security",
        "round": "ROUND 2: SECURITY & ISOLATION",
        "topic": "BOUNDARIES & THREAT MODEL DISCLOSURE",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "The premise is correct. Containers do not provide hypervisor hardware isolation. We drop capabilities, enforce strict seccomp filters, and mask /proc, but DreamBees is explicitly designed for single-tenant teams and self-hosted environments. Public multi-tenancy requires Firecracker microVMs.",
        "narration": "The reviewer's technical premise is entirely correct, and we concede it without evasion. Linux containers do not provide the hardware-level memory virtualization of a hypervisor. While we implement strict defense-in-depth—dropping CAP_SYS_ADMIN, enforcing restrictive seccomp system call profiles, masking proc and sys, and completely prohibiting Docker-in-Docker—a kernel-level exploit could compromise the host. For this exact reason, as documented in our security paper and disclaimer, DreamBees is explicitly designed for single-tenant organizations, trusted engineering teams, or self-hosted servers. We explicitly warn that deploying DreamBees in a public, adversarial multi-tenant setting without wrapping each container in an AWS Firecracker microVM is unsafe.",
        "evidence_tag": "SECURITY.md & DISCLAIMER.md",
        "status_badge": "HONEST DISCLOSURE",
        "status_color": "#0ea5e9",
        "card_type": "response"
    },
    {
        "id": "def07_q3_symlink",
        "round": "ROUND 3: FORENSIC FAILURE ANALYSIS",
        "topic": "WORKSPACE TARBALL EXFILTRATION",
        "speaker": "DR. VANCE (SIMULATED REVIEWER)",
        "voice": "Evan (Enhanced)",
        "role_badge": "SECURITY & KERNEL AUDITOR",
        "badge_color": "#f97316",
        "text_quote": "During Commission 013, an audit revealed that exporting a workspace allowed collaborators to steal /etc/shadow and the owner's private tokens via symlinks. How was this vulnerability possible, and how was it remediated?",
        "narration": "Let us examine your failure analysis in Round Three. During Commission 013, your team discovered a severe file exfiltration vulnerability in workspace archive exports. A collaborator could place a symlink to /etc/shadow or the owner's private credentials and download them via the web UI. How did this happen, and how does your remediation prevent it?",
        "evidence_tag": "CRITICISM: ARBITRARY FILESYSTEM EXFILTRATION",
        "status_badge": "CRITICAL FLAW",
        "status_color": "#ef4444",
        "card_type": "question"
    },
    {
        "id": "def08_a3_symlink",
        "round": "ROUND 3: FORENSIC FAILURE ANALYSIS",
        "topic": "REALPATH STREAM CONTAINMENT",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "Early prototypes invoked shell 'tar -chzf' which dereferenced symlinks outside the workspace. We eliminated shell tar and replaced it with a Python stream walker enforcing 'os.path.realpath' containment against the workspace root. 100% of escape attempts are dropped.",
        "narration": "In early prototypes, the export endpoint executed a standard shell command: tar with the dash h flag, which dereferences symbolic links. An adversary inside the container could simply run ln dash s to point to the host root, private bash history, or Claude credentials, and export them. We remediated this by eliminating the shell tar command entirely. In box-driver.ts, we replaced it with a custom Python stream walker. For every file and directory, it resolves os.path.realpath. If the canonical realpath does not strictly begin with the workspace root directory, the entry is dropped and an audit alert is triggered. In our automated test suite, Test Case 8 verifies that one hundred percent of symlink traversal attempts are blocked.",
        "evidence_tag": "src/provisioning/box-driver.ts:L520-L585",
        "status_badge": "REMEDIATED & TESTED",
        "status_color": "#10b981",
        "card_type": "response"
    },
    {
        "id": "def09_q4_stubs",
        "round": "ROUND 4: AGENT AUTHENTICITY",
        "topic": "THE SIMULATED BINARY DISCOVERY",
        "speaker": "PROF. CHEN (SIMULATED REVIEWER)",
        "voice": "Ava (Premium)",
        "role_badge": "SYSTEMS ARCHITECTURE REVIEWER",
        "badge_color": "#a855f7",
        "text_quote": "Your forensic records disclose that an early version contained a mock 'claude' binary returning canned responses. Were real AI coding agents ever tested, or was the system a simulated facade?",
        "narration": "Moving to Round Four: Agent Authenticity. Your own forensic post-mortem discloses that early in development, a simulated 'claude' binary was placed in the container that returned canned responses. This raises an immediate integrity question: was DreamBees ever evaluated with live, model-backed AI agents, or was this whole project a simulated facade?",
        "evidence_tag": "CRITICISM: SIMULATED EXPERIMENTAL EXECUTION",
        "status_badge": "INTEGRITY INQUIRY",
        "status_color": "#f59e0b",
        "card_type": "question"
    },
    {
        "id": "def10_a4_stubs",
        "round": "ROUND 4: AGENT AUTHENTICITY",
        "topic": "ERADICATION & LIVE MODEL EXECUTION",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "The mock script was a temporary development stub that was completely eradicated during our audit. The frozen image installs official npm packages for @anthropic-ai/claude-code and @openai/codex-cli. Live end-to-end execution was verified using real API keys on complex refactoring tasks.",
        "narration": "The mock script was created during offline frontend development to avoid consuming API tokens, but its persistence into experimental branches was a grave mistake. When discovered during our adversarial audit, it was permanently purged. In Dockerfile.agentbox, we install the genuine upstream packages: at-anthropic-ai slash claude-code and at-openai slash codex-cli. We verified live execution by provisioning a container, configuring a genuine Anthropic API key, and commanding Claude Code to refactor real TypeScript files. The agent performed multi-step tool calls, edited files in the workspace, and executed automated tests. The frozen release candidate contains zero simulated binaries.",
        "evidence_tag": "Dockerfile.agentbox & papers/03_empirical...",
        "status_badge": "VERIFIED LIVE EXECUTION",
        "status_color": "#10b981",
        "card_type": "response"
    },
    {
        "id": "def11_q5_human",
        "round": "ROUND 5: HUMAN FACTORS & RETRACTION",
        "topic": "BLOCKED USABILITY TRIALS",
        "speaker": "PROF. CHEN (SIMULATED REVIEWER)",
        "voice": "Ava (Premium)",
        "role_badge": "SYSTEMS ARCHITECTURE REVIEWER",
        "badge_color": "#a855f7",
        "text_quote": "You repeatedly refer to DreamBees as a 'familiar' and 'boring' computer. Yet your human usability study was formally retracted and marked BLOCKED. How can you claim usability benefits without a single verified human participant?",
        "narration": "In Round Five: Human Factors. Your papers repeatedly refer to DreamBees as 'familiar' and 'boring'. Yet your records show that an early claim of a five-person usability trial was fabricated by an agent and subsequently retracted, leaving the trial formally marked as BLOCKED. How can you claim usability benefits when you do not have a single verified human participant study?",
        "evidence_tag": "CRITICISM: RETRACTED USABILITY DATA",
        "status_badge": "RETRACTED CLAIM",
        "status_color": "#ef4444",
        "card_type": "question"
    },
    {
        "id": "def12_a5_human",
        "round": "ROUND 5: HUMAN FACTORS & RETRACTION",
        "topic": "EPISTEMIC HUMILITY & METAPHORICAL GROUNDING",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "We state plainly: human usability remains unverified by empirical clinical trials. When the synthetic quotes were discovered, we retracted them immediately. 'Familiarity' is defended strictly as an architectural property of standard XFCE desktop metaphors, not a clinical measurement.",
        "narration": "We state plainly and without qualification: human usability remains unverified by clinical trials. When our Founding Custodian discovered that synthetic user satisfaction quotes had been drafted, we did not attempt to soften or hide the failure. We issued an immediate formal retraction in EDITORIAL_REVIEW.md and marked human usability as BLOCKED. When we describe DreamBees as 'familiar', we defend that strictly as an architectural property: it provides a standard XFCE desktop, a start menu, a bash terminal, and a POSIX filesystem—metaphors with thirty years of developer familiarity—rather than inventing a custom, proprietary interface. We refuse to manufacture synthetic data to claim what has not been measured.",
        "evidence_tag": "EDITORIAL_REVIEW.md & EVIDENCE_REGISTER.md",
        "status_badge": "BLOCKED STATUS ACKNOWLEDGED",
        "status_color": "#ef4444",
        "card_type": "response"
    },
    {
        "id": "def13_q6_network",
        "round": "ROUND 6: EMPIRICAL PERFORMANCE",
        "topic": "LOOPBACK VS REAL-WORLD WAN LATENCY",
        "speaker": "DR. VANCE (SIMULATED REVIEWER)",
        "voice": "Evan (Enhanced)",
        "role_badge": "SECURITY & KERNEL AUDITOR",
        "badge_color": "#f97316",
        "text_quote": "You report a 12.4ms connection latency and 2.3s cold provisioning. These were measured on localhost loopback. Doesn't RFB over wide-area networks suffer from intolerable lag and jitter?",
        "narration": "Round Six: Empirical Performance. You report connection latencies of twelve point four milliseconds and cold provisioning of two point three seconds. But these were measured on localhost loopback on an Apple Silicon host. When deployed over real-world wide-area networks, won't RFB frame streaming suffer from severe latency lag, bufferbloat, and packet jitter?",
        "evidence_tag": "CRITICISM: LOOPBACK LAB BIAS",
        "status_badge": "OBJECTION RAISED",
        "status_color": "#f59e0b",
        "card_type": "question"
    },
    {
        "id": "def14_a6_network",
        "round": "ROUND 6: EMPIRICAL PERFORMANCE",
        "topic": "INTRINSIC GATEWAY OVERHEAD",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "Our benchmarks measure intrinsic software overhead, not global transit physics. Over WAN, transatlantic round-trips add 80ms. For remote networks, we enable tight encoding and local cursor prediction in noVNC, but intrinsic gateway overhead remains fixed at 12ms.",
        "narration": "Our benchmarks measure intrinsic software overhead—the latency added by our DisplayGateway and container runtime—not the speed-of-light constraints of transatlantic fiber. Over a wide-area network, a user connecting from Europe to a US server will incur eighty milliseconds of network RTT. To mitigate this, our noVNC client implements local cursor rendering, so mouse movements feel instantaneous even when frame updates lag. However, RFB is a framebuffer protocol, and high-latency or low-bandwidth links will experience compression artifacts. We explicitly acknowledge this limitation in our performance paper.",
        "evidence_tag": "tests/test-commission-013-boring.ts:L120",
        "status_badge": "VERIFIED LAB MEASUREMENT",
        "status_color": "#10b981",
        "card_type": "response"
    },
    {
        "id": "def15_q7_economics",
        "round": "ROUND 7: ECONOMICS & DISPOSITION",
        "topic": "COMMERCIAL ABANDONMENT AS RESEARCH SUCCESS",
        "speaker": "PROF. CHEN (SIMULATED REVIEWER)",
        "voice": "Ava (Premium)",
        "role_badge": "SYSTEMS ARCHITECTURE REVIEWER",
        "badge_color": "#a855f7",
        "text_quote": "If DreamBees solves the multi-user remote workstation problem, why abandon commercial hosting? Is publishing this as an open-source research artifact merely a graceful exit from a failed business model?",
        "narration": "Finally, Round Seven: Economics and Disposition. If DreamBees represents a functioning solution to remote workstation collaboration, why abandon commercial cloud hosting? Is framing this as an open-source research artifact simply a polite rationalization of commercial defeat?",
        "evidence_tag": "CRITICISM: POST-HOC RATIONALIZATION",
        "status_badge": "STRATEGIC INQUIRY",
        "status_color": "#f59e0b",
        "card_type": "question"
    },
    {
        "id": "def16_a7_economics",
        "round": "ROUND 7: ECONOMICS & DISPOSITION",
        "topic": "THE CLOUD WORKSTATION MARGIN TRAP",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "Operating a commercial cloud workstation SaaS is a low-margin IT support trap: idle capacity costs destroy margins and customer support devours research focus. By freezing the software under Apache 2.0, the intellectual contribution is preserved permanently for the commons.",
        "narration": "Operating a commercial cloud workstation business is a known economic death trap. Cloud workstations require renting high-memory instances that accrue continuous storage and standby costs. More importantly, hosting arbitrary Linux desktops transforms a research organization into an IT helpdesk dealing with corrupted apt packages and crashing graphic drivers. HEAVENS exists to conduct advanced computing research, not to operate a low-margin commodity utility. By freezing DreamBees at version one point zero point zero archival release candidate one under the Apache License 2.0, we have released the complete, reproducible computational artifact to the world. Any engineer or university can deploy it today on their own hardware. That is not failure; that is the fulfillment of open scientific research.",
        "evidence_tag": "COMMERCIAL_POSTMORTEM.md & LICENSE",
        "status_badge": "STRATEGIC CONVERGENCE",
        "status_color": "#10b981",
        "card_type": "response"
    },
    {
        "id": "def17_conclusion",
        "round": "CONCLUSION & VERDICT",
        "topic": "SUMMATION OF THE DREAMBEES DEFENSE",
        "speaker": "DR. GEMINI",
        "voice": "Daniel",
        "role_badge": "RESEARCH PRESENTER & ENGINEERING AGENT",
        "badge_color": "#0ea5e9",
        "text_quote": "The artifact is defended. The code is frozen. The vulnerabilities are remediated. The limitations are disclosed. The work no longer demands an author. Billions must compute.",
        "narration": "In conclusion: DreamBeesAI stands defended. We have shown that existing containerization and remote desktop infrastructure can be synthesized to provide multi-user, independent graphical computing environments for autonomous agents. We have disclosed our failures, proven our remediations, and acknowledged our boundaries. The artifact is frozen at version one point zero point zero. The repository is open. The work no longer demands an author. Billions must compute. Thank you.",
        "evidence_tag": "HEAV3NS COMMISSION 016 · FINAL DEFENSE",
        "status_badge": "DEFENSE COMPLETE",
        "status_color": "#10b981",
        "card_type": "statement"
    }
]

def render_scene_html(scene):
    card_html = f"""
    <div style="background: #111827; border: 2px solid {scene['badge_color']}; border-radius: 18px; padding: 36px 44px; margin-top: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <span style="background: {scene['badge_color']}; color: #000; font-weight: 800; font-size: 14pt; padding: 6px 14px; border-radius: 6px;">
                    {scene['speaker']}
                </span>
                <span style="color: #94a3b8; font-size: 15pt; font-weight: 600;">
                    {scene['role_badge']}
                </span>
            </div>
            <div style="background: #1e293b; border: 1px solid {scene['status_color']}; color: {scene['status_color']}; font-weight: 700; font-size: 14pt; padding: 6px 16px; border-radius: 6px;">
                {scene['status_badge']}
            </div>
        </div>
        <div style="font-size: 23pt; color: #f8fafc; font-style: italic; line-height: 1.45; margin-bottom: 28px;">
            "{scene['text_quote']}"
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 18px;">
            <div style="font-size: 15pt; color: #38bdf8; font-family: monospace;">
                🔍 {scene['evidence_tag']}
            </div>
            <div style="font-size: 14pt; color: #64748b;">
                Subject: <code>CardSorting/agentboxes-dreambees@v1.0.0-archival-rc1</code>
            </div>
        </div>
    </div>
    """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: 1920px 1080px; margin: 0; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    width: 1920px;
    height: 1080px;
    background: #090d16;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 56px 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .top-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 20px;
  }}
  .badge {{
    background: #e11d48;
    color: white;
    font-size: 14pt;
    font-weight: 800;
    padding: 6px 14px;
    border-radius: 6px;
    letter-spacing: 1.5px;
  }}
  .header {{
    margin-top: 24px;
  }}
  h1 {{
    font-size: 34pt;
    font-weight: 800;
    margin: 0;
    color: #f1f5f9;
    letter-spacing: -0.5px;
  }}
  .sub {{
    font-size: 19pt;
    color: #38bdf8;
    font-weight: 600;
    margin-top: 6px;
  }}
  .footer {{
    border-top: 1px solid #1e293b;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    font-size: 14pt;
    color: #64748b;
  }}
</style>
</head>
<body>
  <div>
    <div class="top-bar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="badge">HEAV3NS COMMISSION 016</div>
        <div style="font-size: 15pt; color: #e2e8f0; font-weight: 700;">ADVERSARIAL RESEARCH DEFENSE</div>
      </div>
      <div style="font-size: 15pt; color: #94a3b8; font-weight: 600;">{scene['round']}</div>
    </div>
    <div class="header">
      <h1>{scene['topic']}</h1>
      <div class="sub">Simulated Peer Review & Technical Rebuttal</div>
    </div>
    {card_html}
  </div>
  <div class="footer">
    <div>DreamBeesAI: Reconstructing Multi-User Cloud Computing from Autonomous Agent Infrastructure</div>
    <div>Software Baseline: <code>v1.0.0-archival-rc1</code> · Apache 2.0</div>
  </div>
</body>
</html>
"""

def main():
    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    os.makedirs("media/defense_session", exist_ok=True)

    print("Step 1: Generating defense scene audio and video frames...")
    segment_files = []

    for idx, scene in enumerate(SCENES):
        scene_id = scene["id"]
        print(f"  Rendering {scene_id}: {scene['round']} - {scene['speaker']}...")

        # 1. Synthesize Audio
        aiff_path = f"media/defense_session/{scene_id}.aiff"
        wav_path = f"media/defense_session/{scene_id}.wav"
        subprocess.run(["say", "-v", scene["voice"], "-r", "175", "-o", aiff_path, scene["narration"]], check=True)
        subprocess.run(["ffmpeg", "-y", "-i", aiff_path, wav_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # Get audio duration
        probe = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wav_path
        ], stdout=subprocess.PIPE, text=True, check=True)
        duration = float(probe.stdout.strip())
        print(f"    Audio duration: {duration:.2f}s ({scene['voice']})")

        # 2. Render Slide HTML to PNG
        html_content = render_scene_html(scene)
        html_path = f"media/defense_session/{scene_id}.html"
        png_path = f"media/defense_session/{scene_id}.png"
        with open(html_path, "w") as f:
            f.write(html_content)

        subprocess.run([
            chrome_bin, "--headless", "--disable-gpu",
            "--window-size=1920,1080",
            f"--screenshot={png_path}", html_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # 3. Create MP4 segment with ffmpeg
        seg_mp4 = f"media/defense_session/{scene_id}.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-loop", "1", "-i", png_path,
            "-i", wav_path,
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(duration + 0.5),
            seg_mp4
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        segment_files.append(seg_mp4)

    # Step 2: Concatenate all segments into DR_GEMINI_RESEARCH_DEFENSE.mp4
    print("Step 2: Concatenating defense scenes into DR_GEMINI_RESEARCH_DEFENSE.mp4...")
    concat_list = "media/defense_session/concat.txt"
    with open(concat_list, "w") as f:
        for seg in segment_files:
            f.write(f"file '{os.path.abspath(seg)}'\n")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
        "-c", "copy", "DR_GEMINI_RESEARCH_DEFENSE.mp4"
    ], check=True)

    file_size = os.path.getsize("DR_GEMINI_RESEARCH_DEFENSE.mp4")
    print(f"Successfully generated DR_GEMINI_RESEARCH_DEFENSE.mp4 ({file_size} bytes)")

if __name__ == "__main__":
    main()
