# AgentBoxes Technical Architecture Specification
## The Final Reincarnation of DreamBeesAI · Commission 007

### 1. Executive Summary

AgentBoxes provides a managed, persistent, remotely accessible Linux development environment with a curated catalog of established third-party agent tools.

> **"We provide the computer. The industry provides the agents. The customer chooses."**

---

### 2. Core Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER / BROWSER                              │
│                                                                        │
│   [Control Plane Web UI]               [Remote Desktop Viewer (noVNC)] │
│         (Port 3030)                               (WS / RFB)           │
└─────────────┬──────────────────────────────────────────┬───────────────┘
              │                                          │
              ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DREAMBEESAI AGENTBOXES GATEWAY                       │
│                                                                        │
│   • DisplayGateway (HTTP REST + WS Upgrade + Security Headers)         │
│   • SessionManager (Ticket Issuance, Session Cookies, Tenant Auth)     │
│   • AgentCatalogService (Metadata, Status, BYOK Contracts)             │
│   • AgentBoxManager (Orchestrator, Concurrency Locks, State Ledger)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     PROVISIONING & DRIVER LAYER                        │
│                                                                        │
│   • DockerBoxDriver (CLI Bridge, Lifecycle, Metrics Collection)        │
│   • BoxStorageManager (Per-Tenant Volumes, Isolation, Snapshots)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     TENANT ALPHA BOX          │        │      TENANT BETA BOX          │
│                               │        │                               │
│ • Container: dreambees-box-A  │        │ • Container: dreambees-box-B  │
│ • User: operator (UID 1000)   │        │ • User: operator (UID 1000)   │
│ • Network: bridge (ICC=false) │        │ • Network: bridge (ICC=false) │
│ • Home Vol: agentbox-A-home   │        │ • Home Vol: agentbox-B-home   │
│ • WS Vol: agentbox-A-ws       │        │ • WS Vol: agentbox-B-ws       │
│ • Display: 127.0.0.1:5900     │        │ • Display: 127.0.0.1:5900     │
│ • Shell: AgentBox GTK3 Shell  │        │ • Shell: AgentBox GTK3 Shell  │
└───────────────────────────────┘        └───────────────────────────────┘
```

---

### 3. Key Design Decisions

#### A. Zero Published Ports (Strict Display Bridge)
- AgentBox containers do not publish port 5900 or any other port to the host or public internet.
- Display streaming is bridged through `docker exec -i --user 1000:1000 <container> python3 /opt/agentbox/display-bridge.py`.
- The display bridge connects directly to the container's internal loopback (`127.0.0.1:5900`) and streams raw RFB bytes across stdio to Node.js `Duplex` stream, which is upgraded to WebSocket for noVNC.
- Result: Impossible for an attacker or other container to connect to the VNC display from the outside.

#### B. Tenant & Process Isolation
1. **Per-Box Network Isolation**: Every box gets a dedicated Docker bridge network created with `--opt com.docker.network.bridge.enable_icc=false`. Inter-container communication between boxes is prohibited at the kernel bridge level.
2. **Process Namespace Isolation**: Standard container PID namespace isolation prevents any box from seeing or signaling processes in other boxes.
3. **Filesystem Isolation**: Each customer workspace is backed by independent named Docker volumes (`agentbox-<tenant>-<id>-home` and `agentbox-<tenant>-<id>-workspace`). Volumes are never shared between tenants.
4. **Least Privilege**: Runs exclusively under non-root UID `1000:1000` with `--cap-drop ALL`, `--security-opt no-new-privileges:true`, and custom `seccomp.json`. No Docker socket or host root mounts are ever permitted.

#### C. Independent Agent Installation Engine
- The base desktop image (`dreambeesai/agentbox:v1`) remains immutable and reproducible.
- Agents are installed into `/home/operator/.local/bin` and `/home/operator/.venv`, which reside on the persistent customer storage volume.
- Advantages:
  - Base image updates do not invalidate customer agents.
  - New agents or versions can be added to the catalog and installed in < 5 seconds without triggering a 2.4GB container rebuild.
  - Customer customizations, configurations, and installed tools persist across container stops and restarts.

#### D. Polite Neighbor Quotas
Hardware tiers strictly constrain CPU and memory consumption:
- **Standard**: 2 vCPU, 4GB RAM, 512 PIDs
- **Power**: 4 vCPU, 8GB RAM, 1024 PIDs
- **Titan**: 8 vCPU, 16GB RAM, 2048 PIDs
Enforced at the kernel cgroup level using `--cpus`, `--memory`, `--memory-swap`, and `--pids-limit`.
