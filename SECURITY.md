# Security Policy
## DreamBeesAI · Security Guidelines & Disclosure

DreamBeesAI is an open-source experimental workstation architecture designed for self-hosted execution of AI agent tools (Claude Code, OpenAI Codex).

---

## 1. Supported Versions

Because DreamBeesAI is an **archived project**, active commercial security monitoring is not provided. Only critical vulnerabilities affecting the final archival release are reviewed:

| Version | Supported | Status |
| :--- | :--- | :--- |
| `1.0.0-archival` | Yes (Critical CVEs only) | Frozen Archival Baseline |
| `< 1.0.0` | No | Superseded experimental iterations |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability that affects self-hosted deployments of DreamBeesAI:
1. **Do not disclose the vulnerability publicly** in GitHub issues or public forums.
2. Submit a private vulnerability advisory via GitHub Security Advisories, or contact the custodial security contacts at `security@heav3ns.local`.
3. Provide a minimal reproducible test case, affected version details, and impact assessment.
4. Security reports will be reviewed within 5 business days for validation and archival patching.

---

## 3. Operational Security Considerations for Self-Hosters

Anyone operating DreamBeesAI in a self-hosted environment must observe the following architectural rules:

1. **TLS / HTTPS Termination:** The built-in HTTP/WebSocket gateway does not terminate TLS natively. In any environment accessible outside `localhost` (127.0.0.1), terminate TLS using a reverse proxy (e.g. Caddy, Nginx, or Traefik) to protect WebSocket RFB traffic and session cookies.
2. **Untrusted Code Execution Boundary:** Collaborators invited to a computer have access to `/home/operator/workspace` and can execute shared scripts. Do not invite untrusted parties to your AgentBox.
3. **Admin API Key:** Set a strong, unique `AGENTBOX_ADMIN_KEY` environment variable in your production `.env` configuration. Never leave the default development keys active.
4. **Credential Isolation (BYOK):** Do not check API keys or authentication files into source control. Claude Code and Codex authentication tokens are stored in the user's private `0700` home directory (`~/.claude.json`, `~/.codex/config.json`) inside the container.
