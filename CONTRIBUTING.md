# Contributing to DreamBeesAI
## Archival Project Guidelines

**Notice:** DreamBeesAI is an **archived experimental project** governed under HEAV3NS Archival Commission 014. Active product feature development and commercial hosting investigations have concluded.

---

## 1. Project Freeze Status

As of October 2026, the DreamBeesAI repository is under an official **Project Freeze**.
- No new feature expansions, product pivots, or additional agent integrations are being accepted.
- No commercial roadmap or managed cloud hosting service is maintained.

---

## 2. Permitted Scope of Contributions

Pull requests and issues will only be considered if they strictly adhere to one of the following archival maintenance criteria:

1. **Security Vulnerability Remediations:** Fixes for critical security bugs that would render independent self-hosting unsafe.
2. **Reproducibility Fixes:** Corrections to Dockerfiles, npm scripts, or build configurations that prevent the software from building on modern systems.
3. **Documentation Accuracy:** Clarifications or corrections of materially inaccurate technical descriptions in the `/wiki` or `/docs`.
4. **License & Attribution Compliance:** Fixes for third-party notices or copyright attribution.

---

## 3. Developing Locally

If you are inspecting or testing the codebase:

```bash
# Clone the repository
git clone https://github.com/heav3ns/dreambeesai.git
cd dreambeesai

# Install dependencies
npm install

# Build local container image
npm run docker:build

# Run the test suite
npm run test:commission013
```

---

## 4. Submitting Pull Requests

1. Fork the repository and create a branch dedicated to your fix.
2. Ensure all automated test suites pass without regression (`npm run test:commission013`).
3. Maintain existing code styling, documentation standards, and strict adherence to the project freeze boundary.
4. Open a pull request with a clear description of why the change meets the permitted maintenance scope above.
