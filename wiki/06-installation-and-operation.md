# 06 — Installation & Operation
## Self-Hosting Guide, Docker Image Build & Operational Runbook

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. System Requirements

To self-host DreamBeesAI, the host machine must meet the following minimum specifications:

| Component | Minimum Requirement | Recommended Production Specification |
| :--- | :--- | :--- |
| **Operating System** | macOS 14+ (Apple Silicon / Intel) or Linux (Ubuntu 22.04 / Debian 12) | Ubuntu 24.04 LTS x86_64 |
| **Container Engine** | Docker Engine 24.0+ or Docker Desktop 4.25+ | Docker Engine 26.0+ with containerd runtime |
| **Node.js Runtime** | Node.js v20.10+ or v22.0+ (LTS recommended) | Node.js v22.10 LTS |
| **Host Memory** | 8 GiB RAM | 32 GiB+ RAM (for multiple concurrent workstations) |
| **Host Storage** | 20 GiB available disk space | 100 GiB+ NVMe SSD storage |
| **Network Ports** | Port `3030` available on `127.0.0.1` | Ports `80`/`443` for TLS reverse proxy |

---

## 2. Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/heav3ns/dreambeesai.git
cd dreambeesai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the AgentBox Container Image
DreamBees requires the base workstation container image to be built locally:
```bash
npm run docker:build
```
*Note: This builds `dreambeesai/agentbox:latest` and tags it as `v1`. The build compiles XFCE, X11VNC, Google Chrome, and installs the official Claude Code and OpenAI Codex CLIs.*

### Step 4: Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Edit `.env` to customize settings. For security, generate a strong random admin key:
```bash
# In .env:
AGENTBOX_ADMIN_KEY="your_secure_random_key_here"
```

---

## 3. Starting the Control Plane

Start the daemon:
```bash
# Production mode:
npm start

# Development mode with hot-reloading:
npm run dev
```

The gateway listens at `http://127.0.0.1:3030`. Open your browser and navigate to:
```
http://localhost:3030
```

---

## 4. Operational Workflows

### 4.1 Creating a Computer
1. On the home screen (`#computers`), click **"＋ Create Computer"**.
2. Select your desired profile:
   - **Standard:** 2 vCPU, 4GB RAM (General coding)
   - **Power:** 4 vCPU, 8GB RAM (Multiplayer, builds)
   - **Titan:** 8 vCPU, 16GB RAM (Heavy compilations, data processing)
3. Click **"Provision Workstation"**. The computer transitions to `running` within 2.5 seconds.

### 4.2 Connecting to Your Personal Desktop
1. Click **"Open Desktop"** on your active computer card.
2. The browser canvas loads the noVNC viewer connected to your dedicated `DISPLAY :0` session.
3. Launch Claude Code or Codex by double-clicking the desktop icon or opening the terminal.

### 4.3 Inviting a Collaborator (Multiplayer)
1. Navigate to the **"People"** tab (`#box/<id>/people`).
2. Click **"Invite Collaborator"**.
3. Enter the collaborator's username and email.
4. Copy the generated invitation link (valid for 24 hours).
5. When the collaborator opens the link, an independent `DISPLAY :1` desktop session is provisioned automatically.

### 4.4 Suspending Compute (Codespaces Model)
1. When work is paused, click **"Pause Computer"**.
2. Active CPU and RAM consumption drops to zero.
3. Your persistent code, Git branches, and uncommitted edits in `/home/operator/workspace` remain safely retained on the persistent volume.
4. Click **"Resume Computer"** at any time to resume within 2 seconds.

### 4.5 Exporting Workspace Deliverables
1. Navigate to the **"Shared Files"** tab (`#box/<id>/files`).
2. Review modified files and active Git branch status.
3. Click **"Export Workspace (.tar.gz)"** to download a compressed archive of your project. Sensitive files outside the workspace are strictly excluded.

### 4.6 Decommissioning a Computer
1. Navigate to the **"Settings"** tab (`#box/<id>/settings`).
2. Scroll to the **Danger Zone** and click **"Delete Computer"**.
3. In the confirmation modal, type the exact name of the computer.
4. The system safely destroys the container, reaps the virtual display sockets, and releases all storage volumes.
