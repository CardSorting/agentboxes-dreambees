/**
 * DreamBeesAI AgentBoxes CLI
 * Command line interface for developers, operators, and orchestration.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import { DockerBoxDriver } from '../provisioning/box-driver.js';
import { AgentBoxManager } from '../provisioning/box-manager.js';
import { AgentCatalogService } from '../catalog/agent-catalog.js';

const execute = promisify(execFile);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const driver = new DockerBoxDriver(config.dockerNamespace, config.baseImage, config.seccompPath);
  const manager = new AgentBoxManager(config.boxesFile, driver, config.maxRunningBoxes, config.maxTotalBoxes);
  const catalog = new AgentCatalogService();

  switch (command) {
    case 'help':
    case '--help':
    case '-h': {
      console.log(`
\x1b[1m\x1b[33m🐝 DreamBeesAI — AGENTBOXES CLI\x1b[0m
\x1b[90mAutonomous Provisioning & Decommissioning Engine (Commission 008)\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ agentbox list                       List all provisioned AgentBoxes & lifecycle statuses
  $ agentbox up [name] [--tier <t>]     Provision and start an AgentBox (asynchronous job)
  $ agentbox down <id>                  Stop an active AgentBox (preserves storage)
  $ agentbox suspend <id>               Suspend compute resources (preserves workspace)
  $ agentbox resume <id>                Resume suspended or stopped compute
  $ agentbox reset <id> [--purge]       Recreate execution environment from clean image
  $ agentbox delete <id> --confirm <n>  Permanently delete box and persistent volumes
  $ agentbox open <id>                  Open remote desktop viewer in host browser
  $ agentbox capacity                   Display host compute capacity and quotas
  $ agentbox jobs [boxId]               List control-plane lifecycle jobs and progress
  $ agentbox reconcile                  Execute autonomous lifecycle reconciliation
  $ agentbox catalog                    Display curated catalog of compatible agent tools
  $ agentbox metrics <id>               Display live operational resource metrics
  $ agentbox launch <id> <app>          Launch application inside running desktop
  $ agentbox install <id> <agent>       Install an agent from catalog into persistent volume
  $ agentbox server                     Run the AgentBoxes HTTP & WebSocket gateway

\x1b[1mEXAMPLES:\x1b[0m
  $ agentbox up "Claude Dev Box" --tier power
  $ agentbox suspend <box-id>
  $ agentbox resume <box-id>
  $ agentbox reset <box-id> --purge
  $ agentbox delete <box-id> --confirm "Claude Dev Box"
  $ agentbox capacity
  $ agentbox jobs
`);
      break;
    }

    case 'list':
    case 'ls': {
      await manager.reconcile();
      const boxes = manager.listBoxes();
      console.log(`\n\x1b[1m\x1b[33m🐝 Active AgentBoxes (${boxes.length} Total, ${manager.getRunningCount()} Running):\x1b[0m\n`);
      if (boxes.length === 0) {
        console.log(`  \x1b[90mNo AgentBoxes provisioned yet. Run: agentbox up "My Box"\x1b[0m\n`);
        break;
      }
      for (const box of boxes) {
        const isRunning = box.state === 'running';
        const stateColor = isRunning ? '\x1b[32m● RUNNING\x1b[0m' : '\x1b[33m○ STOPPED\x1b[0m';
        console.log(`  \x1b[1m${box.name}\x1b[0m (${box.id})`);
        console.log(`    Status:  ${stateColor} | Tier: \x1b[36m${box.tier}\x1b[0m`);
        console.log(`    Agents:  ${box.installedAgents.join(', ') || 'None'}`);
        console.log(`    Viewer:  http://${config.host}:${config.port}/viewer?box=${box.id}`);
        console.log();
      }
      break;
    }

    case 'up': {
      const name = args[1] && !args[1].startsWith('--') ? args[1] : `AgentBox-${Date.now().toString().slice(-4)}`;
      const tierIdx = args.indexOf('--tier');
      const tier = tierIdx !== -1 && args[tierIdx + 1] ? args[tierIdx + 1] : 'standard';

      console.log(`\n\x1b[1m\x1b[36m🚀 Provisioning AgentBox "${name}" (Tier: ${tier})...\x1b[0m`);
      const box = await manager.createBox({ name, tier: tier as any });
      console.log(`  \x1b[32m✔\x1b[0m Environment provisioned successfully! ID: \x1b[1m${box.id}\x1b[0m`);
      console.log(`  \x1b[32m✔\x1b[0m Container ID: ${box.containerId?.slice(0, 12)}`);
      console.log(`  \x1b[32m✔\x1b[0m Desktop URL:  \x1b[33mhttp://${config.host}:${config.port}/viewer?box=${box.id}\x1b[0m\n`);
      break;
    }

    case 'claude': {
      const name = args[1] || `Claude-Dev-${Date.now().toString().slice(-4)}`;
      console.log(`\n\x1b[1m\x1b[35m⚡ Provisioning Claude Code Ready-to-Use Workspace "${name}"...\x1b[0m`);
      const box = await manager.createBox({
        name,
        tier: 'standard',
        agents: ['claude-code'],
        profileId: 'claude-code-ready-workspace'
      });
      console.log(`  \x1b[32m✔\x1b[0m Workstation ready! ID: \x1b[1m${box.id}\x1b[0m`);
      console.log(`  \x1b[32m✔\x1b[0m Preinstalled: Claude Code v0.2.29, Node.js 22, Git, Chrome`);
      console.log(`  \x1b[32m✔\x1b[0m Browser Desktop: \x1b[33mhttp://${config.host}:${config.port}/viewer?box=${box.id}\x1b[0m`);
      console.log(`  \x1b[36m👉 Next Step:\x1b[0m Open desktop in browser, authenticate with your Anthropic key, and start working!\n`);
      break;
    }

    case 'down':
    case 'stop': {
      const id = args[1];
      if (!id) {
        console.error('Usage: agentbox down <id>');
        process.exit(1);
      }
      console.log(`\n\x1b[33m🛑 Stopping AgentBox ${id}...\x1b[0m`);
      await manager.stopBox(id);
      console.log(`  \x1b[32m✔\x1b[0m Stopped. Workspace files remain preserved in persistent volume.\n`);
      break;
    }

    case 'suspend': {
      const id = args[1];
      if (!id) {
        console.error('Usage: agentbox suspend <id>');
        process.exit(1);
      }
      console.log(`\n\x1b[33m⏸️  Suspending AgentBox ${id} compute...\x1b[0m`);
      await manager.suspendBox(id, 'manual_suspension');
      console.log(`  \x1b[32m✔\x1b[0m Compute released. Workspace storage preserved.\n`);
      break;
    }

    case 'resume':
    case 'start': {
      const id = args[1];
      if (!id) {
        console.error('Usage: agentbox resume <id>');
        process.exit(1);
      }
      console.log(`\n\x1b[36m▶️  Resuming AgentBox ${id}...\x1b[0m`);
      await manager.startBox(id);
      console.log(`  \x1b[32m✔\x1b[0m Resumed and active. Desktop URL: \x1b[33mhttp://${config.host}:${config.port}/viewer?box=${id}\x1b[0m\n`);
      break;
    }

    case 'reset': {
      const id = args[1];
      const purge = args.includes('--purge') || args.includes('--purge-storage');
      if (!id) {
        console.error('Usage: agentbox reset <id> [--purge]');
        process.exit(1);
      }
      const box = manager.getBox(id);
      if (!box) {
        console.error(`AgentBox ${id} not found.`);
        process.exit(1);
      }
      console.log(`\n\x1b[33m🔄 Resetting AgentBox ${id} (Storage: ${purge ? 'PURGING' : 'PRESERVED'})...\x1b[0m`);
      const job = await manager.requestResetJob(id, box.tenantId, { preserveStorage: !purge });
      console.log(`  \x1b[32m✔\x1b[0m Reset job enqueued: \x1b[1m${job.id}\x1b[0m (State: ${job.status})\n`);
      break;
    }

    case 'capacity': {
      const snapshot = manager.capacity.getSnapshot(manager.listBoxes());
      console.log(`\n\x1b[1m\x1b[36m📊 AgentBoxes Compute Capacity & Quotas:\x1b[0m\n`);
      console.log(`  Host CPU Cores:       ${snapshot.availableCpus} vCPUs available (${snapshot.hostCpuCount} physical cores, ${snapshot.allocatedCpus} allocated)`);
      console.log(`  Host Memory:          ${Math.round(snapshot.availableMemoryBytes / (1024 * 1024 * 1024))} GiB / ${Math.round(snapshot.hostTotalMemoryBytes / (1024 * 1024 * 1024))} GiB available`);
      console.log(`  Running Slots:        ${snapshot.runningBoxCount} / ${snapshot.maxRunningBoxes} active`);
      console.log(`  Total Ledger Slots:   ${snapshot.totalBoxCount} / ${snapshot.maxTotalBoxes} allocated`);
      console.log(`  Active Reservations:  ${snapshot.activeReservations}`);
      console.log(`  Tier Availability:    Standard: ${snapshot.tierAvailability.standard ? '✔' : '✖'} | Power: ${snapshot.tierAvailability.power ? '✔' : '✖'} | Titan: ${snapshot.tierAvailability.titan ? '✔' : '✖'}\n`);
      break;
    }

    case 'jobs': {
      const boxId = args[1];
      const jobs = manager.jobs.listJobs(undefined, boxId);
      console.log(`\n\x1b[1m\x1b[33m📋 Provisioning & Lifecycle Jobs (${jobs.length} Total):\x1b[0m\n`);
      if (jobs.length === 0) {
        console.log(`  \x1b[90mNo jobs recorded.\x1b[0m\n`);
        break;
      }
      for (const j of jobs.slice(-15)) {
        const statusBadge = j.status === 'completed'
          ? '\x1b[32m✔ COMPLETED\x1b[0m'
          : j.status === 'failed'
          ? '\x1b[31m✖ FAILED\x1b[0m'
          : `\x1b[33m⏳ ${j.status.toUpperCase()} (${j.progress}%)\x1b[0m`;

        console.log(`  \x1b[1m${j.id}\x1b[0m [${j.operation.toUpperCase()}] — ${statusBadge}`);
        console.log(`    Box:   ${j.boxId} | Tenant: ${j.tenantId}`);
        console.log(`    Stage: ${j.stage || 'none'} — ${j.stageMessage || ''}`);
        if (j.error) console.log(`    \x1b[31mError: ${j.error.message}\x1b[0m`);
        console.log();
      }
      break;
    }

    case 'reconcile': {
      const { LifecyclePolicyEngine } = await import('../provisioning/lifecycle-policy.js');
      const policies = new LifecyclePolicyEngine(manager, driver, config.dockerNamespace, config.policies);
      console.log(`\n\x1b[36m⚙️  Executing Autonomous Lifecycle Reconciliation...\x1b[0m`);
      const stats = await policies.runReconciliationLoop();
      console.log(`  \x1b[32m✔\x1b[0m Idle Suspended:    ${stats.suspendedCount}`);
      console.log(`  \x1b[32m✔\x1b[0m Expired Cleaned:   ${stats.expiredCount}`);
      console.log(`  \x1b[32m✔\x1b[0m Crashes Recovered: ${stats.recoveredCount}`);
      console.log(`  \x1b[32m✔\x1b[0m Docker Orphans:    ${stats.orphansReaped}\n`);
      break;
    }

    case 'delete':
    case 'rm': {
      const id = args[1];
      const confirmIdx = args.indexOf('--confirm');
      const confirmation = confirmIdx !== -1 ? args[confirmIdx + 1] : undefined;
      if (!id) {
        console.error('Usage: agentbox delete <id> [--confirm <box-name>]');
        process.exit(1);
      }
      const box = manager.getBox(id);
      if (box && !confirmation) {
        console.error(`\x1b[31mError:\x1b[0m Permanent deletion is irreversible.`);
        console.error(`Run with: agentbox delete ${id} --confirm "${box.name}"`);
        process.exit(1);
      }
      console.log(`\n\x1b[31m🗑️  Purging AgentBox ${id} and persistent storage...\x1b[0m`);
      await manager.deleteBox(id, confirmation || box?.name);
      console.log(`  \x1b[32m✔\x1b[0m Box and storage volumes deleted.\n`);
      break;
    }

    case 'catalog': {
      const items = catalog.getAll();
      console.log(`\n\x1b[1m\x1b[33m🐝 Curated Agent Catalog (Commission 007)\x1b[0m\n`);
      for (const item of items) {
        const isAvail = item.status === 'available';
        const isPrev = item.status === 'preview';
        const statusBadge = isAvail
          ? '\x1b[32m● AVAILABLE\x1b[0m'
          : isPrev
          ? '\x1b[33m○ PREVIEW\x1b[0m'
          : '\x1b[31m✕ UNAVAILABLE\x1b[0m';

        console.log(`  \x1b[1m${item.name}\x1b[0m [${item.id}] — ${statusBadge}`);
        console.log(`    Publisher: ${item.publisher} | License: ${item.license}`);
        console.log(`    Category:  ${item.category} | Auth: ${item.authModel}`);
        console.log(`    Tagline:   ${item.tagline}`);
        if (item.statusReason) {
          console.log(`    \x1b[31mNote: ${item.statusReason}\x1b[0m`);
        }
        console.log();
      }
      break;
    }

    case 'metrics':
    case 'stats': {
      const id = args[1];
      if (!id) {
        console.error('Usage: agentbox metrics <id>');
        process.exit(1);
      }
      const m = await manager.getMetrics(id);
      console.log(`\n\x1b[1m\x1b[36m📊 AgentBox ${id} Operational Metrics:\x1b[0m`);
      console.log(`  CPU Utilization: ${m.cpuPercent.toFixed(1)}%`);
      console.log(`  Memory Usage:    ${Math.round(m.memoryUsageBytes / (1024 * 1024))} MiB / ${Math.round(m.memoryLimitBytes / (1024 * 1024))} MiB (${m.memoryPercent.toFixed(1)}%)`);
      console.log(`  PIDs Count:      ${m.pidsCount}`);
      console.log(`  Network Traffic: RX: ${Math.round(m.networkRxBytes / 1024)} kB | TX: ${Math.round(m.networkTxBytes / 1024)} kB\n`);
      break;
    }

    case 'launch': {
      const id = args[1];
      const app = args[2] || 'terminal';
      if (!id) {
        console.error('Usage: agentbox launch <id> <app>');
        process.exit(1);
      }
      console.log(`\n\x1b[36m🚀 Launching ${app} in AgentBox ${id}...\x1b[0m`);
      await manager.launchApp(id, app);
      console.log(`  \x1b[32m✔\x1b[0m Application launched.\n`);
      break;
    }

    case 'install': {
      const id = args[1];
      const agent = args[2];
      if (!id || !agent) {
        console.error('Usage: agentbox install <id> <agent-id>');
        process.exit(1);
      }
      console.log(`\n\x1b[36m📦 Installing ${agent} into AgentBox ${id}...\x1b[0m`);
      const res = await manager.installAgent(id, agent);
      console.log(res.output);
      console.log(`  \x1b[32m✔\x1b[0m Installation complete.\n`);
      break;
    }

    case 'accounting':
    case 'cost': {
      const id = args[1];
      if (id) {
        const acc = manager.getAccounting(id);
        if (!acc) {
          console.error(`AgentBox ${id} not found.`);
          process.exit(1);
        }
        console.log(`\n\x1b[1m\x1b[36m💰 Workstation Resource Accounting: ${id}\x1b[0m`);
        console.log(`  Tier:               ${acc.tier.toUpperCase()}`);
        console.log(`  Active Compute:     ${(acc.activeComputeSeconds / 3600).toFixed(2)} hours ($${acc.costs.activeComputeCost.toFixed(2)})`);
        console.log(`  Idle Compute:       ${(acc.idleComputeSeconds / 3600).toFixed(2)} hours ($${acc.costs.idleComputeCost.toFixed(2)})`);
        console.log(`  Persistent Storage: ${acc.persistentStorageGiB} GiB for ${acc.storageDurationHours.toFixed(1)} hrs ($${acc.costs.storageCost.toFixed(2)})`);
        console.log(`  Network Bandwidth:  ${((acc.networkRxBytes + acc.networkTxBytes) / (1024 * 1024)).toFixed(1)} MiB ($${acc.costs.networkCost.toFixed(2)})`);
        console.log(`  \x1b[1m\x1b[33mTotal Incurred Cost: $${acc.costs.totalCost.toFixed(2)}\x1b[0m`);
        if (acc.spendingLimit) {
          console.log(`  Spending Limit:     $${acc.spendingLimit.toFixed(2)} ${acc.spendingLimitReached ? '\x1b[31m(LIMIT REACHED - SAFEGUARD ACTIVE)\x1b[0m' : '\x1b[32m(OK)\x1b[0m'}`);
        }
        console.log();
      } else {
        const summary = manager.getFleetAccountingSummary();
        console.log(`\n\x1b[1m\x1b[36m📊 Fleet-Wide Resource & Cost Accounting Summary (Section IV.E)\x1b[0m`);
        console.log(`  Tracked Workstations:    ${summary.totalBoxesTracked}`);
        console.log(`  Total Active Compute:    ${summary.totalActiveComputeHours} hours ($${summary.totalActiveComputeCost.toFixed(2)})`);
        console.log(`  Total Idle Compute:      ${summary.totalIdleComputeHours} hours ($${summary.totalIdleComputeCost.toFixed(2)})`);
        console.log(`  Storage Volume-Hours:    ${summary.totalStorageGiBHours} GiB-hours ($${summary.totalStorageCost.toFixed(2)})`);
        console.log(`  Network Traffic:         RX: ${summary.totalNetworkRxGiB} GiB | TX: ${summary.totalNetworkTxGiB} GiB ($${summary.totalNetworkCost.toFixed(2)})`);
        console.log(`  \x1b[1m\x1b[32mTotal Estimated Fleet Expense: $${summary.totalFleetCost.toFixed(2)}\x1b[0m`);
        console.log(`  Spend Guards Triggered:  ${summary.spendingLimitsEnforcedCount}\n`);
      }
      break;
    }

    case 'diagnostics':
    case 'diag': {
      const id = args[1];
      if (!id) {
        console.error('Usage: agentbox diagnostics <id>');
        process.exit(1);
      }
      const box = manager.getBox(id);
      if (!box) {
        console.error(`AgentBox ${id} not found.`);
        process.exit(1);
      }
      console.log(`\n\x1b[1m\x1b[33m🔍 Diagnostic Audit Trail for Box: ${id}\x1b[0m`);
      const records = box.diagnostics || [];
      if (records.length === 0) {
        console.log(`  \x1b[32m✔ No faults or incidents recorded. Workstation is nominal.\x1b[0m\n`);
        break;
      }
      for (const r of records) {
        const ownerBadge = r.serviceOwner === 'dreambees'
          ? '\x1b[33m[DREAMBEES RESPONSIBILITY]\x1b[0m'
          : '\x1b[36m[USER RESPONSIBILITY]\x1b[0m';
        console.log(`  \x1b[1m[${new Date(r.timestamp).toISOString()}] ${r.category}\x1b[0m — ${ownerBadge}`);
        console.log(`    Summary:     ${r.summary}`);
        if (r.details) console.log(`    Details:     ${r.details}`);
        if (r.remediation) console.log(`    Remediation: ${r.remediation}`);
        console.log();
      }
      break;
    }

    case 'assign': {
      const id = args[1];
      const userId = args[2];
      const userEmail = args[3];
      if (!id || !userId) {
        console.error('Usage: agentbox assign <id> <userId> [userEmail]');
        process.exit(1);
      }
      const box = manager.getBox(id);
      if (!box) {
        console.error(`AgentBox ${id} not found.`);
        process.exit(1);
      }
      box.assignedUser = { userId, userEmail, assignedAt: Date.now() };
      (manager as any).saveState();
      console.log(`\n  \x1b[32m✔\x1b[0m Workstation ${id} successfully assigned to user: \x1b[1m${userId}\x1b[0m (${userEmail || 'no email'})\n`);
      break;
    }

    case 'server': {
      const { DisplayGateway } = await import('../gateway/display-gateway.js');
      const gateway = new DisplayGateway(manager, config.port, config.host);
      await gateway.start();
      console.log(`\n\x1b[1m\x1b[33m🐝 DreamBeesAI AgentBoxes Gateway Server ONLINE\x1b[0m`);
      console.log(`  Control Plane: \x1b[36mhttp://${config.host}:${config.port}/\x1b[0m\n`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Run 'agentbox help' for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('\x1b[31mCommand failed:\x1b[0m', err.message);
  process.exit(1);
});
