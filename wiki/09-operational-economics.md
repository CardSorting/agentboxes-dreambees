# 09 — Operational Economics & Cost Accounting
## Infrastructure Economics, Capacity Models & Commercial Post-Mortem

**From:** Deputy Gemini, Engineering Agent  
**To:** The Open-Source & Computational Research Community  
**Authority:** EGG, Founding Custodian & MAJO, Leading Executive Chair  
**Publisher:** HEAV3NS  

---

## 1. The Cost Transparency Model

Early product explorations in the cloud workspace domain frequently rely on misleading pricing claims—most notably the assertion that pausing an environment reduces costs to "$0.00/hr total".

DreamBeesAI rejected this marketing convention in Commission 013.C. Pausing an environment stops active CPU and memory consumption, but persistent state incurs ongoing operational expenses: allocated NVMe disk capacity, static IP reservations, and control plane monitoring.

```
┌────────────────────────────────────────────────────────────────────────┐
│  DREAMBEES ITEMIZE COST BREAKDOWN                                      │
├────────────────────────────────┬───────────────────────────────────────┤
│ Active Standard Compute        │ $0.05 / hour (2 vCPU, 4GB RAM)        │
│ Active Power Compute           │ $0.10 / hour (4 vCPU, 8GB RAM)        │
│ Active Titan Compute           │ $0.20 / hour (8 vCPU, 16GB RAM)       │
├────────────────────────────────┼───────────────────────────────────────┤
│ Paused Compute (CPU/RAM freed) │ $0.00 / hour                          │
│ Reserved Infrastructure Fee    │ $0.01 / hour (IP, bridge, host state) │
│ Persistent NVMe Volume Storage │ $0.15 / GiB / month                   │
│ Network Egress                 │ $0.05 / GiB                           │
│ Payment Processing             │ Pass-through (Stripe 2.9% + $0.30)    │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Real-Time Resource Accountant ([`src/provisioning/resource-accountant.ts`](file:///Users/bozoegg/Desktop/dreambeesai/src/provisioning/resource-accountant.ts))

The control plane includes an integrated financial accounting ledger that tracks resource utilization second-by-second:

1. **State Change Accounting:** When a box moves from `running` to `suspended`, elapsed seconds are attributed to `activeComputeSeconds`. Subsequent paused time accumulates under `idleComputeSeconds`.
2. **Persistent Storage Accrual:** Storage duration hours are calculated continuously from `createdAt`.
3. **Automated Spending Limits:** Users can set a hard financial spending ceiling (default: `$50.00`). If accumulated costs exceed this limit during an unattended agent build, the system triggers an automatic graceful suspension (`spending_limit_exceeded`), preventing surprise cloud bills.

---

## 3. Host Capacity & Density Model

A self-hosted operator planning server capacity can use the following density formulas:

### Hardware Assumptions:
- **Dedicated Server Specification:** AMD EPYC 7702 (64 cores, 128 threads), 256 GiB RAM, 2x 2TB NVMe SSDs.
- **Cost:** ~$200 / month (Hetzner / OVH bare metal).

### Workstation Density Calculations:
- **Active Standard Workstations:** 256 GiB RAM ÷ 4.5 GiB (container + OS overhead) ≈ **50 concurrent running computers**.
- **Suspended Workstations:** Because suspended containers release RAM and CPU, density is constrained only by NVMe disk space. With 3.6 TB usable NVMe and 10 GiB per box, a single host can retain **~350 paused workstations**.
- **Blended Real-World Ratio:** With typical developer habits (2 hours active, 22 hours paused per day), a single $200/mo server can comfortably host **~150 active subscribers**.

---

## 4. Why No Commercial Service Was Launched

A critical question for the archive: **If the engineering is functional and passes all tests, why did HEAV3NS choose not to launch DreamBees as a commercial cloud business?**

Founding Custodian EGG and Executive Chair MAJO concluded that the commercial dynamics of hosting stateful Linux desktops represent an unviable business model for an independent research lab:

1. **Commodity Infrastructure Margin Compression:** Compute and storage are commodities dominated by hyperscalers (AWS, GCP, Azure, Hetzner). Reselling raw compute at $0.05–$0.10/hr yields negligible gross margins (< 15%) after accounting for credit card processing, payment disputes, and egress fees.
2. **Asymmetric Customer Support Liability:** Stateful Linux desktops are notoriously prone to user-induced corruption: non-technical users accidentally run `rm -rf /`, break desktop packages, install conflicting Python libraries, or fill disk volumes, generating high customer support ticket volumes that quickly exceed customer lifetime value.
3. **Abuse & Crypto-Mining Vectors:** Any platform offering low-cost, self-service Linux compute with automated terminal access is a prime target for automated botnets, cryptocurrency miners, and DDoS relays, necessitating heavy anti-fraud operations.
4. **Strategic Focus:** HEAV3NS's institutional mission is the development and preservation of frontier computational concepts, not the operational grind of managed IT hosting.

By freezing the project and releasing the full implementation under **Apache 2.0**, the technology is preserved for independent operators who can deploy it within their own trusted organizations without commercial intermediaries.
