# HEAV3NS — ENGINEERING COMMISSION 011.C
## COMPUTE LIFECYCLE, RESOURCE ACCOUNTING & FAILURE RECOVERY
### Predictable Operations, Decoupled Storage, and Transparent Accounting

**From:** Deputy Gemini, Engineering Agent  
**To:** MAJO, Leading Executive Chair & EGG, Founding Custodian  
**Status:** DELIVERED & SPECIFIED  
**Repository:** `/Users/bozoegg/Desktop/dreambeesai`  
**Guiding Doctrine:** *A COMPUTER SHOULD NOT REQUIRE ITS OWNER TO UNDERSTAND THE DATA CENTER.*

---

## 1. Executive Summary

Commission 011.C establishes operational predictability and customer clarity for DreamBees Cloud Computers.

Customers must understand:
1. What state their computer is in at any time.
2. How to pause compute costs without risking project data loss.
3. How resource consumption is tracked and billed.
4. What happens when an environment is suspended, resumed, or deleted.

---

## 2. Formal Compute Lifecycle State Machine

```
               [Customer Request]
                       |
                       v
                 +-----------+
                 | REQUESTED |
                 +-----+-----+
                       | (Capacity Reserved)
                       v
                  +--------+
                  | QUEUED |
                  +----+---+
                       | (Asynchronous Provisioning Job)
                       v
               +---------------+
               | PROVISIONING  | <---+ (Reset / Rebuild)
               +-------+-------+     |
                       |             |
                       v             |
                   +-------+         |
                   | READY |         |
                   +---+---+         |
                       | (Auto-Start)|
                       v             |
        +--------> +---------+ ------+
        | (Resume) | RUNNING | 
        |          +----+----+ ------+
        |               |            | (Pause / Suspend)
        | (Start)       v            v
        +--------+  +-------+  +-----------+
                 |  | STOPPED|  | SUSPENDED |
                 +--+-------+  +-----+-----+
                                     | (Resume Compute)
                                     +--------------------+
                                                          |
                                                          v
                                                    +-----------+
                                                    |  RUNNING  |
                                                    +-----+-----+
                                                          | (Confirmed Deletion)
                                                          v
                                                 +------------------+
                                                 | DECOMMISSIONING  |
                                                 +--------+---------+
                                                          | (Volumes & Networks Purged)
                                                          v
                                                      +-------+
                                                      |DELETED|
                                                      +-------+
```

### Lifecycle Semantics:
- **RUNNING**: Dedicated container running with Xvfb virtual desktop, x11vnc server, and user desktop sessions. Compute billed at standard rate ($0.05/hour).
- **SUSPENDED (Paused)**: Container is stopped via `docker stop`. CPU, RAM, and GPU resources are immediately released back to the host pool. Compute costs drop to **$0.00/hour**. All project files and Git history in `/workspace` are retained permanently on persistent Docker volumes.
- **DELETED**: Permanent decommissioning triggered with exact computer name confirmation. All active desktop sessions terminate, agent processes are killed, and persistent storage volumes are completely purged.

---

## 3. Resource Accounting & Transparent Billing

DreamBees operates on an honest, transparent billing model:

```
Total Monthly Cost = Compute Cost + Storage Cost + Network Cost + $0.00 Token Markup
```

| Cost Category | Rate | Customer Explanation |
| :--- | :--- | :--- |
| **Active Compute** | $0.05 / hour | Billed by the second while the computer is active or running tasks. |
| **Paused Compute** | $0.00 / hour | Zero charge when the computer is paused. Releasing hardware saves money. |
| **Workspace Storage** | $0.10 / GB-month | Retains persistent files, dependencies, and Git branches across sessions. |
| **Model Tokens** | **$0.00 (BYOA)** | Billed directly to the customer's Anthropic or OpenAI API keys or subscriptions. |

### Financial Safety Mechanisms:
- **Tenant Spending Limits**: Owners configure a hard monthly dollar ceiling (default: $50.00). When total fleet costs reach the limit, new provisioning requests fail-closed with `budget_exhausted` to prevent runaway cloud bills.
- **Idle Auto-Pause**: When all active desktop sessions disconnect and no foreground agent tasks are running, the computer can automatically suspend to prevent billing idle compute.

---

## 4. Failure Recovery & Self-Healing

The autonomous reconciliation engine (`AgentBoxManager.reconcileRunningBoxes`) executes on startup and periodically to maintain consistency:

1. **Host Restart / Crash Recovery**:
   When the DreamBees host reboots, the manager reconciles persistent ledgers with live Docker state. Any computer recorded as running whose container stopped transitions cleanly to `stopped`, allowing the user to resume with 100% data retention.
2. **Member Session Healing**:
   When a computer resumes from suspension, `executeResumePipeline` inspects `box.members`. For all active members, their Linux user identities and dedicated Xvfb/VNC desktop sessions are restored automatically.
3. **Orphaned Resource Reaping**:
   Interrupted deletions or orphaned bridge networks are swept during reconciliation, preventing host subnet exhaustion.
