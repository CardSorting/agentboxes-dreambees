# 07 — Security & Threat Model
## Trust Boundaries, Credential Protection & Hardening Analysis

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. The Four-Tier Trust Model

DreamBeesAI explicitly differentiates between four concentric security boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 4: Infrastructure Administrator                                  │
│  • Full control of host Docker daemon & server hardware                │
│  • Containers run unprivileged; no Docker socket mounted inside        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  TIER 1: Multi-Tenant Customer Isolation (Cross-Box)                   │
│  • Completely distinct containers & isolated bridge networks (no ICC)  │
│  • Zero shared memory, zero shared files, zero shared processes        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  TIER 2: Intra-Computer Collaborator Separation                        │
│  • Distinct Linux UIDs (1000, 1001) & private home directories (0700)  │
│  • Separate DISPLAY servers & isolated agent credentials               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  TIER 3: Shared Workspace Collaboration (Intentional Collaboration)    │
│  • Shared project files in `/home/operator/workspace` (chmod 2775)     │
│  • Collaborators intentionally have rights to commit & run shared code │
└────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Adversarial Honesty Principle:** Collaborators within a single computer are **not** sandboxed from code intentionally executed in the shared workspace. If an invited editor commits a script to the workspace and the owner runs `npm test`, that script executes with the owner's privileges. However, collaborators **cannot** read the owner's private credentials, access their home directory, or inspect their desktop.

---

## 2. Authentication & Session Security

1. **Owner Authentication:** Authenticated via HMAC-signed session cookies issued during login or ticket exchange.
2. **Single-Use Display Tickets:** When opening a desktop session, the client requests a short-lived, single-use ticket (`/api/boxes/:id/ticket`). The ticket is consumed upon WebSocket upgrade and immediately invalidated.
3. **Invitation Expiration (24h TTL):** Invitations generated for collaborators carry a cryptographic token and an explicit expiration timestamp (`expiresAt = Date.now() + 24 * 3600 * 1000`). Expired tokens are rejected with `403 Forbidden`.
4. **Token Rotation:** Owners can rotate collaborator tokens on demand, invalidating compromised links without deleting project history.
5. **Instant Revocation:** When an owner revokes a member, `DisplayGateway` terminates their active WebSocket connection within 12ms and runs `pkill -9 -u <collab_user>` inside the container.

---

## 3. Credential Isolation Architecture

AI agent credentials (e.g. Anthropic tokens, OpenAI keys, Git SSH credentials) are never stored in the application database or shared volumes.
- Primary Owner credentials reside in `/home/operator/` (Permissions: `drwx------` / `0700`).
- Collaborator credentials reside in `/home/collab_1/` (Permissions: `drwx------` / `0700`).
- Linux kernel filesystem permissions enforce that non-root users cannot read, write, or traverse directories owned by other users.
- Linux `/proc/<pid>/environ` permissions prevent users from peeking into each other's environment variables.

---

## 4. Remediated Vulnerability Register (Commission 013 Hardening)

| Ref ID | Vulnerability | Severity | Remediation Implemented | Verification Test |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-013-01** | Wildcard `safe.directory "*"` | HIGH | Replaced with strictly scoped directories: `/home/operator/workspace` and `/home/*/workspace`. | `test-commission-013-boring.ts` (2.1) |
| **SEC-013-02** | Symlink Traversal in Workspace Tar Export | CRITICAL | Hardened tar stream with Python `os.path.realpath` check; symlinks pointing outside workspace root are filtered out. | `test-commission-013-boring.ts` (2.3) |
| **SEC-013-03** | Symlink Traversal in Files API | HIGH | Directory walker verifies realpath target; symlinks escaping workspace are suppressed from the tree. | `test-commission-013-boring.ts` (2.2) |
| **SEC-013-04** | Indefinite Invitation Replay | MEDIUM | Implemented 24-hour default TTL (`expiresAt`). Expired tokens rejected with `403`. | `test-commission-013-boring.ts` (2.4) |
| **SEC-013-05** | Token Rotation Gap | MEDIUM | Added `POST /api/boxes/:id/members/:userId/rotate-token` endpoint for immediate re-keying. | `test-commission-013-boring.ts` (2.5) |
| **SEC-013-06** | Delayed WebSocket Session Revocation | HIGH | Bound active WebSockets to member state; revocation executes immediate socket drop within 12ms. | `test-commission-013-boring.ts` (2.6) |

---

## 5. Network Isolation & Exposure

- **Container Inter-Communication (ICC):** All bridge networks are created with `--opt com.docker.network.bridge.enable_icc=false`. Containers belonging to different computers or tenants cannot communicate across the Docker bridge.
- **Port Exposure:** Containers do **not** publish ports to the host interface (`0.0.0.0`). All display and file traffic flows through internal Unix/TCP sockets bridged by `DisplayGateway`.
- **TLS Termination Requirement:** The internal Node.js server does not terminate TLS natively. When deploying on a network accessible beyond `localhost`, a reverse proxy (Caddy / Nginx) must terminate TLS (`https://` and `wss://`).

---

## 6. Known Security Boundaries & Limitations

1. **Unprivileged Docker Execution:** AgentBoxes run as unprivileged containers with standard Linux namespaces and a custom seccomp profile. They do not have access to host `/dev`, host root filesystems, or `/var/run/docker.sock`.
2. **Denial of Service via Compute Overload:** While CPU quotas and memory limits are enforced via cgroups, an agent or user running infinite compilation loops can peg their container's CPU quota. Aggregate resource limits apply to the entire box.
