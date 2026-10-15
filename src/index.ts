/**
 * DreamBeesAI AgentBoxes — Main Server Entrypoint
 * The Final Reincarnation of DreamBeesAI (Commission 007)
 */

import { config } from './config.js';
import { DockerBoxDriver } from './provisioning/box-driver.js';
import { AgentBoxManager } from './provisioning/box-manager.js';
import { DisplayGateway } from './gateway/display-gateway.js';
import { LifecyclePolicyEngine } from './provisioning/lifecycle-policy.js';

async function bootstrap() {
  console.log(`
\x1b[1m\x1b[33m========================================================================\x1b[0m
\x1b[1m\x1b[33m🐝  DreamBeesAI · AGENTBOXES — ENGINEERING COMMISSION 008\x1b[0m
\x1b[1m\x1b[33m    Autonomous Provisioning & Decommissioning\x1b[0m
\x1b[1m\x1b[33m========================================================================\x1b[0m
\x1b[90mThe customer requests a box. The infrastructure handles the rest.\x1b[0m
`);

  const driver = new DockerBoxDriver(config.dockerNamespace, config.baseImage, config.seccompPath);

  // Validate Docker daemon availability
  const isDockerAvailable = await driver.available();
  if (isDockerAvailable) {
    console.log(`  \x1b[32m✔\x1b[0m Base Docker Image: \x1b[1m${config.baseImage}\x1b[0m is verified and available.`);
  } else {
    console.warn(`  \x1b[33m▲ Warning:\x1b[0m Image '${config.baseImage}' not found locally. Run: npm run docker:build`);
  }

  const manager = new AgentBoxManager(config.boxesFile, driver, config.maxRunningBoxes, config.maxTotalBoxes, config.jobsFile);
  
  // Reconcile on start
  await manager.reconcile();
  console.log(`  \x1b[32m✔\x1b[0m Ledger Reconciled: \x1b[1m${manager.listBoxes().length}\x1b[0m total boxes (${manager.getRunningCount()} running).`);

  // Start Autonomous Lifecycle Policy Engine
  const policies = new LifecyclePolicyEngine(manager, driver, config.dockerNamespace, config.policies);
  policies.start();
  console.log(`  \x1b[32m✔\x1b[0m Lifecycle Policies:   Reconcile loop active (${config.policies.reconcileIntervalMs / 1000}s interval, idle ${config.policies.idleTimeoutMinutes}m).`);

  const gateway = new DisplayGateway(manager, config.port, config.host, policies);
  await gateway.start();

  console.log(`  \x1b[32m✔\x1b[0m Control Plane Web UI: \x1b[1m\x1b[36mhttp://${config.host}:${config.port}/\x1b[0m`);
  console.log(`  \x1b[32m✔\x1b[0m Display RFB Gateway:  \x1b[1m\x1b[36mws://${config.host}:${config.port}/api/boxes/:id/display\x1b[0m`);
  console.log(`  \x1b[32m✔\x1b[0m Jobs Control Plane:   Durable persistence active (${config.jobsFile})`);
  console.log(`  \x1b[32m✔\x1b[0m Tenant Isolation:     Dedicated bridge network (ICC disabled) & persistent volumes`);
  console.log(`\n\x1b[1m\x1b[32mAgentBoxes service is READY. Press Ctrl+C to terminate.\x1b[0m\n`);

  const shutdown = async () => {
    console.log('\n\x1b[33mStopping AgentBoxes gateway and lifecycle policy engine...\x1b[0m');
    policies.stop();
    await gateway.stop();
    console.log('\x1b[32mShutdown complete.\x1b[0m');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('\x1b[31mFatal bootstrap error:\x1b[0m', err);
  process.exit(1);
});
