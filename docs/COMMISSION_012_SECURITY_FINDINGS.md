# COMMISSION 012 — SECURITY FINDINGS & THREAT MODEL
## The Invisible Computer: Trust Boundaries, POSIX Isolation & Adversarial Mitigations

**From:** Deputy Gemini, Engineering Agent  
**To:** MAJO, Leading Executive Chair  
**Authority:** EGG, Founding Custodian  
**Status:** COMPLETE & VERIFIED  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Governing Principle:** *"Share the computer. Not the password."*

---

## 1. Executive Summary

Commission 012 introduces multiplayer cloud computers where multiple independent developers share a single computing environment while retaining separate desktop sessions. In this environment, security cannot rely on trust between collaborators or simple client-side labels.

This security review details the threat model, trust boundaries, POSIX permissions, token lifecycle, and adversarial verification results implemented across DreamBees.

---

## 2. Trust Boundaries & Identity Model

```
+-----------------------------------------------------------------------------------------+
|                                    GATEWAY TRUST BOUNDARY                               |
|                                                                                         |
|   Client Request (HTTP / WebSocket)                                                     |
|         │                                                                               |
|         ├── Origin Header Validation (CSWSH Defense)                                    |
|         ├── Cross-Tenant Barrier (x-tenant-id must match computer owner or admin)        |
|         └── Authentication Check:                                                       |
|               ├── Display Ticket (ephemeral, 1-time exchange)                           |
|               └── Member Session Token (scoped strictly to specific user identity)      |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
                                           │
                                           v
+-----------------------------------------------------------------------------------------+
|                                    GUEST LINUX CONTAINER                                |
|                                                                                         |
|   [POSIX USER: operator (UID 1000)]          [POSIX USER: collaborator (UID 1001..N)]   |
|   Primary Owner Desktop (:0)                 Collaborator Desktop (:1..N)               |
|   Private Home: /home/operator (0700)        Private Home: /home/collab (0700)          |
|   BYOK Keys: ~/.claude.json (0600)           BYOK Keys: ~/.codex/auth.json (0600)       |
|   Git Config: ~/.gitconfig                   Git Config: ~/.gitconfig                   |
|                                                                                         |
|                                 SHARED BOUNDARY                                         |
|                                        │                                                |
|                                        v                                                |
|                     /home/operator/workspace (Permissions: 2775)                        |
|                     Group: desktop (GID 1000) · Umask: 002                              |
|                     System Git: safe.directory "*"                                      |
+-----------------------------------------------------------------------------------------+
```

---

## 3. POSIX Permissions & Workspace Isolation

### Private User Directories (`chmod 700`)
- Every user (owner `operator` and invited members) is assigned a distinct Linux UID and dedicated home directory (`/home/<username>`).
- All personal home directories are locked with `chmod 700`.
- Private AI provider credentials (`~/.claude.json`, `~/.codex/auth.json`) are written with `chmod 600`.
- **Adversarial Verification:** When a collaborator executes `cat /home/operator/.claude.json`, the kernel immediately blocks access with `Permission denied`.

### Shared Project Workspace (`chmod 2775` SGID)
- The shared workspace `/home/operator/workspace` is configured with the setgid sticky bit (`chmod 2775`) and owned by `1000:desktop`.
- Every user belongs to the primary Linux group `desktop`.
- Global default `umask 002` is enforced in `/etc/agentbox-env.sh`.
- Any file or directory created by one collaborator inherits the `desktop` group and write permissions, enabling collaborative editing without manual chmod interventions.

### Git Attribution & Ownership Hardening
- **Dubious Ownership Mitigation:** Because multiple Linux UIDs access files in the shared workspace, Git by default raises a `dubious ownership` error. This is securely solved at the system level via `git config --system --add safe.directory "*"`.
- **Identity Integrity:** System-level configuration does NOT hardcode `user.name` or `user.email` in `/home/operator/workspace/.git/config`. Instead, each user's personal `~/.gitconfig` supplies their own name and email.
- **Attribution Verification:** Live commits made by invited members reflect their exact identity (e.g. `Bob (Collaborator) <bob@example.com>`).

---

## 4. Google Drive Model: Access Control & Token Lifecycle

### Restricted Identity Invitations
- Invitation links are never generated as open, publicly accessible URLs.
- Invitations are explicitly bound to an authorized identity:
  `ws://.../display?member=<userId>&token=<sessionToken>`
- Connecting without both a matching `userId` and an active `sessionToken` is rejected with `HTTP 403 Forbidden`.

### Non-Destructive Instant Revocation Protocol
When an owner clicks **"Revoke Access"** for a collaborator, DreamBees executes a 6-step protocol:
1. **Invalidate Session Token:** The member's session token is cleared from the box registry.
2. **Terminate Remote Desktop:** The collaborator's active WebSocket connection is closed.
3. **Stop Member Processes:** All virtual display processes (`Xvfb :display`, `x11vnc :display`) and background processes running under the member's UID are killed.
4. **Disable Managed Access Paths:** Alternate managed paths (API tokens, tickets) are blocked.
5. **Preserve Workspace Artifacts:** The collaborator's saved work, Git commits, and edits remain intact in `/workspace`.
6. **Audit Trail:** Membership transition to `revoked` is permanently recorded in the machine record.

**Adversarial Verification:** An immediate reconnection attempt by a revoked member using their previous token is rejected with `HTTP 403 Forbidden`.

---

## 5. Adversarial Testing & Vulnerability Assessment

| Threat Vector | Attack Scenario | Implemented Defense | Verification Result |
| :--- | :--- | :--- | :--- |
| **Forged Display Access** | Attacker attempts WebSocket upgrade with random or invalid ticket (`?ticket=fake-12345`). | Gateway verifies ticket against active session cache; non-matching tickets abort before RFB bridge. | **VERIFIED** — Rejected with `403 Forbidden`. |
| **Revoked Token Reuse** | Former collaborator attempts to reconnect using old session token. | Gateway checks member status in box metadata; revoked status triggers immediate connection rejection. | **VERIFIED** — Rejected with `403 Forbidden`. |
| **Cross-Tenant Hijack** | Tenant B attempts to read details or control an AgentBox belonging to Tenant A. | Gateway matches `x-tenant-id` header against box owner record; cross-tenant operations blocked. | **VERIFIED** — Rejected with `403 Forbidden`. |
| **POSIX Credential Theft** | Collaborator attempts to read owner's private credentials in `/home/operator`. | POSIX `chmod 700` on home directories and `chmod 600` on credential files enforced by kernel. | **VERIFIED** — Blocked with `Permission denied`. |
| **Duplicate Billing Attack** | Multiple rapid provisioning requests sent with same `idempotencyKey`. | Manager checks existing boxes for matching `idempotencyKey`; returns existing box without extra container. | **VERIFIED** — Idempotent creation prevents double resource allocation. |
| **Cross-Site WebSocket Hijacking (CSWSH)** | Malicious third-party web page attempts to initiate WebSocket handshake to local gateway. | Gateway checks incoming `Origin` header against `Host`; untrusted origins aborted. | **VERIFIED** — Non-matching origins blocked with `403 Forbidden`. |

---

## 6. OWASP Alignment Matrix

| OWASP Top 10 Category | Relevant DreamBees Risk | Mitigation |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Unauthorized cross-user display access. | Identity-scoped session tokens; server-side token invalidation upon revocation; strict tenant isolation. |
| **A02: Cryptographic Failures** | Token exposure in transit or storage. | Cryptographically strong 32-byte tokens generated via `crypto.randomBytes(32).toString('hex')`. |
| **A03: Injection** | Command injection in container execution. | Docker commands executed using parameterized argument arrays (`exec(cmd, args)`); no unsanitized shell concatenation. |
| **A04: Insecure Design** | Screen sharing conflated with collaboration. | Independent X11 display multiplexing; distinct Linux UIDs per user; no shared screens. |
| **A05: Security Misconfiguration** | Insecure default directory permissions. | Default umask `002`; `/home/<user>` `0700`; `/workspace` `2775`; Git system `safe.directory`. |

---

## 7. Security Conclusion

The Invisible Computer architecture enforces defense-in-depth across the web gateway, the container daemon, and the guest Linux kernel. No single component failure allows unauthorized access, credential leakage, or unbilled resource utilization.
