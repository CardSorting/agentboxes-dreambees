# Third-Party Notices & Dependency License Inventory
## DreamBeesAI · Open-Source Release

This document lists the third-party software packages, libraries, base images, and components utilized by DreamBeesAI, along with their respective licensing terms.

---

## 1. Direct Node.js Dependencies

| Package | Version | License | Upstream Repository / Notice |
| :--- | :--- | :--- | :--- |
| **`@novnc/novnc`** | ^1.7.0 | MPL-2.0 (Mozilla Public License 2.0) | https://github.com/novnc/noVNC |
| **`ws`** | ^8.18.0 | MIT License | https://github.com/websockets/ws |
| **`tsx`** | ^4.19.0 | MIT License | https://github.com/privatenumber/tsx |
| **`typescript`** | ^5.7.0 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| **`@types/node`** | ^22.10.0 | MIT License | https://github.com/DefinitelyTyped/DefinitelyTyped |
| **`@types/ws`** | ^8.5.13 | MIT License | https://github.com/DefinitelyTyped/DefinitelyTyped |

---

## 2. Container Runtime & Linux Desktop Components

DreamBeesAI builds a Linux container image via [`Dockerfile.agentbox`](file:///Users/bozoegg/Desktop/dreambeesai/Dockerfile.agentbox). The container image incorporates the following upstream software:

| Component | Upstream Project | License | Distribution Mechanism |
| :--- | :--- | :--- | :--- |
| **Ubuntu Linux** | Canonical Ltd. | Mixed (GPL, LGPL, MIT, BSD) | Container base image (`ubuntu:24.04`) |
| **XFCE Desktop** | XFCE Development Team | GPL-2.0 / LGPL-2.0 | Installed via `apt-get install xfce4` |
| **Xvfb** | X.Org Foundation | MIT License | Installed via `apt-get install xvfb` |
| **x11vnc** | Karl Runge / GitHub | GPL-2.0 | Installed via `apt-get install x11vnc` |
| **Google Chrome** | Google LLC | Google Chrome Terms of Service | Downloaded from official Google apt repository during build |
| **Git** | Software Freedom Conservancy | GPL-2.0 | Installed via `apt-get install git` |
| **xclip** | Kim Saunders | GPL-2.0 | Installed via `apt-get install xclip` |
| **Python 3** | Python Software Foundation | PSF License | Installed via `apt-get install python3` |

---

## 3. Official AI Agent Applications (Pre-Installed in Container)

To preserve strict compliance with third-party distribution policies, **no proprietary binaries or secret assets are bundled into this repository's source code**.

When the container image is constructed via Docker, standard npm package commands install the latest official agent packages from the public npm registry:

1. **`@anthropic-ai/claude-code`**
   - Publisher: Anthropic, PBC
   - Distribution: Public npm package
   - Terms: Subject to Anthropic's Terms of Service and Commercial API Agreements.
   - Credentials: Users provide their own keys (`claude login` or `ANTHROPIC_API_KEY`).

2. **`@openai/codex`**
   - Publisher: OpenAI, LLC
   - Distribution: Public npm package
   - Terms: Subject to OpenAI's Terms of Use and API Policies.
   - Credentials: Users provide their own keys (`codex login` or `OPENAI_API_KEY`).

---

## 4. Mozilla Public License 2.0 Notice (`@novnc/novnc`)

The browser remote desktop client includes unmodified portions of `@novnc/novnc` distributed under the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, you can obtain one at https://mozilla.org/MPL/2.0/.

---

## 5. Summary of Compliance

DreamBeesAI's source code is licensed under the Apache License 2.0.
The inclusion of dependencies licensed under MIT, BSD, Apache-2.0, MPL-2.0, and GPL-2.0 (in container runtime userland) is compliant with standard open-source distribution practices because:
1. Container runtime components are dynamically linked or installed via upstream package managers during Docker build.
2. No proprietary agent binaries or credentials are distributed within the Git repository source tree.
