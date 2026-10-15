# 05 — Agent Applications
## Claude Code, OpenAI Codex & The BYOA Ecosystem

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. The BYOA (Bring Your Own Agent) Architecture

DreamBeesAI does not develop, train, or host proprietary artificial intelligence models. Instead, it serves as a hardened, managed execution host for official developer agents released by foundation model providers.

Under the BYOA doctrine:
1. **Official Upstream Tooling:** Agents are installed from official public distribution packages during container image build.
2. **Zero API Key Markup:** Customers authenticate directly with model providers using their existing subscriptions (e.g. Anthropic Console / Claude Pro/Team accounts, or OpenAI Developer Platform keys).
3. **Control Plane Isolation:** DreamBees' control plane never intercepts, proxies, logs, or stores customer API keys or prompt payloads.

---

## 2. Supported AI Agent Applications

### 2.1 Anthropic Claude Code
- **Package:** `@anthropic-ai/claude-code` (v2.1.300)
- **Binary Location:** `/usr/local/bin/claude`
- **Execution Interface:** Terminal CLI & XFCE Desktop application launcher (`/usr/share/applications/claude-code.desktop`)
- **Capabilities in AgentBox:**
  - Full bash tool execution inside `/home/operator/workspace`.
  - Multi-file editing, Git commits, branch creation.
  - Test runner execution (Node.js, Python, Rust, Go).
  - Chrome browser automation for UI verification.

### 2.2 OpenAI Codex CLI
- **Package:** `@openai/codex` (v0.162.1)
- **Binary Location:** `/usr/local/bin/codex`
- **Execution Interface:** Terminal CLI & XFCE Desktop application launcher (`/usr/share/applications/openai-codex.desktop`)
- **Capabilities in AgentBox:**
  - Automated code generation and refactoring.
  - Terminal command suggestion and execution.
  - Interactive debugging sessions.

---

## 3. Official Installation & Container Integration

Both agent tools are pre-installed during image compilation via [`Dockerfile.agentbox`](file:///Users/bozoegg/Desktop/dreambeesai/Dockerfile.agentbox):

```dockerfile
# Excerpt from Dockerfile.agentbox
RUN npm install -g \
    @anthropic-ai/claude-code@2.1.300 \
    @openai/codex@0.162.1 \
    && chmod +x /usr/local/bin/claude \
    && chmod +x /usr/local/bin/codex
```

### Desktop Application Launchers:
To ensure accessibility for non-command-line developers, desktop launchers are registered with XFCE:
- **Claude Code Launcher:** Executes `xfce4-terminal --title="Claude Code Workstation" -e "claude"`
- **OpenAI Codex Launcher:** Executes `xfce4-terminal --title="OpenAI Codex Workstation" -e "codex"`
- **Unified App Dispatcher:** Script at `/opt/agentbox/open-app` allows launching tools programmatically from the Web UI.

---

## 4. Authentication Procedures (BYOK)

Because DreamBees does not bundle proprietary keys, users authenticate directly through their terminal session:

### Method A: Interactive OAuth Login (Recommended)
1. Open your desktop session in the browser.
2. Click the **Claude Code** icon on the desktop or dock.
3. The terminal displays the official Anthropic OAuth URL.
4. Copy the URL, open Google Chrome (pre-installed inside the AgentBox desktop), sign into your Anthropic account, and approve the authorization token.
5. The token is saved securely in your private home directory (`~/.claude.json`).

### Method B: Environment Variable Injection
Alternatively, users can supply API keys via the Web UI Settings tab before launching:
- `ANTHROPIC_API_KEY=sk-ant-api03-...`
- `OPENAI_API_KEY=sk-proj-...`

Keys injected via the API are written exclusively to the user's private `0700` profile configuration inside the container and are never stored in plain text in the central database.

---

## 5. Supported vs. Unsupported Workloads

| Workload Domain | Supported Status | Technical Context |
| :--- | :--- | :--- |
| **Node.js, TypeScript, React, Next.js** | **FULLY SUPPORTED** | Node 22 LTS, npm, and Chrome installed for headless & visual testing. |
| **Python, Django, FastAPI** | **FULLY SUPPORTED** | Python 3.12, pip, virtualenv, and poetry available. |
| **C / C++ / Rust Compilations** | **FULLY SUPPORTED** | `build-essential`, `gcc`, `make`, and `curl` available. |
| **Git Repositories & Submodules** | **FULLY SUPPORTED** | Git 2.43+ with scoped directory permissions and SSH support. |
| **Docker-in-Docker (DinD)** | **NOT SUPPORTED** | Containers run unprivileged without `/var/run/docker.sock` to prevent host container breakout. |
| **Direct GPU Acceleration** | **NOT SUPPORTED (DEFAULT)**| Runs on CPU framebuffers (Xvfb); GPU passthrough requires custom NVIDIA Container Toolkit host config. |
