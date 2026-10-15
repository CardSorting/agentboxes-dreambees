# 🐝 DreamBees AgentBoxes — Starter Tasks
## Unified Agent Workstation (Claude Code & OpenAI Codex)

Welcome to your isolated Linux AgentBox! Both official agents are preinstalled and share the `~/workspace` directory.

---

### Step 1: Sign in with your Agent Account (BYOK)

Choose your preferred agent or use both:

#### 🟣 Option A: Anthropic Claude Code
Open terminal and run:
```bash
claude login
```
*Or set your API key in environment:*
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```
*Credentials stored in: `~/.claude.json`*

#### 🟢 Option B: OpenAI Codex CLI
Open terminal and run:
```bash
codex login
```
*Or set your API key in environment:*
```bash
export OPENAI_API_KEY="sk-..."
```
*Credentials stored in: `~/.codex/auth.json`*

> **Security & Isolation:** Each provider's credentials reside in their respective private config directories (`~/.claude` and `~/.codex`) within your private container. Exported archives only bundle `~/workspace`, never your credentials.

---

### Step 2: Try a Safe Starter Task

#### 🌟 Task with Claude Code:
```bash
claude -p "Create an interactive CLI weather dashboard in Python with ASCII graphics and save it to weather.py"
python3 weather.py
```

#### 🌟 Task with OpenAI Codex:
```bash
codex "Create a playable single-page Space Invaders clone in index.html with smooth keyboard controls"
google-chrome index.html &
```

#### 🌟 Sequential / Multi-Agent Collaboration in Shared Workspace:
Both agents operate on the same files in `~/workspace`. For example:
1. Have Claude Code design the application: `claude -p "Create hello.js with a greeting function"`
2. Have Codex generate the test suite: `codex "Add comprehensive unit tests in test.js for hello.js"`
3. Run tests in terminal: `node --test test.js`

---

### Step 3: Export Your Work

When you are ready to download your created files to your personal laptop:
1. Click the **"💾 Export Work"** button on the floating session bar at the top-right of your screen.
2. A `.tar.gz` archive containing all your workspace files will download immediately.
3. Provider credentials (`~/.claude`, `~/.codex`) are automatically excluded from the archive.

---

### Step 4: Finishing Your Session
- **To Pause & Save Money:** Click the **"⏸️ Suspend"** button. Your compute will stop (stopping billing), but your files in this workspace will be 100% preserved.
- **To Permanently Delete:** Click **"🛑 Teardown"** to permanently destroy the workstation and purge all data.
- **To Delete Everything:** Click **"✕"** → **"Destroy"** to permanently delete the container and wipe all credentials.
