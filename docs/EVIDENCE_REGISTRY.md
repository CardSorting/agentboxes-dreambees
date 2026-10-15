# DREAMBEES — EVIDENCE REGISTRY
## Verification Evidence, Test Fixtures & Simulation Inventory

**Authority:** EGG, Founding Custodian  
**Commissioning Officer:** MAJO, Leading Executive Chair  
**Commission:** 008.VI-A  
**Date:** October 14, 2026  
**Status:** ACTIVE AUDIT LEDGER

---

### Evidence Classification Standard

- **VERIFIED:** Independently verified against active code, live Docker daemon, and unmocked binaries.
- **SIMULATED:** Verified only through a mock script, synthetic double, or test fixture.
- **UNVERIFIED:** Plausible based on specification, but lacking external live production evidence.
- **FAILED:** Disproven or broken under adversarial testing.

---

### Evidence Inventory & Test Harness Matrix

| Test Suite / Claim | Test File | Claimed Behavior | Evidence Type | Classification | Notes & Distinctions |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Claude Code Binary** | Container image | Preinstalled runtime | Docker execution: `claude --version` | **VERIFIED** | Official `@anthropic-ai/claude-code@2.1.300` installed at `/usr/local/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe`. |
| **Claude Code Doctor** | Container image | System health check | Docker execution: `claude doctor` | **VERIFIED** | Official diagnostics report: `No installation issues found.` |
| **Unauthenticated Auth Prompt** | `test-byoa-acceptance.ts` | Clean warning when not authenticated | Doctor check execution without key | **VERIFIED** | Official CLI reports `- Not signed in to claude.ai`. |
| **Simulated BYOK Key** | `test-byoa-acceptance.ts` | Sets `ANTHROPIC_API_KEY` | Injected into private `~/.bashrc` | **SIMULATED** | Uses dummy key `sk-ant-api03-user-controlled-test-key-xyz123`. Passes via test mode fallback. |
| **Live Anthropic Model Call** | Manual execution | Complete code generation | API call to `api.anthropic.com` | **UNVERIFIED** | Real API call requires live customer credentials. With invalid key, official CLI exits: `Invalid API key`. |
| **Cold-Start Provisioning** | `test-byoa-acceptance.ts` | Sub-2s container launch | Wall-clock timer on live Docker create | **VERIFIED** | Measured **1815ms** on live Docker engine. |
| **Remote Desktop RFB** | `test-gateway.ts` | Streams RFB frames over WS | Live WebSocket client receives `RFB 003.008\n` | **VERIFIED** | True X11 display running `x11vnc` bridged to WebSocket. |
| **State Reconciliation** | `test-autonomous-lifecycle.ts` | Recovers crashed containers & reaps orphans | Live container kill & reconciliation loop | **VERIFIED** | Restarts dead containers up to 3 times; reaps unmanaged Docker resources. |
| **Persistent Storage** | `test-persistence.ts` | Workspace data survives compute suspension | Docker container stop/remove, volume inspect | **VERIFIED** | Files created in `/home/operator/workspace` persist across container destruction. |
| **Confirmed Teardown** | `test-byoa-acceptance.ts` | Destroys compute & purges storage volumes | Volume list check post-delete | **VERIFIED** | Both `home` and `workspace` volumes permanently removed upon confirmed deletion. |
| **Tenant Isolation** | `test-isolation.ts` | Cross-tenant network & storage blocked | Inter-container ping & volume mount tests | **VERIFIED** | Container bridge networks cannot route cross-tenant; volume names deterministic and scoped. |
| **Workspace Export** | `test-starter-export.ts` | HTTP gzip archive stream | `GET /api/boxes/:id/export` download & gunzip | **VERIFIED** | Successfully downloaded and extracted 1295-byte `.tar.gz` archive. |
| **Spending Cap Enforcement** | `test-metrics.ts` | $20.00 spending limit | Metering loop and budget threshold | **SIMULATED** | Accounting engine halts compute when accrued costs exceed $20; host-level billing (Hetzner/AWS) is not connected. |
| **WAN Remote Connection** | Manual | Browser access over internet | Network binding and WebSocket proxy | **UNVERIFIED** | Verified over loopback (`127.0.0.1`); WAN deployment requires reverse proxy with SSL (`wss://`). |

---

### Test Harness & Fixture Disclosure

1. **Simulated Key Pattern:** Any key containing `test-key` or `user-controlled-test-key` is detected by `/opt/agentbox/bin/claude` as an automated test fixture. This ensures deterministic offline test execution without requiring internet access or incurring Anthropic billing charges during CI runs.
2. **Host-Level Billing:** DreamBees accounting calculates compute costs at `$0.05/hr` using container lifecycle timestamps. This is an application-level ledger, not direct host billing API integration.
3. **Display Port Binding:** `x11vnc` inside each container binds strictly to `127.0.0.1:5900` inside the container network namespace. Port 5900 is never published to host network interfaces; all access passes through the RFB WebSocket bridge in `display-gateway.ts`.
