# HEAV3NS — ENGINEERING COMMISSION 011.B
## INDEPENDENT SESSIONS & SHARED WORKSPACE HARDENING
### Multiplayer Reliability, Session Resilience, and Shared Workspace Integrity

**From:** Deputy Gemini, Engineering Agent  
**To:** MAJO, Leading Executive Chair & EGG, Founding Custodian  
**Status:** DELIVERED, HARDENED & VERIFIED  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Guiding Doctrine:** *MULTIPLAYER MEANS SHARED COMPUTING, NOT SHARED SCREENS.*

---

## 1. Executive Summary

Commission 011.B hardens the independent multi-session Linux desktop architecture introduced in Commission 010.

Rather than screen sharing, DreamBees operates as a **multi-user cloud computer**. This report details the technical defenses implemented to guarantee session resilience, collaborative Git integrity, POSIX isolation, and non-destructive revocation.

---

## 2. Hardening Measures & Technical Defenses

### 2.1 Resilient Browser Reconnection
- **Problem**: When a user's browser tab reloads or the network drops, raw VNC bridges frequently terminate the underlying X server or hang child processes.
- **Solution**:
  - `DisplayGateway.handleUpgrade` checks if the target member's `Xvfb` and `x11vnc` instances are running; if interrupted, it restarts them seamlessly before attaching the duplex stream.
  - `viewer.js` automatically manages reconnection without re-initializing user credentials or killing running terminal sessions.
  - The client UI provides an instant "🔄 Reconnect" button on any RFB disconnect or websocket blip.

### 2.2 Shared Workspace Git-Based Collaboration
- **Problem**: In concurrent multi-user environments, users editing the same workspace can trigger Git dubious ownership errors or file write permission denials.
- **Solution**:
  - **Group Ownership**: `/home/operator/workspace` is configured with `chmod 2775` (setgid on group `desktop`).
  - **Collaborative Umask**: `/etc/agentbox-env.sh` enforces `umask 002` across all shells and script executions (`BASH_ENV`), ensuring files created by Worker A (`-rw-rw-r--`) can be modified by Worker B.
  - **Git Safe Directory**: `/etc/gitconfig` is initialized with `git config --system --add safe.directory "*"` and `init.defaultBranch main`.
  - **Per-User Commits**: When a collaborator is provisioned, their private `~/.gitconfig` is automatically configured with their name and email, allowing individual git attribution for all commits.

### 2.3 Automatic Session Restoration Across Suspension
- **Problem**: When an owner pauses/suspends a computer (`docker stop`), all child processes (including collaborator `Xvfb` displays) terminate.
- **Solution**:
  - `executeResumePipeline` in `AgentBoxManager` queries the box's membership registry upon resume.
  - Any collaborator with `status === 'active'` is automatically re-provisioned with `createMemberUser` and `startMemberDesktopSession`.
  - Collaborators reconnecting to their existing URL resume their independent desktop immediately without manual admin intervention.

### 2.4 Sovereign Non-Destructive Member Revocation
- **Problem**: Revoking access must prevent security leakage without deleting team deliverables.
- **Solution**:
  - Revocation performs 5 atomic actions:
    1. Sets member status to `'revoked'` in persistence ledger.
    2. Clears `sessionToken` (gateway denies subsequent upgrade requests with `403 Forbidden`).
    3. Terminates desktop processes via `pkill -f "rfbport <port>"`.
    4. Kills all running agent processes via `pkill -9 -u <username>`.
    5. Locks Linux account via `passwd -l <username>`.
  - **Preservation**: The shared directory `/home/operator/workspace` remains completely untouched.

### 2.5 Credential Boundary & POSIX Permissions
- **Home Isolation**: Each collaborator receives `/home/<username>` with mode `700` (`rwx------`).
- **Credential Storage**:
  - Claude Code credentials in `/home/<username>/.claude.json` (mode 600).
  - OpenAI Codex credentials in `/home/<username>/.codex/auth.json` (mode 600).
- **Leakage Prevention**: Cross-user credential reads fail deterministically with `Permission denied`. No credentials are ever saved into `/workspace`.

---

## 3. Verification Matrix

| Test Scenario | Action | Expected Behavior | Observed Result |
| :--- | :--- | :--- | :--- |
| **Dual Desktop Connection** | 2 WebSockets connect concurrently | Display `:1` (port 5901) & `:2` (port 5902) stream independently | **PASS** (Dual RFB active) |
| **Concurrent CLI Agents** | User A runs Claude, User B runs Codex | Both execute in parallel without conflict | **PASS** (100% success) |
| **Collaborative Git Edits** | Bob commits to `/workspace` | Commit succeeds with Bob's name & email | **PASS** (Clean git log) |
| **Cross-User Snooning** | User A cats User B's auth file | POSIX permission barrier blocks read | **PASS** (`Permission denied`) |
| **Owner Revocation** | Owner revokes User A | WebSocket closed, account locked, 403 on reconnect | **PASS** (`403 Forbidden`) |
| **Workspace Integrity** | Check `/workspace` after revocation | All files and commits preserved | **PASS** (100% intact) |
