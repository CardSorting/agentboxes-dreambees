# DREAMBEES AGENTBOXES — UNIFIED AGENTBOX ARCHITECTURE
## Commission 009 Amendment I Implementation & Security Model

**Date:** October 14, 2026  
**Author:** Deputy Gemini, Engineering Agent  
**Commissioning Authority:** MAJO, Leading Executive Chair, HEAV3NS & EGG, Founding Custodian  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Classification:** Architectural & Security Specification  
**Doctrine:** *Bring Your Own Agent. We Bring the Box. The Box is the Product. The Agents are Applications.*

---

## I. Executive Architecture Summary

Under **Commission 009 Amendment I**, DreamBees AgentBoxes establishes a unified workstation paradigm:
> **"YOU DON'T RENT A DIFFERENT COMPUTER EVERY TIME YOU WANT TO OPEN A DIFFERENT APPLICATION."**  
> *One computer. Both supported agents. The customer provisions the box; the customer chooses the agent.*

Instead of provisioning separate workstation environments or maintaining divergent container images for Claude Code and OpenAI Codex:
1. **One Base Image:** `dreambeesai/agentbox:v1` includes both official CLI agents:
   - **Claude Code:** `@anthropic-ai/claude-code@2.1.300` (`/usr/local/bin/claude`)
   - **OpenAI Codex:** `@openai/codex@0.162.1` (`/usr/local/bin/codex`)
2. **One Shared Workstation:** A single Linux desktop (XFCE4 + Xvfb + RFB WebSocket bridge) with 2 vCPUs, 4 GB RAM, and 25 GB persistent NVMe storage.
3. **One Compute Allocation:** Switching agents consumes zero additional compute allocations, zero provisioning lag, and zero subscription re-purchases.
4. **Shared Workspace:** Both agents operate within `/home/operator/workspace` (`~/workspace`), enabling sequential multi-agent collaboration on the same codebase.

---

## II. Agent Packaging & Launchers

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DREAMBEES UNIFIED AGENTBOX                           │
│  Host OS: Linux (Bookworm) · Display: :0 (1440x900) · User: operator   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    BROWSER WEB VIEWER & DOCK                     │  │
│  │  [Terminal]  [Chrome]  [⚡ Claude]  [⚡ Codex]  [💾 Export Work] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                │                                       │
│              ┌─────────────────┴─────────────────┐                     │
│              ▼                                   ▼                     │
│   ┌─────────────────────┐             ┌─────────────────────┐          │
│   │  Anthropic Claude   │             │    OpenAI Codex     │          │
│   │    Code v2.1.300    │             │     CLI v0.162.1    │          │
│   └──────────┬──────────┘             └──────────┬──────────┘          │
│              │                                   │                     │
│              │ (BYOK Auth)                       │ (BYOK Auth)         │
│              ▼                                   ▼                     │
│      ~/.claude.json                       ~/.codex/auth.json           │
│      ~/.claude/                           ~/.codex/config.toml         │
│              │                                   │                     │
│              └─────────────────┬─────────────────┘                     │
│                                │                                       │
│                                ▼                                       │
│                 ┌─────────────────────────────┐                        │
│                 │      SHARED WORKSPACE       │                        │
│                 │   /home/operator/workspace  │                        │
│                 │   (git repo, source, tests) │                        │
│                 └─────────────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Recognized Launchers
Customers can launch either agent via their preferred interface:
- **Browser Quick Toolbar:** Dedicated `[⚡ Claude]` and `[⚡ Codex]` buttons on the floating top bar.
- **Desktop Agent Dock:** Branded desktop dock icons powered by `agentbox-shell.py`.
- **Integrated Terminal:** Standard command-line invocation (`claude` and `codex`).
- **XFCE Application Menu:** System launchers configured via `/opt/agentbox/launch-app`.

---

## III. Independent Authentication & Credential Storage (BYOK)

Both agents follow a zero-platform-exposure Bring-Your-Own-Key (BYOK) model. DreamBees never proxies, stores, or handles customer inference credentials.

| Agent | Official Provider | Auth Methods | Credential Storage | Environment Variable |
|---|---|---|---|---|
| **Claude Code** | Anthropic | `claude login` (OAuth) or API Key | `/home/operator/.claude.json`<br>`/home/operator/.claude/` | `ANTHROPIC_API_KEY` |
| **OpenAI Codex** | OpenAI | `codex login` (Device code) or API Key | `/home/operator/.codex/auth.json`<br>`/home/operator/.codex/config.toml` | `OPENAI_API_KEY` |

---

## IV. Security & Isolation Analysis: The Single OS User Boundary

Commission 009 Amendment I mandates addressing the technical realities of sharing an OS user:
> *"One important technical distinction: separate credential directories do not, by themselves, prevent two agents running as the same Linux user from reading each other's credentials. Deputy Gemini should either enforce a real access boundary or clearly document that both agents operate within the same trusted customer environment."*

### 1. The Single-Tenant Operating Model
DreamBees AgentBoxes are **single-tenant dedicated computers** assigned to a single customer:
- The customer owns their Anthropic account and their OpenAI account.
- This architecture mirrors a developer's local laptop (e.g. running Claude Code and Codex CLI under the same macOS or Linux user account).
- Strict multi-tenant isolation is enforced at the container, volume, and network perimeter between different customers:
  - Docker network bridge isolation (`com.docker.network.bridge.enable_icc=false`).
  - Dedicated Docker volume mounts per tenant box.
  - Gateway route authorization (`403 Forbidden` on tenant ID mismatch).

### 2. File Permissions & POSIX DAC Reality
- All files in the home volume are governed by `umask 077`:
  - `~/.claude.json`: mode `0600` (`-rw-------`)
  - `~/.codex/auth.json`: mode `0600` (`-rw-------`)
- **Limitation of Shared User:** Because both Claude Code and Codex execute as `uid=1000:gid=1000` (`operator`), any arbitrary shell command executed by Claude has POSIX permission to read `~/.codex/auth.json`, and vice versa. Separate configuration directories prevent *accidental namespace collisions*, but do not constitute an adversarial security boundary between the two applications.
- **Why This Is Acceptable:** The customer trusts both tools on their workstation to write and test code. Attempting to run each agent under a separate UID inside the desktop would break seamless shell interoperability (e.g., file permissions conflicts when Claude edits a file created by Codex in `~/workspace`).

### 3. Application-Level Sandboxing
- **Codex Built-In Sandbox:** OpenAI Codex CLI features a native Linux filesystem and network sandbox (`codex-linux-sandbox` and `codex-execve-wrapper`), defaulting to `workspace-write` policy. This restricts subcommands spawned by Codex from altering files outside `/home/operator/workspace`.
- **Claude Project Scope:** Claude Code enforces a project boundary at `/home/operator/workspace` and requires user confirmation before accessing files outside the repository root.

### 4. Zero Credential Leakage in Workspace Exports
The workspace export pipeline (`GET /api/boxes/:id/export` or "💾 Export Work") archives exclusively the designated workspace directory:
```bash
docker exec --user 1000:1000 <container> tar -czf - -C /home/operator/workspace .
```
- **Physical Exclusion:** Credentials stored in `~/.claude*`, `~/.codex*`, and home dotfiles are physically outside `/home/operator/workspace`.
- Verified in `tests/test-unified-agentbox.ts`: Exported `.tar.gz` archives contain `0` credential files.

---

## V. Multi-Agent Collaborative Workflows

Because both agents share the same persistent volume at `/home/operator/workspace`, customers can execute collaborative multi-agent workflows without syncing across machines:

### Example Workflow: Pair Architecture & Testing
1. **Application Scaffolding (Claude Code):**
   ```bash
   claude -p "Create an Express REST API for a task manager in index.js"
   ```
2. **Test Generation & Verification (OpenAI Codex):**
   ```bash
   codex "Inspect index.js and write a complete suite of integration tests in test.js using node:test"
   ```
3. **Execution & Validation (Terminal):**
   ```bash
   node --test test.js
   ```
4. **Export Artifacts:**
   Click **"💾 Export Work"** to download the clean project archive.

---

## VI. Verification & Test Evidence

Commission 009 Amendment I has been validated through the automated test suite `tests/test-unified-agentbox.ts`:

```bash
node --import tsx --test tests/test-unified-agentbox.ts
```

### Observed Execution Log:
```
--- [Step 1] Provision Unified AgentBox with both agents ---
✔ Single AgentBox provisioned with installedAgents: ['claude-code', 'openai-codex']

--- [Step 2] Verify official CLIs in container PATH ---
  Claude Code Version: 2.1.300 (Claude Code)
  OpenAI Codex Version: codex-cli 0.162.1

--- [Step 3] Verify CLI health / doctor diagnostics ---
  Claude doctor: No installation issues found (exit 0)
  Codex doctor: Diagnostic report generated

--- [Step 4] Verify independent credential paths & isolation ---
  Claude config: ~/.claude.json (mode 0600)
  Codex config:  ~/.codex/auth.json (mode 0600)

--- [Step 5] Shared workspace collaboration across both agents ---
  calculator.js created by Agent 1
  calculator.test.js created by Agent 2
  Shared workspace node test passed!

--- [Step 6] Test concurrent execution & resource monitoring ---
  Concurrent CLI background execution: PASSED
  Measured Footprint: CPU 0.16% | RAM 58 MiB | PIDs 13 (Well within 4GB limit)

--- [Step 7] Export workspace archive & verify credential protection ---
  Archive files: ./, ./STARTER_TASKS.md, ./calculator.js, ./calculator.test.js
  Credential Exclusion: VERIFIED (Zero key leakage)

--- [Step 8] Teardown & Purge Environment ---
  Container destroyed, workspace and home volumes purged from disk.

✔ Commission 009 Amendment I Unified AgentBox verified successfully!
```

---

## VII. Conclusion

Commission 009 Amendment I restores the fundamental elegance of DreamBees:
**One Computer. One Allocation. Multiple Agents. The Customer Chooses.**
