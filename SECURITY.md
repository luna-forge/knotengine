# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the severity of the vulnerability and the age of the release.

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5.0 | :x:                |

## Reporting a Vulnerability

**⚠️ DO NOT open a public GitHub Issue for security vulnerabilities.**

If you discover a security vulnerability in KnotEngine, please report it to us responsibly.

### How to Report

1.  **Draft Pull Request:** Open a Draft PR with the title `[Security] <Vulnerability Title>`. Draft PRs are only visible to repository collaborators, keeping the discussion private until you are ready to publish it.
2.  **Contact Maintainers:** If a PR is not possible, reach out via GitHub Discussions or open a standard issue and we will label it appropriately.

### What to Expect

- **Acknowledgment:** We will acknowledge receipt of your report within **48 hours**.
- **Assessment:** We will investigate the issue and determine the impact.
- **Resolution:** Once a fix is developed, we will coordinate a release date with you.
- **Credit:** We appreciate responsible disclosure and will credit you in the release notes (unless you prefer to remain anonymous).

## Scope

We are particularly interested in reports regarding:

- Private key leakage or exposure.
- Wallet derivation bypasses.
- Authentication/Authorization flaws (e.g., bypassing 2FA or API keys).
- Payment manipulation (e.g., altering amounts or addresses).

## Out of Scope

- Missing HTTP security headers (unless they lead to a direct exploit).
- Social engineering attacks.
- Denial of Service (DoS) attacks that require excessive resources.
