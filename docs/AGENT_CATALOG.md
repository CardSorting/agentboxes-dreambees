# Curated Agent Catalog Specification
## Commission 007 · Curated Third-Party Agent Registry

### 1. Catalog Principles

1. **We Provide the Computer, Not the Inference**: Customers bring their own subscriptions, API keys, and quotas.
2. **Honest Compatibility**: If a tool lacks an official or functional Linux distribution (e.g. Apple Xcode), it is marked `unavailable` with an explicit technical explanation. No fabricated compatibility.
3. **Independent Maintenance**: Agent recipes install directly into persistent user storage (`/home/operator/.local`) without requiring base image rebuilds.

---

### 2. Supported Tools Matrix

| ID | Agent Name | Category | Status | Auth Model | Official Packaging |
|---|---|---|---|---|---|
| `openai-codex` | OpenAI Codex | Terminal Agent | Available | Device Code / API Key | Pre-installed CLI / npm `@openai/codex` |
| `claude-code` | Claude Code | Terminal Agent | Available | BYOK API Key (`ANTHROPIC_API_KEY`) | npm `@anthropic-ai/claude-code` |
| `cursor` | Cursor Editor | AI IDE | Available | Browser OAuth / Cursor Pro | Linux x86_64 AppImage |
| `google-antigravity` | Google Antigravity | Terminal Agent | Available | BYOK (`GEMINI_API_KEY`) | Antigravity CLI (`agy`) |
| `hermes-agent` | Hermes Agent | Autonomous Agent | Available | BYOK (`OPENROUTER_API_KEY`) | Python CLI / Nous Research |
| `openclaw` | OpenClaw | Autonomous Scraper | Available | BYOK (`OPENCLAW_API_KEY`) | Python CLI runner |
| `grok-tools` | Grok CLI & Tools | Terminal Agent | Available | BYOK (`XAI_API_KEY`) | `xai-sdk` / `grok-cli` |
| `muse` | Muse Agent | Autonomous Agent | Preview | BYOK (`MUSE_API_KEY`) | Node.js CLI companion |
| `aider` | Aider Chat | Coding Companion | Available | BYOK (Any LLM API Key) | Python `aider-chat` |
| `apple-xcode-agent` | Apple Xcode Agent | AI IDE | **Unavailable** | Subscription | macOS/Darwin only |

---

### 3. Detailed Tool Configurations & BYOK Guides

#### OpenAI Codex (`openai-codex`)
- **Package**: `@openai/codex` v0.150.1 (Bundled in base image).
- **Authentication**:
  - Run `codex login` in terminal to authenticate via device code.
  - Or export `OPENAI_API_KEY="sk-..."` in `~/.bashrc`.
- **Session Persistence**: Saved in `~/.codex/auth.json` on the persistent home volume.

#### Claude Code (`claude-code`)
- **Publisher**: Anthropic.
- **Authentication**:
  - Export `ANTHROPIC_API_KEY="sk-ant-..."` in `~/.bashrc`.
- **Installation**: User space binary in `~/.local/bin/claude`.

#### Cursor IDE (`cursor`)
- **Publisher**: Anysphere.
- **Packaging**: Extracted Linux AppImage configured to launch with `--no-sandbox`.
- **Authentication**: Launches Chrome for browser-based OAuth with Cursor Pro account.

#### Google Antigravity (`google-antigravity`)
- **Publisher**: Google DeepMind / Google Cloud.
- **Authentication**:
  - Export `GEMINI_API_KEY="AIza..."` in `~/.bashrc`.
- **Verification**: Run `agy doctor` inside the desktop terminal.

#### Hermes Agent (`hermes-agent`)
- **Publisher**: Nous Research.
- **Authentication**:
  - Set `OPENROUTER_API_KEY="sk-or-..."` in `~/.bashrc`.
  - Also compatible with local Ollama or custom OpenAI-compatible endpoints (`--api-base`).

#### Apple Xcode Agent (`apple-xcode-agent`)
- **Status**: **UNAVAILABLE**.
- **Technical Justification**: Apple Xcode and its developer toolchain require Darwin kernel, macOS system frameworks (CoreGraphics, Cocoa, Metal), and Apple hardware. No native or functional Linux distribution exists. In accordance with Commission 007 Section III, compatibility is not fabricated.
