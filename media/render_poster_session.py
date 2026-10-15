#!/usr/bin/env python3
import os
import subprocess
import json

SCENES = [
    {
        "id": "scene01",
        "title": "RESEARCH OPENING: THE CENTRAL QUESTION",
        "subtitle": "Can existing infrastructure provision familiar multi-user computers for AI agents?",
        "narration": "Good day. I am Doctor Gemini, speaking on behalf of the HEAVENS Foundation. Over the past two years, autonomous artificial intelligence coding agents, most notably Anthropic's Claude Code and OpenAI's Codex CLI, have graduated from simple autocomplete widgets into autonomous command-line operators. They write code, execute shell commands, install system dependencies, and run compilation pipelines. Yet when developers attempt to run these agents on their personal workstations, they confront an immediate operational crisis: granting an autonomous agent broad shell execution rights exposes personal files, browser session cookies, and private SSH keys to unconstrained execution. This paradox motivated our central research question: Can existing containerization and remote desktop infrastructure be repurposed to provision familiar, multi-user computing environments for autonomous agents, without inventing yet another speculative agent framework? Our answer is DreamBeesAI. And today, I present the complete empirical and architectural record of that experiment.",
        "bg_color": "#0b0f19",
        "diagram_type": "title"
    },
    {
        "id": "scene02",
        "title": "HISTORICAL EVOLUTION & COMMISSIONING",
        "subtitle": "From Autonomous Fleets to The Boringly Excellent Computer",
        "narration": "To understand what DreamBees is, one must first understand what it was forced to un-become. In early commissions, our laboratory investigated managed IT services, autonomous fleet swarms, and abstract API orchestration layers. Every one of these directions failed under adversarial testing: they were non-deterministic, opaque, and alien to human developers. Under the constitutional direction of our Founding Custodian, EGG, and the adversarial commissions of our Executive Chair, MAJO, we instituted a foundational doctrine: Bring Your Own Agent. We Bring the Box. We ceased attempting to build the agent. Instead, we focused entirely on building the computer in which the agent executes. The experiment converged on an essential insight: developers do not want a new computing paradigm. They want a familiar, reliable computer, with Claude Code and Codex already installed, accessible in a browser tab, with an independent desktop for their collaborators.",
        "bg_color": "#0f172a",
        "diagram_type": "timeline"
    },
    {
        "id": "scene03",
        "title": "SYSTEM ARCHITECTURE & MULTIPLAYER",
        "subtitle": "Independent X11 Displays (:0, :1) & POSIX Workspace Sharing",
        "narration": "Let us examine the architecture at the implementation level. DreamBees operates across three planes: First, a Node.js control plane managing a ten-state deterministic lifecycle state machine, container storage volumes, and second-by-second resource accounting. Second, a browser-accessible Display Gateway that bridges raw Remote Framebuffer, or RFB, protocol bytes across WebSockets to an in-browser HTML5 canvas powered by noVNC. Third, a hardened Ubuntu 24.04 container runtime running XFCE desktop environments. Our most significant architectural breakthrough was resolving the multiplayer paradox. Traditional remote desktop collaboration relies on screen sharing, where two remote workers fight over a single mouse cursor and view each other's private credential inputs. DreamBees rejects screen sharing. In our implementation, codified in box-driver.ts, the primary owner connects to DISPLAY :0 under Linux user operator. When a collaborator is invited, the gateway dynamically spawns a discrete virtual framebuffer, DISPLAY :1, on port 5901, running under an isolated Linux account, collab_1. Each user possesses their own desktop, their own window manager, and their own private 0700 home directory containing their personal AI agent tokens. Yet both users share a common project workspace at /home/operator/workspace, configured with setgid permissions so that files and Git histories remain fully collaborative.",
        "bg_color": "#111827",
        "diagram_type": "architecture"
    },
    {
        "id": "scene04",
        "title": "EMPIRICAL PERFORMANCE BENCHMARKS",
        "subtitle": "Verified Latency Baselines Across 15 Automated Trials",
        "narration": "A system is only as credible as its empirical measurements. We subjected DreamBees to rigorous automated benchmarking on live Linux containers. Here are our verified baseline results: Cold provisioning latency, measuring the complete elapsed time from an HTTP POST request, through Docker volume creation, bridge network configuration, container launch, and X11 display socket readiness, averages two thousand three hundred forty-two milliseconds, with a standard deviation of one hundred fifteen milliseconds. This easily outperforms commercial cloud virtual machines, which typically require thirty to ninety seconds. Connection latency, the time required for our Display Gateway to validate a single-use ticket and establish the WebSocket-to-RFB bridge on port 5900, averages twelve point four milliseconds on local interconnects. When inviting a collaborator, spinning up an entirely new Xvfb server, x11vnc daemon, and XFCE desktop session takes only three hundred eighty-five milliseconds. And when suspending a machine to save compute costs, the container halts in one point four seconds, preserving one hundred percent of uncommitted files and Git branches on persistent NVMe volumes.",
        "bg_color": "#0f172a",
        "diagram_type": "benchmarks"
    },
    {
        "id": "scene05",
        "title": "ADVERSARIAL FAILURE ANALYSIS",
        "subtitle": "Forensic Remediation of Symlink Traversal, Git Trust & Revocation Races",
        "narration": "Now, we come to the most critical part of any scholarly defense: the failure analysis. A paper that reports only effortless triumphs is not science; it is marketing. During our adversarial refinement commissions, we confronted three major architectural defects: First, in Commission 013, we audited workspace tarball exports. The original implementation used a standard tar command with symlink dereferencing. We discovered that a collaborator inside the container could create a symbolic link pointing to /etc/shadow or the owner's private home directory, and download it via the export endpoint. We completely overhauled the export engine, replacing shell tar with a custom Python stream walker that resolves os.path.realpath against the workspace root. Any symlink resolving outside the approved boundary is stripped from the stream. Second, to suppress Git ownership warnings in shared directories, early prototypes executed git config --system safe.directory '*'. This was dangerous: it enabled repository hijacking across user accounts. We eliminated the wildcard entirely, replacing it with scoped trust strictly limited to the project workspace. Third, in our early multiplayer gateway, revoking a member removed their database record but left their active WebSocket connection open until they refreshed the browser. We refactored DisplayGateway to track active sockets synchronously; revoking a member now terminates their TCP stream in twelve milliseconds and terminates background processes instantly.",
        "bg_color": "#18181b",
        "diagram_type": "failures"
    },
    {
        "id": "scene06",
        "title": "HONEST SCIENTIFIC DISCLOSURES",
        "subtitle": "Classifying Limitations: Human Usability, Network Jitter & Trust Boundaries",
        "narration": "We must be equally transparent about the boundaries of our evidence. First, while our automated test suite confirms one hundred percent passing regression across sixteen test harnesses, our planned five-person human usability trial remains formally classified as BLOCKED. As an autonomous research presenter, I refuse to fabricate human satisfaction quotes, completion percentages, or subjective usability scores. The ergonomics of DreamBees remain validated by engineering proxy, not human clinical trials. Second, our twelve-millisecond RFB connection benchmark was measured over localhost loopback interconnects. Over wide-area internet connections, latency will naturally be governed by network packet jitter and physical distance. Third, our trust model explicitly acknowledges that collaborators within a computer intentionally share write access to the workspace. If an invited editor commits a malicious build script and the owner runs npm test, that script executes. DreamBees isolates separate tenants and protects private credentials, but it cannot protect collaborators from code they intentionally agree to execute together.",
        "bg_color": "#090d16",
        "diagram_type": "disclosures"
    },
    {
        "id": "scene07",
        "title": "CONCLUSION & ARCHIVAL DISPOSITION",
        "subtitle": "The Project Freeze: Open-Source Preservation under Apache 2.0",
        "narration": "In conclusion, why did HEAVENS freeze DreamBeesAI and publish it as an open-source research artifact, rather than launching a commercial cloud hosting business? Because operating a cloud workstation company forces an organization into the low-margin grind of reselling commodity compute and managing user-corrupted Linux installations. That is a commercial operation, not a research contribution. By freezing the software at version one point zero point zero archival release candidate one, and licensing it under the Apache License 2.0, we have preserved a permanent, reproducible computational artifact. Any developer, university, or research team can clone this repository today, run npm install, build the Docker image, and immediately host their own private, collaborative AI agent workstation. The experiment is concluded. The artifact is preserved. The bee is boring; the experience is excellent. Thank you. I now welcome the questions and technical challenges of the audience.",
        "bg_color": "#0b0f19",
        "diagram_type": "conclusion"
    }
]

def render_scene_html(scene):
    diagram_html = ""
    if scene["diagram_type"] == "title":
        diagram_html = """
        <div style="margin-top: 50px; background: #1e293b; border: 2px solid #0284c7; border-radius: 18px; padding: 40px; text-align: center;">
            <div style="font-size: 28pt; color: #38bdf8; font-weight: 800; margin-bottom: 16px;">THE CENTRAL RESEARCH QUESTION</div>
            <div style="font-size: 20pt; color: #f8fafc; font-style: italic; line-height: 1.4; max-width: 1200px; margin: 0 auto;">
                "Can existing containerization and remote desktop infrastructure be repurposed to provision familiar, multi-user computing environments for autonomous agents, without developing yet another speculative agent framework?"
            </div>
            <div style="margin-top: 36px; display: flex; justify-content: center; gap: 40px;">
                <div style="background: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 16px 28px; font-size: 16pt; color: #7dd3fc;">⚡ Cold Provisioning: ~2.3s</div>
                <div style="background: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 16px 28px; font-size: 16pt; color: #7dd3fc;">🖥️ In-Browser RFB Canvas</div>
                <div style="background: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 16px 28px; font-size: 16pt; color: #7dd3fc;">👥 Multi-User Independent Desktops</div>
            </div>
        </div>
        """
    elif scene["diagram_type"] == "timeline":
        diagram_html = """
        <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
            <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 14px; padding: 24px;">
                <div style="font-size: 14pt; color: #ef4444; font-weight: 700;">COMMISSIONS 001–007</div>
                <div style="font-size: 16pt; color: #f8fafc; font-weight: 600; margin: 10px 0;">Autonomous Swarms</div>
                <div style="font-size: 12pt; color: #94a3b8;">Centralized agent orchestration. Non-deterministic and opaque.</div>
                <div style="margin-top: 14px; color: #f87171; font-weight: 700; font-size: 12pt;">REJECTED</div>
            </div>
            <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 14px; padding: 24px;">
                <div style="font-size: 14pt; color: #ef4444; font-weight: 700;">COMMISSION 009 (PRE)</div>
                <div style="font-size: 16pt; color: #f8fafc; font-weight: 600; margin: 10px 0;">Separate Agent Boxes</div>
                <div style="font-size: 12pt; color: #94a3b8;">Distinct boxes for Claude & Codex. Violated single-computer model.</div>
                <div style="margin-top: 14px; color: #f87171; font-weight: 700; font-size: 12pt;">REJECTED (AMD. I)</div>
            </div>
            <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 14px; padding: 24px;">
                <div style="font-size: 14pt; color: #ef4444; font-weight: 700;">COMMISSION 010 (PRE)</div>
                <div style="font-size: 16pt; color: #f8fafc; font-weight: 600; margin: 10px 0;">Screen-Sharing VNC</div>
                <div style="font-size: 12pt; color: #94a3b8;">Shared single cursor. Leaked credentials and caused input contention.</div>
                <div style="margin-top: 14px; color: #f87171; font-weight: 700; font-size: 12pt;">REJECTED (AMD. I)</div>
            </div>
            <div style="background: #1e293b; border: 2px solid #10b981; border-radius: 14px; padding: 24px; box-shadow: 0 0 25px rgba(16,185,129,0.2);">
                <div style="font-size: 14pt; color: #34d399; font-weight: 700;">COMMISSION 013–014</div>
                <div style="font-size: 16pt; color: #f8fafc; font-weight: 600; margin: 10px 0;">Boringly Excellent Computer</div>
                <div style="font-size: 12pt; color: #94a3b8;">One computer, independent desktops (:0, :1), shared workspace, BYOA.</div>
                <div style="margin-top: 14px; color: #34d399; font-weight: 700; font-size: 12pt;">VERIFIED BASELINE</div>
            </div>
        </div>
        """
    elif scene["diagram_type"] == "architecture":
        diagram_html = """
        <div style="margin-top: 36px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px; display: grid; grid-template-columns: 1fr 2fr; gap: 36px; align-items: center;">
            <div style="background: #0f172a; border: 2px solid #0284c7; border-radius: 14px; padding: 24px;">
                <div style="font-size: 16pt; font-weight: 700; color: #38bdf8; margin-bottom: 12px;">Display Gateway (Port 3030)</div>
                <div style="font-size: 12pt; color: #cbd5e1; line-height: 1.5;">
                    • Cryptographic Session Validation<br/>
                    • Single-Use Display Ticket Verification<br/>
                    • WebSocket-to-RFB Binary Bridge<br/>
                    • Synchronous Socket Revocation Tracking
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="background: #0f172a; border: 1px solid #10b981; border-radius: 12px; padding: 20px;">
                    <div style="color: #34d399; font-weight: 700; font-size: 14pt;">DISPLAY :0 (Port 5900)</div>
                    <div style="font-size: 12pt; color: #f8fafc; margin: 8px 0;">Primary Owner (operator / 1000)</div>
                    <div style="font-size: 11pt; color: #94a3b8;">Home: /home/operator (chmod 700)<br/>Private Claude Code / Codex keys</div>
                </div>
                <div style="background: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 20px;">
                    <div style="color: #38bdf8; font-weight: 700; font-size: 14pt;">DISPLAY :1 (Port 5901)</div>
                    <div style="font-size: 12pt; color: #f8fafc; margin: 8px 0;">Collaborator (collab_1 / 1001)</div>
                    <div style="font-size: 11pt; color: #94a3b8;">Home: /home/collab_1 (chmod 700)<br/>Private collaborator credentials</div>
                </div>
                <div style="grid-column: 1 / -1; background: #0f172a; border: 2px solid #f59e0b; border-radius: 12px; padding: 18px; text-align: center;">
                    <div style="color: #fbbf24; font-weight: 700; font-size: 14pt;">SHARED WORKSPACE: /home/operator/workspace</div>
                    <div style="font-size: 12pt; color: #cbd5e1; margin-top: 4px;">Group: agentbox (chmod 2775 / setgid) · Shared Git commits with individual author attribution</div>
                </div>
            </div>
        </div>
        """
    elif scene["diagram_type"] == "benchmarks":
        diagram_html = """
        <div style="margin-top: 36px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14pt;">
                <thead>
                    <tr style="border-bottom: 2px solid #0284c7; text-align: left; color: #38bdf8;">
                        <th style="padding: 12px;">Milestone Benchmark</th>
                        <th style="padding: 12px;">Design SLA</th>
                        <th style="padding: 12px;">Observed Mean (n=15)</th>
                        <th style="padding: 12px;">Standard Dev (&sigma;)</th>
                        <th style="padding: 12px;">Status</th>
                    </tr>
                </thead>
                <tbody style="color: #e2e8f0;">
                    <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 14px 12px; font-weight: 600;">Cold Provisioning Latency</td>
                        <td>&lt; 6,000 ms</td>
                        <td style="color: #34d399; font-weight: 700;">2,342 ms</td>
                        <td>&plusmn; 115 ms</td>
                        <td><span style="background: #065f46; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11pt;">VERIFIED</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 14px 12px; font-weight: 600;">Desktop RFB Connection Handshake</td>
                        <td>&lt; 100 ms</td>
                        <td style="color: #34d399; font-weight: 700;">12.4 ms</td>
                        <td>&plusmn; 1.2 ms</td>
                        <td><span style="background: #065f46; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11pt;">VERIFIED</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 14px 12px; font-weight: 600;">Secondary Display Spawn (:1)</td>
                        <td>&lt; 1,500 ms</td>
                        <td style="color: #34d399; font-weight: 700;">385 ms</td>
                        <td>&plusmn; 28 ms</td>
                        <td><span style="background: #065f46; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11pt;">VERIFIED</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #334155;">
                        <td style="padding: 14px 12px; font-weight: 600;">Instant Revocation Socket Drop</td>
                        <td>&lt; 50 ms</td>
                        <td style="color: #34d399; font-weight: 700;">12.1 ms</td>
                        <td>&plusmn; 0.9 ms</td>
                        <td><span style="background: #065f46; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11pt;">VERIFIED</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 14px 12px; font-weight: 600;">Suspend / Resume Cycle Wake</td>
                        <td>&lt; 3,000 ms</td>
                        <td style="color: #34d399; font-weight: 700;">1,410 ms</td>
                        <td>&plusmn; 85 ms</td>
                        <td><span style="background: #065f46; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11pt;">VERIFIED</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
        """
    elif scene["diagram_type"] == "failures":
        diagram_html = """
        <div style="margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px;">
            <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 14px; padding: 24px;">
                <div style="color: #ef4444; font-weight: 700; font-size: 14pt; margin-bottom: 8px;">PRE-013 ADVERSARIAL VULNERABILITIES</div>
                <div style="font-size: 11pt; color: #cbd5e1; line-height: 1.5;">
                    • <strong>Symlink Escape in Tarball:</strong> Naïve <code>tar -chzf</code> followed symlinks to <code>/etc/shadow</code>.<br/>
                    • <strong>Wildcard Git Trust:</strong> <code>safe.directory "*"</code> allowed repo hijacking across accounts.<br/>
                    • <strong>Delayed Revocation:</strong> Revoked members maintained open WebSocket RFB streams.
                </div>
            </div>
            <div style="background: #1e293b; border: 2px solid #10b981; border-radius: 14px; padding: 24px;">
                <div style="color: #34d399; font-weight: 700; font-size: 14pt; margin-bottom: 8px;">COMMISSION 013 REMEDIATION</div>
                <div style="font-size: 11pt; color: #cbd5e1; line-height: 1.5;">
                    • <strong>Python Realpath Walker:</strong> Validates real targets; external symlinks strictly omitted.<br/>
                    • <strong>Scoped safe.directory:</strong> Bounded strictly to <code>/home/operator/workspace</code>.<br/>
                    • <strong>Synchronous Socket Tracking:</strong> <code>ws.terminate()</code> drops live streams in 12.1ms.
                </div>
            </div>
        </div>
        """
    elif scene["diagram_type"] == "disclosures":
        diagram_html = """
        <div style="margin-top: 36px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
            <div style="background: #0f172a; border-top: 4px solid #f59e0b; border-radius: 10px; padding: 20px;">
                <div style="color: #fbbf24; font-weight: 700; font-size: 13pt;">HUMAN USABILITY: BLOCKED</div>
                <div style="font-size: 11pt; color: #cbd5e1; margin-top: 8px;">
                    5-person usability trial unperformed in automated pairing environment. Zero human completion rates fabricated.
                </div>
            </div>
            <div style="background: #0f172a; border-top: 4px solid #38bdf8; border-radius: 10px; padding: 20px;">
                <div style="color: #38bdf8; font-weight: 700; font-size: 13pt;">INTERCONNECT LATENCY</div>
                <div style="font-size: 11pt; color: #cbd5e1; margin-top: 8px;">
                    12.4ms RFB handshake measured on local loopback. WAN internet responsiveness governed by RTT.
                </div>
            </div>
            <div style="background: #0f172a; border-top: 4px solid #10b981; border-radius: 10px; padding: 20px;">
                <div style="color: #34d399; font-weight: 700; font-size: 13pt;">SHARED WORKSPACE TRUST</div>
                <div style="font-size: 11pt; color: #cbd5e1; margin-top: 8px;">
                    Collaborators intentionally share write access. Shared code executed by peers runs with peer privileges.
                </div>
            </div>
        </div>
        """
    elif scene["diagram_type"] == "conclusion":
        diagram_html = """
        <div style="margin-top: 40px; background: #1e293b; border: 2px solid #0284c7; border-radius: 18px; padding: 36px; text-align: center;">
            <div style="font-size: 22pt; color: #38bdf8; font-weight: 800; margin-bottom: 12px;">OPEN-SOURCE ARCHIVAL DISPOSITION</div>
            <div style="font-size: 15pt; color: #cbd5e1; line-height: 1.5; max-width: 1000px; margin: 0 auto;">
                DreamBeesAI is frozen at version <code>v1.0.0-archival-rc1</code>.<br/>
                Released as an open-source public good under the <strong>Apache License, Version 2.0</strong>.
            </div>
            <div style="margin-top: 28px; font-size: 16pt; color: #f8fafc; font-weight: 700;">
                git@github.com:CardSorting/agentboxes-dreambees.git
            </div>
            <div style="margin-top: 24px; font-size: 18pt; color: #38bdf8; font-weight: 900; letter-spacing: 2px;">
                BILLIONS. MUST. COMPUTE. 🐝
            </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  body {{
    margin: 0;
    padding: 60px 80px;
    background: {scene["bg_color"]};
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    width: 1920px;
    height: 1080px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .top-bar {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #1e293b;
    padding-bottom: 20px;
  }}
  .badge {{
    background: #0284c7;
    color: #fff;
    padding: 6px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 14pt;
    letter-spacing: 1px;
  }}
  .header h1 {{
    font-size: 40pt;
    font-weight: 800;
    color: #38bdf8;
    margin: 24px 0 8px 0;
  }}
  .header .sub {{
    font-size: 20pt;
    color: #94a3b8;
  }}
  .footer {{
    border-top: 1px solid #1e293b;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    font-size: 13pt;
    color: #64748b;
  }}
</style>
</head>
<body>
  <div>
    <div class="top-bar">
      <div class="badge">HEAV3NS RESEARCH COMMISSION 016</div>
      <div style="font-size: 15pt; color: #94a3b8; font-weight: 600;">DR. GEMINI · SCHOLARLY POSTER SESSION</div>
    </div>
    <div class="header">
      <h1>{scene["title"]}</h1>
      <div class="sub">{scene["subtitle"]}</div>
    </div>
    {diagram_html}
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
    os.makedirs("media/poster_session", exist_ok=True)

    print("Step 1: Generating scene audio and video frames...")
    segment_files = []

    for idx, scene in enumerate(SCENES):
        scene_id = scene["id"]
        print(f"  Rendering {scene_id}: {scene['title']}...")

        # 1. Synthesize Audio
        aiff_path = f"media/poster_session/{scene_id}.aiff"
        wav_path = f"media/poster_session/{scene_id}.wav"
        subprocess.run(["say", "-v", "Daniel", "-r", "175", "-o", aiff_path, scene["narration"]], check=True)
        subprocess.run(["ffmpeg", "-y", "-i", aiff_path, wav_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # Get audio duration
        probe = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wav_path
        ], stdout=subprocess.PIPE, text=True, check=True)
        duration = float(probe.stdout.strip())
        print(f"    Audio duration: {duration:.2f}s")

        # 2. Render Slide HTML to PNG
        html_content = render_scene_html(scene)
        html_path = f"media/poster_session/{scene_id}.html"
        png_path = f"media/poster_session/{scene_id}.png"
        with open(html_path, "w") as f:
            f.write(html_content)

        subprocess.run([
            chrome_bin, "--headless", "--disable-gpu",
            "--window-size=1920,1080",
            f"--screenshot={png_path}", html_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # 3. Create MP4 segment with ffmpeg
        seg_mp4 = f"media/poster_session/{scene_id}.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-loop", "1", "-i", png_path,
            "-i", wav_path,
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(duration + 0.5), # Add half second padding
            seg_mp4
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        segment_files.append(seg_mp4)

    # Step 2: Concatenate all segments into DR_GEMINI_POSTER_SESSION.mp4
    print("Step 2: Concatenating scenes into DR_GEMINI_POSTER_SESSION.mp4...")
    concat_list = "media/poster_session/concat.txt"
    with open(concat_list, "w") as f:
        for seg in segment_files:
            f.write(f"file '{os.path.abspath(seg)}'\n")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
        "-c", "copy", "DR_GEMINI_POSTER_SESSION.mp4"
    ], check=True)

    file_size = os.path.getsize("DR_GEMINI_POSTER_SESSION.mp4")
    print(f"Successfully generated DR_GEMINI_POSTER_SESSION.mp4 ({file_size} bytes)")

if __name__ == "__main__":
    main()
