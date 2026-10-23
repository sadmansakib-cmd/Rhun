# Shield Security — Security Review & Policy

## 1. Secrets Management & Environment Isolation
- **Status:** Verified Clean.
- **Rules Enforced:**
  - Zero API keys (`SAFE_BROWSING_KEY`, `VT_API_KEY`, `ABUSECH_KEY`) are committed to Git, hardcoded in source files, printed in logs, or bundled into the client build.
  - `.env`, `.env.*`, `.dev.vars`, and `worker/.dev.vars` are strictly excluded in `.gitignore`.
  - Worker secrets are loaded exclusively at runtime via Cloudflare Worker secret bindings configured via `npx wrangler secret put`.
  - Client web application and extension communicate with the worker proxy and never receive or store upstream API credentials.

---

## 2. Cross-Site Scripting (XSS) Prevention
- **Status:** Verified Clean.
- **Rules Enforced:**
  - `dangerouslySetInnerHTML` is prohibited and absent across all React and TypeScript components.
  - All external text (URLs, brand explanations, scanner reasons, and error messages) is rendered safely as escaped text nodes.
  - In `src/extension/content.ts`, the Shadow DOM warning banner constructs DOM elements using `document.createElement`, `textContent`, and safe DOM appending, preventing HTML injection from untrusted page content.

---

## 3. Server-Side Request Forgery (SSRF) Protection
- **Status:** Implemented & Verified in `worker/src/ssrf.ts` and `worker/src/redirects.ts`.
- **Rules Enforced:**
  - Before following any redirect hop, the target hostname is evaluated against a blocked list:
    - IPv4 Loopback (`127.0.0.0/8`)
    - RFC1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
    - Link-Local and Cloud Metadata (`169.254.0.0/16`, specifically blocking `169.254.169.254`)
    - Current Network (`0.0.0.0/8`), Carrier-grade NAT (`100.64.0.0/10`), Multicast (`224.0.0.0/4`)
    - IPv6 Loopback (`::1`), Link-Local (`fe80::/10`), and Unique Local (`fc00::/7`, `fd00::/8`)
    - Hostnames: `localhost`, `*.local`, `*.internal`, `*.lan`
  - Maximum 5 redirect hops.
  - Strict 3.5s timeout.
  - Rejects non-http(s) schemes.
  - Performs `HEAD` requests only to read `Location` headers without downloading response bodies.
  - Zero cookies or credentials forwarded across hops (`credentials: 'omit'`).

---

## 4. Cross-Origin Resource Sharing (CORS) & Rate Limiting
- **Status:** Implemented & Verified in `worker/src/cors.ts`.
- **Rules Enforced:**
  - CORS dynamically verifies the `Origin` header against `ALLOWED_ORIGINS` and approved `chrome-extension://` IDs.
  - Per-IP sliding window rate limiting limits client requests to 30 queries per minute to protect upstream API quotas and prevent proxy abuse.

---

## 5. Chrome Extension (Manifest V3) Security & Content Security Policy (CSP)
- **Status:** Verified Clean.
- **Rules Enforced:**
  - Manifest V3 compliant (`manifest_version: 3`).
  - Strict CSP: `"extension_pages": "script-src 'self'; object-src 'self';"`.
  - Zero inline scripts in `popup.html`, `options.html`, or `warning.html` (all scripts loaded as external modular bundles).
  - No `eval()`, `new Function()`, or remotely hosted code.
  - Minimal permissions requested: `storage`, `activeTab`, `contextMenus`, `management`, `alarms`, `notifications`.
  - `<all_urls>` is **never** requested as a default permission at install time; optional host permissions are requested only at runtime via `chrome.permissions.request()` upon explicit user approval.

---

## 6. Dependency Audit Summary
- **Status:** Documented.
- Running `npm audit` identifies dev-time vulnerabilities inside transitive dependencies of testing and build tools (`chokidar`/`braces` in `tailwindcss@3` and `tinypool` in `vitest`). These tools are executed purely at development/build time on developer workstations and are never bundled into the client runtime or extension distributions.
