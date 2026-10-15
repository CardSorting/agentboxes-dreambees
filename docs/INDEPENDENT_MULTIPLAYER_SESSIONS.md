# HEAV3NS — ENGINEERING COMMISSION 010 (AMENDMENT I)
## DREAMBEES AGENTBOXES — INDEPENDENT MULTIPLAYER SESSIONS
### Architecture, Security, Session Isolation, and Acceptance Verification

**From:** Deputy Gemini, Engineering Agent  
**To:** MAJO, Leading Executive Chair & EGG, Founding Custodian  
**Status:** IMPLEMENTED & VERIFIED  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Doctrine:** *ONE BOX. MULTIPLE USERS. INDEPENDENT DESKTOPS. SHARED WORKSPACE. OWNER-CONTROLLED ACCESS.*

---

## 1. Executive Summary

Commission 010 Amendment I supersedes screen-sharing collaboration models. Multiplayer AgentBoxes are **multi-user Linux workstations** running within a single provisioned container environment.

Rather than mirroring a single display canvas between multiple viewers, each authorized team member receives:
1. An **independent virtual desktop session** (Display `:1`, `:2`, etc., running private Xvfb and RFB servers on ports `5901`, `5902`, etc.).
2. An **isolated Linux user identity** with a private home directory (`/home/<username>`, mode `700`).
3. **Private BYOK agent credentials** (`~/.claude.json`, `~/.codex/auth.json`) strictly guarded by POSIX access control.
4. Concurrently accessible **shared project workspace** (`/home/operator/workspace`, mode `2775` with `desktop` group setgid).
5. **Instant owner-controlled access revocation** that terminates sessions, terminates agent processes, locks account access, and preserves all workspace deliverables intact.

---

## 2. Multi-Session Architectural Blueprint

```
+-----------------------------------------------------------------------------------+
| DREAMBEES AGENTBOX (Single Container / Power Tier Allocation: 8GB RAM, 4 vCPUs)     |
|                                                                                   |
|  +---------------------------+             +---------------------------+          |
|  | WORKER A (Alice)          |             | WORKER B (Bob)            |          |
|  | - Linux User: workera     |             | - Linux User: workerb     |          |
|  | - Home: /home/workera     |             | - Home: /home/workerb     |          |
|  |   (mode 700: rwx------)   |             |   (mode 700: rwx------)   |          |
|  | - Credentials:            |             | - Credentials:            |          |
|  |   ~/.claude.json          |             |   ~/.codex/auth.json      |          |
|  | - Active Agent:           |             | - Active Agent:           |          |
|  |   claude-code (PID 214)   |             |   codex-cli (PID 289)     |          |
|  | - Desktop: Display :1     |             | - Desktop: Display :2     |          |
|  |   (Xvfb + x11vnc :5901)   |             |   (Xvfb + x11vnc :5902)   |          |
|  +-------------+-------------+             +-------------+-------------+          |
|                |                                         |                        |
|                +--------------------+--------------------+                        |
|                                     |                                             |
|                                     v                                             |
|                     +-------------------------------+                             |
|                     | SHARED PROJECT WORKSPACE      |                             |
|                     | Path: /home/operator/workspace|                             |
|                     | Perms: 2775 (setgid: desktop) |                             |
|                     | umask: 002 (group-writable)   |                             |
|                     | - Git Version Control         |                             |
|                     | - Shared Project Artifacts    |                             |
|                     | - Preserved Across Revocations|                             |
|                     +-------------------------------+                             |
+-----------------------------------------------------------------------------------+
                                      ^
                                      |
                     +---------------------------------+
                     | DREAMBEES DISPLAY GATEWAY       |
                     | - Token & Tenant Verification   |
                     | - Member Display Multiplexing   |
                     | - Port Mapping:                 |
                     |   * Member A -> 5901 (Display:1)|
                     |   * Member B -> 5902 (Display:2)|
                     | - Instant 403 on Revoked Tokens |
                     +---------------------------------+
```

---

## 3. Core Subsystems

### 3.1 Display Multiplexer & Gateway Routing
- **Per-User Virtual Displays**: Displays `:1` through `:10` are allocated dynamically upon member invitation.
- **Port Isolation**: Each session runs its own `Xvfb :<N>` and `x11vnc -rfbport <5900+N> -localhost` instance.
- **Display Bridge**: `/opt/agentbox/display-bridge.py <port>` bridges stdin/stdout RFB traffic directly to the specific member's VNC port.
- **Gateway Authentication**:
  - `ws://host/api/boxes/:id/display?member=<userId>&token=<sessionToken>`
  - The DisplayGateway inspects the membership table:
    - If member is revoked or token is missing/invalid: returns HTTP `403 Forbidden`.
    - If valid: connects the WebSocket stream directly to `display(boxId, { port: 5900 + displayNumber, username: member.username })`.

### 3.2 Linux User & Security Isolation
- **User Creation**: `useradd -m -u <uid> -g desktop -s /bin/bash <username>` adds the user to the shared `desktop` group (GID 1000).
- **Home Privacy**: `chmod 700 /home/<username>` ensures that no other non-root user can traverse, read, or list private directories.
- **Agent BYOK Storage**:
  - Claude credentials written to `/home/<username>/.claude.json` (mode 600).
  - Codex credentials written to `/home/<username>/.codex/auth.json` (mode 600).
  - Attempting to read another user's credential file fails immediately with `Permission denied` (POSIX enforcement).

### 3.3 Collaborative Group Workspace
- **Directory**: `/home/operator/workspace` (symlinked into every member's home as `~/workspace`).
- **Group Setgid**: `chmod 2775 /home/operator/workspace` ensures that all files and directories created within inherit group `desktop`.
- **Environment Umask**: `BASH_ENV=/etc/agentbox-env.sh` enforces `umask 002` across both interactive sessions and script invocations.
- **Collaborative Editing**: Files created by Worker A (`-rw-rw-r--`) can be immediately modified, appended to, and committed by Worker B.

### 3.4 Owner-Controlled Membership & Revocation Lifecycle
The box owner exercises complete authority over collaborators:
1. `inviteMember(boxId, ownerTenantId, { userId, username, displayName, email, role })`:
   - Allocates next available display slot (`:1`, `:2`...).
   - Generates cryptographically secure session token (`crypto.randomBytes(32).toString('hex')`).
   - Provisions Linux user identity and symlinks shared workspace.
   - Starts dedicated Xvfb and RFB servers.
2. `revokeMember(boxId, ownerTenantId, { userId })`:
   - Sets membership status to `'revoked'`.
   - Clears `sessionToken` to instantly deny new gateway connections.
   - Calls `stopMemberDesktopSession` (terminates Xvfb and VNC on that display).
   - Calls `revokeMemberAccess` (executes `pkill -9 -u <username>` to kill running agent processes and `passwd -l` to lock account).
   - Leaves `/home/operator/workspace` untouched, preserving all team contributions.

---

## 4. Acceptance Evidence: 15-Step Verification

The automated verification suite (`tests/test-multiplayer-acceptance.ts`) executes the full 15-step Commission 010 Amendment I test:

| Step | Acceptance Requirement | Test Action | Result |
| :--- | :--- | :--- | :--- |
| **1** | Provision one AgentBox | `manager.createBox` with power tier | **PASS** (Running, container healthy) |
| **2** | Invite two independent users | `inviteMember` for User A (Display :1) & User B (Display :2) | **PASS** (Tokens generated, displays mapped) |
| **3** | Authenticate both users | BYOK storage: User A (`.claude.json`), User B (`.codex/auth.json`) | **PASS** (Isolated credentials verified) |
| **4** | Establish two separate graphical desktops | Connect distinct WebSockets to DisplayGateway | **PASS** (Dual concurrent RFB streams active) |
| **5** | Run Claude Code in Session A | `claude --version` as User A | **PASS** (Claude Code 2.1.300 invoked) |
| **6** | Run Codex in Session B | `codex --version` as User B | **PASS** (Codex CLI 0.162.1 invoked) |
| **7** | Verify concurrent execution | Parallel execution of Claude & Codex | **PASS** (Both agents succeed concurrently) |
| **8** | Verify shared project collaboration | User A creates `service.js`; User B appends code | **PASS** (Collaborative edits visible to both) |
| **9** | Verify credential & desktop isolation | A attempts reading B's auth; B attempts reading A's auth | **PASS** (100% blocked with `Permission denied`) |
| **10** | Disconnect Session A | Close User A WebSocket stream | **PASS** (Session A closes; Session B unaffected) |
| **11** | Revoke User A | Owner issues `revokeMember` for User A | **PASS** (Status `revoked`, token revoked, processes killed) |
| **12** | Verify User A cannot reconnect | User A attempts WebSocket reconnection | **PASS** (Gateway responds `403 Forbidden`) |
| **13** | Verify User B continues working | User B modifies shared project file | **PASS** (Work continues uninterrupted) |
| **14** | Verify shared files remain intact | Inspect `/workspace/service.js` | **PASS** (All previous and ongoing work intact) |
| **15** | Export deliverables & terminate | Download workspace tarball & decommission container | **PASS** (Tarball downloaded, clean teardown) |

---

## 5. Architectural Verdict

DreamBees AgentBoxes satisfies Commission 010 Amendment I:
- **No screen mirroring**: Each collaborator receives a true, private desktop session.
- **One computer**: A single container hosts all team members within a shared hardware budget.
- **Strict POSIX isolation**: Zero credential or home directory leakage between team members.
- **Frictionless collaboration**: Shared workspace with setgid and group write permissions enables seamless teamwork.
- **Sovereign owner control**: Instant member revocation without collateral data loss.

**ONE BOX. MULTIPLE USERS. INDEPENDENT DESKTOPS. SHARED WORKSPACE. OWNER-CONTROLLED ACCESS.**
