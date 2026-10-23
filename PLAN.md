# Shield Security — Implementation Plan

This plan outlines replacing the mocked security services with a real local heuristics engine, a Cloudflare Worker security proxy, Chrome extension integration, and test verification without redesigning the UI.

---

## 1. Overview of Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client UI Layer                          │
│  (React + Tailwind + Popup 360x600 + warning.html + Shadow)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 ┌──────────────────────┐              ┌──────────────────────┐
 │  Local Engine (P1)   │              │  Cloudflare Worker   │
 │  - Pure TypeScript   │              │  Security Proxy (P2) │
 │  - Zero network      │              │  - Secret Keys only  │
 │  - Lexical, TLD,     │              │  - Safe Browsing     │
 │    Homoglyphs,       │              │  - VirusTotal        │
 │    Typosquatting,    │              │  - abuse.ch          │
 │    Fake APK patterns │              │  - SSRF-safe redirect│
 └──────────┬───────────┘              │  - RDAP Domain Age   │
            │                          └──────────┬───────────┘
            └──────────────────┬──────────────────┘
                               ▼
            ┌─────────────────────────────────────┐
            │   Merged ScanResult (/services/api) │
            │   - Sources Statuses                │
            │   - 0-100 Risk Score (Never 100%    │
            │     safe; missing = unknown)        │
            └─────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Plan

### Phase 1: Local Engine (`/src/engine`, Pure TypeScript, Zero Network)
- **Files to create/modify:**
  - `src/engine/url.ts`: URL parsing, canonical normalization, schema validation (strictly reject non-http/https, e.g. `javascript:`, `data:`, `file:`).
  - `src/engine/brands.ts`: Curated, editable dictionary of targeted brands (bKash, Nagad, Rocket, Upay, Daraz, Islami Bank, City Bank, BRAC Bank, Eastern Bank, Google, Facebook, WhatsApp, Telegram, Binance, Microsoft, Apple, Netflix, etc.).
  - `src/engine/heuristics.ts`: Individual heuristic checks returning structured reason `{ code, severity, explanationEn, explanationBn, potentialHarmEn, potentialHarmBn }`:
    1. `IP_AS_HOST`: IPv4/IPv6 used directly as hostname instead of a domain.
    2. `USERINFO_IN_URL`: `@` character in authority section (credential masking).
    3. `PUNYCODE_HOMOGLYPH`: Punycode `xn--` or mixed Cyrillic/Greek homoglyphs spoofing Latin characters.
    4. `EXCESSIVE_SUBDOMAINS_OR_LENGTH`: Deep subdomain nesting (`> 3` levels) or overly long URLs (`> 120` chars).
    5. `HTTP_NO_TLS`: Plaintext HTTP connection.
    6. `RISKY_TLD`: Known high-abuse TLDs (`.top`, `.xyz`, `.work`, `.click`, `.gq`, `.cf`, `.tk`, `.fit`, `.loan`, `.buzz`, `.country`).
    7. `SUSPICIOUS_KEYWORDS`: Urgent terms in path/query (`login`, `verify`, `bonus`, `otp`, `cashback`, `free-gift`, `account-lock`, `kyc-update`, `reward`).
    8. `URL_SHORTENER`: Free link redirection services (`bit.ly`, `tinyurl.com`, `is.gd`, `t.co`, `cutt.ly`).
    9. `TYPOSQUATTING`: Levenshtein / Damerau-Levenshtein distance (distance 1-2) against brand keywords, e.g., `faceb00k`, `bkaash`, `nagadd`.
    10. `FAKE_APK_DOWNLOAD`: URLs ending with `.apk` or containing APK download queries originating from non-store hostnames.
  - `src/engine/scoring.ts`: Combines fired heuristic reasons into a `riskScore` (0-100) and `verdict`:
    - Base score calculation with weighted severity (`critical: +40`, `high: +25`, `medium: +15`, `low: +8`).
    - Clamped to 99 max (never outputs "100% safe" or 0% risk). Minimum baseline risk floor of 5 for unknown items.
    - Missing or unavailable checks produce verdict `unknown` contributions, never `safe`.
  - `src/engine/index.ts`: Public API exporting `evaluateLocalUrl(rawUrl: string): LocalEngineResult`.

### Phase 2: Cloudflare Worker Security Proxy (`/worker`)
- **Files to create/modify:**
  - `worker/wrangler.toml`: Worker configuration, routes, compatibility date, and environment variable bindings (`PROXY_ORIGINS`, `CACHE_TTL`).
  - `worker/src/types.ts`: Worker request/response schemas for `/api/url-check` and `/api/hash-check`.
  - `worker/src/index.ts`: Worker entry point with CORS validation (allowing configured web origin and extension `chrome-extension://<id>`), per-IP sliding window rate limiting, input sanitization, and request routing.
  - `worker/src/services/safeBrowsing.ts`: Google Safe Browsing Lookup v4 or v5 API call using `SAFE_BROWSING_KEY`. Graceful fallback to `unavailable` on failure or quota exhaustion.
  - `worker/src/services/virusTotal.ts`: VirusTotal API v3 URL report (`/api/v3/urls/{id}`) and file hash lookup (`/api/v3/files/{hash}`) using `VT_API_KEY`.
  - `worker/src/services/abuseCh.ts`: URLhaus API for URL reputation and MalwareBazaar API for file hash queries using `ABUSECH_KEY` (or open endpoints with key headers).
  - `worker/src/services/redirects.ts`: Server-side redirect-chain expansion with strict SSRF protection:
    - Blocks private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, loopback, link-local, IPv6 unicast).
    - Max 5 hops, 3.5s timeout, rejects non-http(s), headers-only check without downloading body, zero cookies forwarded.
  - `worker/src/services/rdap.ts`: Domain age extraction via RDAP with timeout; returns `domainAgeDays` or `unknown`.
  - `worker/src/cache.ts`: Cache API / KV layer (1-hour TTL) to protect free-tier quotas and ensure high speed.
  - `.gitignore`: Verify `worker/.dev.vars`, `.env`, and secret files are strictly excluded.

### Phase 3: Service Layer Integration (`/src/services/api.ts`)
- **Files to create/modify:**
  - `src/services/api.ts`:
    - `scanUrl(url: string)`:
      1. Runs local engine (`evaluateLocalUrl`) immediately.
      2. If `PROXY_BASE_URL` is set, calls `POST /api/url-check` on Worker.
      3. If `PROXY_BASE_URL` is empty, activates `DEMO_MODE` with visible DEMO badge and uses simulated cloud provider fallbacks combined with real local engine heuristics.
      4. Merges local and remote results into unified `ScanResult` with per-source status (`clean`, `threat_found`, `unavailable`, `rate_limited`).
    - `scanApk(input: { sha256?: string; permissions?: string[]; fileName?: string })`:
      - Hash check queried via Worker `POST /api/hash-check` (VirusTotal & MalwareBazaar).
      - Local permission combination table: `READ_SMS` + `SYSTEM_ALERT_WINDOW` (overlay attack), `READ_SMS` + `INTERNET` (OTP stealer), `BIND_ACCESSIBILITY_SERVICE` (banking trojan/keylogger), `REQUEST_INSTALL_PACKAGES` (dropper) with bilingual explanations.
    - `scanExtension(storeUrlOrId: string)`:
      - Extracts Chrome Web Store extension ID (32 lowercase alpha characters).
      - Performs static permission/metadata analysis where accessible; returns `unknown` honestly with missing rationale if unresolvable.
    - Preserves Android-only methods (`installedAppsAudit`, `notificationMonitor`) marked `TODO(native)`.
  - `src/types.ts`: Keep synchronized with all contract changes.

### Phase 4: Chrome Extension Real Behavior
- **Files to modify:**
  - `popup.html` & `src/App.tsx`:
    - "Check this page" calls `chromeAdapter.getCurrentTabUrl()` to fetch active tab URL via `activeTab` permission.
    - Runs through `scanUrl` and renders risk badge, score, source breakdown, and link to options or interstitial.
  - `src/extension/background.ts`:
    - Context menu: "Check this link with Shield" right-click on links triggers `scanUrl` and pushes a rich Chrome Notification.
    - If high risk, dispatches a message to the active tab to display the content script banner.
    - Periodic extension audit alarm queries `chrome.management.getAll()`.
  - `src/extension/content.ts`:
    - Injects `#shield-warning-host` with Shadow DOM for CSS isolation on high-risk pages.
    - Details button redirects to `warning.html` passing URL and verdict parameters.
  - `warning.html` & `src/warning.ts`:
    - Full-page interstitial: "Go back to safety" (primary) and "Proceed anyway" (secondary with two-step confirmation).
  - `src/platform/chromeAdapter.ts`:
    - `auditInstalledExtensions()` reads `chrome.management.getAll()` with real permission risk rules (broad host access, cookies/history, clipboard, development install) with bilingual explanations.
  - Verify minimal permissions: `storage`, `activeTab`, `contextMenus`, `management`, `alarms`, `notifications` (no default `<all_urls>`).

### Phase 5: Tests, Security Review & Documentation
- **Files to create/modify:**
  - `src/engine/__tests__/engine.test.ts`: Unit tests for local engine using harmless fixtures (`example.com`, `faceb00k-login.example`, homoglyph punycode, synthetic APK URLs). Zero real malicious URLs contacted.
  - `worker/__tests__/worker.test.ts`: Mock-based Worker tests (SSRF block verification for 127.0.0.1 and 192.168.1.1, rate limit, provider graceful degradation).
  - Security audit:
    - Search repository for hardcoded keys, verify `.gitignore` covers `.env` and `.dev.vars`.
    - Check XSS prevention (no `dangerouslySetInnerHTML`, all external text rendered as text).
    - Review CSP of extension (no `eval`, no inline scripts, strict CSP).
    - Run `npm audit`.
  - `SECURITY.md`: Findings, risk mitigations, and resolved items.
  - `README.md`: Setup instructions, Worker deployment guide, secrets configuration, and extension loading instructions.

---

## 3. Order of Implementation

1. **Phase 1**: Local Engine (`src/engine/url.ts`, `brands.ts`, `heuristics.ts`, `scoring.ts`, `index.ts`, and unit tests).
2. **Phase 2**: Cloudflare Worker (`worker/wrangler.toml`, `src/index.ts`, service clients, SSRF protection, cache, and tests).
3. **Phase 3**: Service Layer (`src/services/api.ts` wired to local engine + Worker proxy + APK permission matrix).
4. **Phase 4**: Chrome Extension MV3 behavior (`background.ts`, `content.ts`, `warning.ts`, `popup.html`, `chromeAdapter.ts`).
5. **Phase 5**: Full test suite execution, security audit, `SECURITY.md`, and updated `README.md`.

---

## 4. Manual Steps Needed from the User

> [!IMPORTANT]
> **Do NOT paste any API keys in the chat.** When Phase 2 is ready to deploy or test against live external cloud APIs, you will run the following commands yourself in your terminal:

1. **Cloudflare Worker Setup & Secrets:**
   ```bash
   cd worker
   # Login to your Cloudflare account (if not already logged in)
   npx wrangler login

   # Set your API keys as secure Worker secrets (wrangler will prompt you to enter each key privately):
   npx wrangler secret put SAFE_BROWSING_KEY
   npx wrangler secret put VT_API_KEY
   npx wrangler secret put ABUSECH_KEY

   # Deploy the worker
   npx wrangler deploy
   ```
2. **Configure Frontend with Worker URL:**
   - Copy the deployed Worker URL (e.g. `https://shield-proxy.<your-subdomain>.workers.dev`) and place it in your local `.env` (or pass it during build):
     ```bash
     VITE_PROXY_BASE_URL=https://shield-proxy.<your-subdomain>.workers.dev
     ```
3. **Load Chrome Extension in Developer Mode:**
   - Run `npm run build:ext`.
   - Open Chrome at `chrome://extensions`.
   - Enable **Developer mode** (top-right).
   - Click **Load unpacked** (top-left) and select the `dist-ext` folder in this repository.
