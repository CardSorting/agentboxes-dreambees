/**
 * Diagnostic Classifier & Failure Boundary Engine (Commission 008 Revision II)
 * Enforces the institutional division of responsibilities:
 * 
 * 1. Workstation or connectivity failure (DreamBees owns)
 * 2. Agent installation or configuration failure (DreamBees owns)
 * 3. Agent execution or reasoning failure (User owns)
 * 4. User workflow or code defect (User owns)
 * 
 * DreamBees manages the computers. Users operate the agents.
 */

import crypto from 'node:crypto';
import type { FailureCategory, DiagnosticRecord } from '../types/box.js';

export class DiagnosticClassifier {
  /**
   * Classifies an observed incident, exception, or failure string into one of the
   * four institutional failure tiers and attributes service ownership.
   */
  static classify(
    errorOrMessage: Error | string,
    context?: { stage?: string; command?: string; exitCode?: number }
  ): DiagnosticRecord {
    const raw = typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage.message || String(errorOrMessage);
    const msg = raw.toLowerCase();
    const id = `diag-${crypto.randomUUID().slice(0, 8)}`;
    const timestamp = Date.now();

    // 1. Workstation & Connectivity Failures (DreamBees Owns)
    if (
      msg.includes('docker') ||
      msg.includes('xvfb') ||
      msg.includes('x11vnc') ||
      msg.includes('rfb') ||
      msg.includes('display bridge') ||
      msg.includes('connection refused') ||
      msg.includes('bridge network') ||
      msg.includes('subnetted') ||
      msg.includes('cgroup') ||
      msg.includes('container terminated') ||
      msg.includes('container killed') ||
      context?.stage === 'starting_desktop' ||
      context?.stage === 'creating_volumes' ||
      context?.stage === 'verifying_health'
    ) {
      return {
        id,
        timestamp,
        category: 'workstation_connectivity',
        serviceOwner: 'dreambees',
        summary: 'Workstation runtime, container, or remote display infrastructure fault.',
        details: raw,
        remediation: 'DreamBees automated recovery will attempt restart. If recurring, escalate to DreamBees IT operations.'
      };
    }

    // 2. Agent Tool Installation & Configuration Failures (DreamBees Owns)
    if (
      context?.stage === 'installing_agents' ||
      msg.includes('failed to install') ||
      msg.includes('recipe') ||
      msg.includes('apt-get') ||
      msg.includes('dpkg') ||
      msg.includes('no such file or directory: /home/operator/.local/bin') ||
      msg.includes('permission denied: /home/operator')
    ) {
      return {
        id,
        timestamp,
        category: 'agent_installation_config',
        serviceOwner: 'dreambees',
        summary: 'Agent tooling installation, package prerequisite, or profile configuration failure.',
        details: raw,
        remediation: 'DreamBees manages approved tool recipes. Request recipe patch or container image update.'
      };
    }

    // 3. Agent Execution & Reasoning Failures (User Owns)
    if (
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('insufficient_quota') ||
      msg.includes('maximum context length') ||
      msg.includes('context_length_exceeded') ||
      msg.includes('invalid_api_key') ||
      msg.includes('unauthorized') ||
      msg.includes('token limit') ||
      msg.includes('hallucinat') ||
      msg.includes('refusal') ||
      msg.includes('byok')
    ) {
      return {
        id,
        timestamp,
        category: 'agent_execution_reasoning',
        serviceOwner: 'user',
        summary: 'Agent model reasoning, context window, or provider credential issue.',
        details: raw,
        remediation: 'Verify customer BYOK API key in ~/.bashrc, check provider token quota, or adjust model prompt.'
      };
    }

    // 4. User Workflow Failures (User Owns)
    return {
      id,
      timestamp,
      category: 'user_workflow',
      serviceOwner: 'user',
      summary: 'User application code, build step, or workflow failure.',
      details: raw,
      remediation: 'Review application code, test suite failures, or missing project files inside /home/operator/workspace.'
    };
  }
}
