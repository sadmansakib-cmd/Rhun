# Shield Security — Multi-Platform Cybersecurity Suite

Shield Security is a privacy-first, bilingual (**English + বাংলা**) cybersecurity application shipping across three targets from one shared codebase:
1. **Web / PWA Target** (Responsive web app with capability-aware adapter cards)
2. **Chrome Extension (Manifest V3)** (`popup.html` 360×600 compact dashboard, `options.html` full suite, `warning.html` interstitial, Shadow DOM warning banner, and background service worker)
3. **Android Target** (Capacitor-ready bridge architecture + native Jetpack Compose APK)

---

## 1. Feature & Platform Capability Matrix

| Capability Key | Feature Description | Web / PWA (`id: 'web'`) | Android App (`id: 'android'`) | Chrome Extension MV3 (`id: 'chrome-ext'`) |
| :--- | :--- | :---: | :---: | :---: |
| `currentTabCheck` | URL & active page phishing, brand spoof, and malware scanner | ✅ **Real** (Local Engine + Worker Proxy) | ✅ **Real** (Local Engine + Share Intent) | ✅ **Real** (`activeTab` + Context Menu) |
| `installedExtensionsAudit` | Audit extensions, host access breadth (`<all_urls>`), and dangerous permissions | ⚠️ Shows *"Available on Chrome Extension"* | ⚠️ Shows *"Available on Chrome Extension"* | ✅ **Real** (`chrome.management.getAll()`) |
| `installedAppsAudit` | Audit installed APKs, dangerous permissions (`READ_SMS`, `RECORD_AUDIO`), and unknown sources | ⚠️ Shows *"Available on Android"* | 🟡 **Mocked/Curated** (`TODO(native)` Capacitor plugin) | ⚠️ Shows *"Available on Android"* |
| `notificationMonitor` | Monitor incoming SMS/chat notifications for phishing links without AccessibilityService | ⚠️ Shows *"Available on Android"* | 🟡 **Mocked/Curated** (`TODO(native)` NotificationListener) | ⚠️ Shows *"Available on Android"* |
| `downloadGuard` | Intercept and check unverified `.apk`, `.crx`, or `.exe` downloads | ⚠️ Limited sandbox warning | ✅ **Real** (APK pattern & hash checks) | ✅ **Real** (Service worker download notifications) |
| `backgroundScan` | Periodic background security audit & log | ❌ Disabled in Web tab | 🟡 **Mocked** (`WorkManager` stub) | ✅ **Real** (`chrome.alarms` periodic audit) |

---

## 2. Quick Start & Setup

### Install Dependencies
```bash
npm install
```

### Run Web Development Server
```bash
npm run dev
```

### Run Automated Tests
```bash
npm test
```

### Build Web & Chrome Extension
```bash
# Build production web bundle into dist/
npm run build:web

# Build ready-to-load Chrome extension into dist-ext/
npm run build:ext
```

---

## 3. Chrome Extension (Manifest V3) — Load Unpacked

1. Run `npm run build:ext` to build the extension into `dist-ext/`.
2. Open Google Chrome or any Chromium-based browser (Brave, Edge, Opera) and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** in the top toolbar.
5. Select the `dist-ext/` folder located in the root of this project.

### Extension Permissions Rationale
Shield strictly follows the principle of least privilege under Manifest V3:
- `storage`: Saves language preferences (`EN` / `বাংলা`) and local history in `chrome.storage.local`.
- `activeTab`: Reads current tab URL **only** when the user clicks *"Check this page"* or the right-click menu.
- `contextMenus`: Adds *"Check this link with Shield"* to link context menus.
- `management`: Queries `chrome.management.getAll()` to list installed extensions and their permissions for the on-device audit screen.
- `alarms`: Runs periodic lightweight extension audits every 6 hours in the background service worker.
- `notifications`: Shows desktop alerts when a scanned link or extension audit uncovers a critical threat.
- `<all_urls>` is **never** requested by default; runtime optional host permissions can be granted only with explicit user confirmation.

---

## 4. Cloudflare Worker Security Proxy (`/worker`)

The worker proxy (`/worker`) provides server-side threat intelligence lookups, redirect-chain resolution with strict SSRF filtering, and domain age queries without exposing API keys to the browser bundle.

### Deploying the Worker
```bash
cd worker
npm install

# Login to Cloudflare
npx wrangler login

# Set your private API keys as Worker secrets (wrangler will prompt you securely):
npx wrangler secret put SAFE_BROWSING_KEY
npx wrangler secret put VT_API_KEY
npx wrangler secret put ABUSECH_KEY

# Deploy to Cloudflare edge
npx wrangler deploy
```

### Connecting the Frontend to Your Worker
Add your deployed Worker URL to your local `.env` file (which is gitignored):
```bash
VITE_PROXY_BASE_URL=https://shield-proxy.<your-subdomain>.workers.dev
```
When `VITE_PROXY_BASE_URL` is empty, Shield runs in **DEMO_MODE** (with a visible DEMO badge), using the real local heuristics engine on-device alongside simulated cloud provider statuses.

---

## 5. Security Architecture
See [SECURITY.md](file:///C:/Users/ramin/antigravity/Shield-Security/SECURITY.md) for details on:
- Zero hardcoded credentials policy.
- SSRF prevention blocking 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, and cloud metadata (169.254.169.254).
- XSS prevention (zero `dangerouslySetInnerHTML`, safe Shadow DOM nodes).
- Strict extension CSP (`script-src 'self'; object-src 'self';`).
