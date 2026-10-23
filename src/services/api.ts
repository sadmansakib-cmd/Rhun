import {
  ScanResult,
  ApkAnalysisResult,
  ScanReason,
  SourceStatus,
  RiskLevel,
  ScanVerdict
} from '../types';
import { evaluateLocalUrl } from '../engine';

// Configure proxy URL via environment variable
export const PROXY_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PROXY_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_PROXY_BASE_URL) ||
  '';

export const DEMO_MODE = !PROXY_BASE_URL;

/**
 * Real URL Scanner combining Local Engine + Cloudflare Worker Proxy
 */
export async function scanUrl(rawUrl: string): Promise<ScanResult> {
  // 1. Evaluate locally first (pure TS, zero network, immediate)
  const local = evaluateLocalUrl(rawUrl);

  const reasonsMap = new Map<string, ScanReason>();
  for (const r of local.reasons) {
    reasonsMap.set(r.code, r);
  }

  const sourcesStatus = {
    localEngine: (local.reasons.length > 0 ? 'threat_found' : 'clean') as SourceStatus,
    safeBrowsing: 'unavailable' as SourceStatus,
    virusTotal: 'unavailable' as SourceStatus,
    urlHaus: 'unavailable' as SourceStatus,
    rdapAge: 'unavailable' as SourceStatus
  };

  let redirectChain = [local.parsed.normalized];
  let domainAgeDays: number | null = null;
  let workerHadThreat = false;

  // 2. If Worker Proxy is configured, query cloud threat intelligence
  if (PROXY_BASE_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${PROXY_BASE_URL.replace(/\/$/, '')}/api/url-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: local.parsed.normalized }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        sourcesStatus.safeBrowsing = data.sources?.safeBrowsing || 'unavailable';
        sourcesStatus.virusTotal = data.sources?.virusTotal || 'unavailable';
        sourcesStatus.urlHaus = data.sources?.urlHaus || 'unavailable';
        sourcesStatus.rdapAge = data.sources?.rdapAge || 'unavailable';

        if (Array.isArray(data.redirectChain) && data.redirectChain.length > 0) {
          redirectChain = data.redirectChain;
        }

        if (typeof data.domainAgeDays === 'number') {
          domainAgeDays = data.domainAgeDays;
        }

        if (Array.isArray(data.reasons)) {
          for (const wr of data.reasons) {
            reasonsMap.set(wr.code, wr);
            if (wr.severity === 'critical' || wr.severity === 'high') {
              workerHadThreat = true;
            }
          }
        }
      }
    } catch (_err) {
      // Graceful degradation: Worker error does not crash the scan, local findings are retained
      sourcesStatus.safeBrowsing = 'unavailable';
      sourcesStatus.virusTotal = 'unavailable';
      sourcesStatus.urlHaus = 'unavailable';
      sourcesStatus.rdapAge = 'unavailable';
    }
  } else {
    // DEMO_MODE: Worker is not configured.
    // Provider status must honestly be 'unavailable', never falsely 'clean'
    sourcesStatus.safeBrowsing = 'unavailable';
    sourcesStatus.virusTotal = 'unavailable';
    sourcesStatus.urlHaus = 'unavailable';
    sourcesStatus.rdapAge = 'unavailable';
  }

  const combinedReasons = Array.from(reasonsMap.values());

  // Aggregate risk score
  let rawScore = 6; // Base risk floor (never 0, never 100% safe)
  for (const reason of combinedReasons) {
    if (reason.severity === 'critical') rawScore += 40;
    else if (reason.severity === 'high') rawScore += 25;
    else if (reason.severity === 'medium') rawScore += 15;
    else rawScore += 8;
  }

  const riskScore = Math.min(99, Math.max(6, rawScore));

  let verdict: ScanVerdict = 'safe';
  let riskLevel: RiskLevel = 'safe';

  const hasMalware = combinedReasons.some((r) => r.code === 'FAKE_APK_DOWNLOAD' || r.code === 'URLHAUS_ACTIVE_MALWARE_URL' || r.code === 'SSRF_BLOCKED_DESTINATION');
  const hasPhishing = combinedReasons.some((r) => r.severity === 'critical' || r.code === 'BRAND_IMPERSONATION' || r.code === 'GOOGLE_SAFE_BROWSING_MATCH');

  if (hasMalware) {
    verdict = 'malware';
    riskLevel = 'high';
  } else if (hasPhishing || riskScore >= 70 || workerHadThreat) {
    verdict = 'phishing';
    riskLevel = 'high';
  } else if (riskScore >= 40) {
    verdict = 'suspicious';
    riskLevel = 'medium';
  } else if (riskScore >= 20 || combinedReasons.length > 0) {
    verdict = 'suspicious';
    riskLevel = 'low';
  }

  if (combinedReasons.length === 0 && verdict === 'safe') {
    combinedReasons.push({
      code: 'NO_KNOWN_THREATS',
      severity: 'info',
      explanationEn: 'No known threats found. This does not guarantee safety.',
      explanationBn: 'কোনো পরিচিত হুমকি পাওয়া যায়নি। তবে এটি সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দেয় না।',
      potentialHarmEn: 'Zero-day, newly registered, or unindexed threats cannot be completely ruled out by heuristic checks alone.',
      potentialHarmBn: 'শুধুমাত্র লোকাল পরীক্ষায় একদম নতুন বা অপরিচিত ফিশিং সাইট পুরোপুরি ধরা নাও পড়তে পারে।'
    });
  }

  return {
    targetUrl: rawUrl,
    normalizedUrl: local.parsed.normalized,
    domain: local.parsed.hostname,
    verdict,
    riskScore,
    riskLevel,
    reasons: combinedReasons,
    sources: sourcesStatus,
    redirectChain,
    domainAgeDays,
    checkedAt: new Date().toLocaleTimeString(),
    triggersShadowBanner: riskLevel === 'high' || riskLevel === 'medium',
    triggersFullInterstitial: riskLevel === 'high',
    isDemo: DEMO_MODE
  };
}

/**
 * Dangerous Permission Combination Rules for Android APK analysis
 */
const DANGEROUS_PERM_COMBOS = [
  {
    requiredPerms: ['READ_SMS', 'SYSTEM_ALERT_WINDOW'],
    name: 'SMS Interception + Screen Overlay Attack',
    severity: 'critical' as const,
    explanationEn: 'App requests READ_SMS alongside SYSTEM_ALERT_WINDOW. Classic signature of banking trojans drawing fake login overlays while silently stealing 2FA OTP codes.',
    explanationBn: 'অ্যাপটি এসএমএস পড়া এবং অন্য অ্যাপের ওপর নকল স্ক্রিন দেখানোর ক্ষমতা চায়। এটি মোবাইল ব্যাংকিং পিন ও ওটিপি চুরির চিরাচরিত লক্ষণ।',
    potentialHarmEn: 'Financial account drain, PIN theft, bypass of SMS 2-factor authentication.',
    potentialHarmBn: 'ব্যাংক একাউন্ট খালি হওয়া এবং ওটিপি ভিত্তিক নিরাপত্তা বাইপাস।'
  },
  {
    requiredPerms: ['BIND_ACCESSIBILITY_SERVICE'],
    name: 'Accessibility Service Privilege Exploitation',
    severity: 'critical' as const,
    explanationEn: 'Requests full Accessibility Service control. Malicious APKs misuse this to read on-screen passwords, auto-click permissions, and prevent uninstallation.',
    explanationBn: 'সম্পূর্ণ অ্যাক্সেসিবিলিটি সার্ভিসের অনুমতি চায়। ম্যালওয়্যার এর মাধ্যমে স্ক্রিনে টাইপ করা পাসওয়ার্ড পড়ে ফেলে এবং আনইনস্টল প্রতিরোধ করে।',
    potentialHarmEn: 'Total remote device compromise, silent screen scraping, and ransomware lockout.',
    potentialHarmBn: 'ফোনের পূর্ণ নিয়ন্ত্রণ হ্যাকারের হাতে চলে যাওয়া এবং স্ক্রিন রেকর্ড হওয়া।'
  },
  {
    requiredPerms: ['READ_SMS', 'INTERNET'],
    name: 'SMS Exfiltration via Internet',
    severity: 'high' as const,
    explanationEn: 'Can read incoming SMS messages and transmit device data over the internet.',
    explanationBn: 'আপনার ফোনে আসা সব এসএমএস পড়তে পারে এবং ইন্টারনেটে বাইরের সার্ভারে পাঠাতে পারে।',
    potentialHarmEn: 'Unauthorized reading of personal correspondence and sensitive financial OTPs.',
    potentialHarmBn: 'ব্যক্তিগত মেসেজ ও আর্থিক লেনদেনের ওটিপি ফাঁসের ঝুঁকি।'
  },
  {
    requiredPerms: ['REQUEST_INSTALL_PACKAGES', 'INTERNET'],
    name: 'Silent Secondary Payload Dropper',
    severity: 'high' as const,
    explanationEn: 'Can download and request installation of unverified secondary APK files outside Google Play Protect.',
    explanationBn: 'ইন্টারনেট থেকে গোপনে দ্বিতীয় আরেকটি ক্ষতিকর অ্যাপ ডাউনলোড করে ইনস্টল করার ক্ষমতা রাখে।',
    potentialHarmEn: 'Drive-by installation of banking spyware after initial install approval.',
    potentialHarmBn: 'ব্যবহারকারীর অজান্তে ফোনে আরও ভাইরাস অ্যাপ ঢুকিয়ে দেওয়া।'
  },
  {
    requiredPerms: ['RECORD_AUDIO', 'RECEIVE_BOOT_COMPLETED'],
    name: 'Persistent Background Microphone Surveillance',
    severity: 'high' as const,
    explanationEn: 'Automatically boots at phone startup and can record microphone audio.',
    explanationBn: 'ফোন চালু হওয়ার সাথে সাথে সক্রিয় হয় এবং গোপনে মাইক্রোফোনে কথা রেকর্ড করতে পারে।',
    potentialHarmEn: 'Covert ambient voice recording and unauthorized privacy invasion.',
    potentialHarmBn: 'কথোপকথন ও চারপাশের শব্দ গোপনে রেকর্ড করা।'
  }
];

/**
 * Real APK Analysis (Hash lookup via Worker + Local Dangerous Permission Combinations)
 */
export async function scanApk(input: {
  sha256?: string;
  permissions?: string[];
  fileName?: string;
}): Promise<ApkAnalysisResult> {
  const perms = (input.permissions || []).map((p) => p.toUpperCase());
  const reasons: ScanReason[] = [];
  const identifiedPermCombos: string[] = [];

  let hashStatus: SourceStatus = input.sha256 && PROXY_BASE_URL ? 'clean' : 'unavailable';

  // 1. Check SHA-256 via Cloudflare Worker if hash provided
  if (input.sha256 && PROXY_BASE_URL) {
    try {
      const res = await fetch(`${PROXY_BASE_URL.replace(/\/$/, '')}/api/hash-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: input.sha256, fileName: input.fileName })
      });
      if (res.ok) {
        const hashData = await res.json();
        hashStatus = hashData.sources?.virusTotal === 'threat_found' ? 'threat_found' : 'clean';
        if (Array.isArray(hashData.reasons)) {
          reasons.push(...hashData.reasons);
        }
      }
    } catch (_e) {
      hashStatus = 'error';
    }
  }

  // 2. Analyze Permission Combinations locally
  for (const combo of DANGEROUS_PERM_COMBOS) {
    const hasAll = combo.requiredPerms.every((req) => perms.some((p) => p.includes(req)));
    if (hasAll) {
      identifiedPermCombos.push(combo.name);
      reasons.push({
        code: combo.name.replace(/\s+/g, '_').toUpperCase(),
        severity: combo.severity,
        explanationEn: combo.explanationEn,
        explanationBn: combo.explanationBn,
        potentialHarmEn: combo.potentialHarmEn,
        potentialHarmBn: combo.potentialHarmBn
      });
    }
  }

  const hasCritical = reasons.some((r) => r.severity === 'critical') || hashStatus === 'threat_found';
  const hasHigh = reasons.some((r) => r.severity === 'high');

  const riskScore = hasCritical ? 92 : hasHigh ? 75 : reasons.length > 0 ? 45 : 10;
  const riskLevel: RiskLevel = hasCritical ? 'high' : hasHigh ? 'high' : reasons.length > 0 ? 'medium' : 'safe';
  const verdict: ScanVerdict = hasCritical ? 'malware' : hasHigh ? 'suspicious' : 'safe';

  return {
    fileName: input.fileName || 'application.apk',
    sha256: input.sha256,
    riskLevel,
    riskScore,
    verdict,
    reasons,
    identifiedPermCombos,
    explanationEn: reasons[0]?.explanationEn || 'No known dangerous permission combinations or malware signatures detected.',
    explanationBn: reasons[0]?.explanationBn || 'কোনো বিপজ্জনক অনুমতি বা ম্যালওয়্যার সিগনেচার পাওয়া যায়নি।',
    sources: {
      hashCheck: hashStatus,
      permissionAudit: reasons.length > 0 ? 'threat_found' : 'clean'
    }
  };
}

/**
 * Chrome Extension ID parser & analysis
 */
export async function scanExtension(storeUrlOrId: string): Promise<{
  id: string;
  status: 'clean' | 'threat_found' | 'unknown';
  reasons: ScanReason[];
  explanationEn: string;
  explanationBn: string;
}> {
  const trimmed = storeUrlOrId.trim();

  // Extract 32-character Chrome extension ID
  // e.g., https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm
  let extensionId = trimmed;
  const match = trimmed.match(/([a-p]{32})/i);
  if (match) {
    extensionId = match[1].toLowerCase();
  }

  if (extensionId.length !== 32) {
    return {
      id: extensionId,
      status: 'unknown',
      reasons: [],
      explanationEn: `Invalid Chrome Web Store identifier: '${storeUrlOrId}'. Extension IDs must be exactly 32 alpha characters.`,
      explanationBn: `অকার্যকর ক্রোম এক্সটেনশন আইডি: '${storeUrlOrId}'। আইডিটি ৩২ অক্ষরের হওয়া প্রয়োজন।`
    };
  }

  // If running inside extension environment, query chrome.management directly
  if (typeof chrome !== 'undefined' && chrome.management?.get) {
    return new Promise((resolve) => {
      chrome.management.get(extensionId, (ext) => {
        if (chrome.runtime.lastError || !ext) {
          resolve({
            id: extensionId,
            status: 'unknown',
            reasons: [],
            explanationEn: `Extension '${extensionId}' is not installed locally on this browser. Chrome Web Store private store scraping is restricted.`,
            explanationBn: `এক্সটেনশনটি এই ব্রাউজারে ইনস্টল করা নেই। সরাসরি ওয়েব স্টোর স্ক্র্যাপিং গুগল কর্তৃক নিয়ন্ত্রিত।`
          });
          return;
        }

        const perms = ext.permissions || [];
        const hasAllUrls = ext.hostPermissions?.some((h) => h.includes('<all_urls>'));
        const reasons: ScanReason[] = [];

        if (hasAllUrls) {
          reasons.push({
            code: 'ALL_URLS_ACCESS',
            severity: 'high',
            explanationEn: 'Extension has full access to read and modify all web traffic (<all_urls>).',
            explanationBn: 'এক্সটেনশনটি সব ওয়েবসাইটের ডেটা পড়ার অনুমতি পেয়েছে।',
            potentialHarmEn: 'Session hijacking, password interception, and unauthorized ad injection.',
            potentialHarmBn: 'পাসওয়ার্ড চুরি এবং ক্ষতিকর বিজ্ঞাপন প্রদর্শনের ঝুঁকি।'
          });
        }

        resolve({
          id: extensionId,
          status: reasons.length > 0 ? 'threat_found' : 'clean',
          reasons,
          explanationEn: reasons[0]?.explanationEn || 'Standard permissions with no critical risks.',
          explanationBn: reasons[0]?.explanationBn || 'স্বাভাবিক অনুমতিযুক্ত এক্সটেনশন।'
        });
      });
    });
  }

  return {
    id: extensionId,
    status: 'unknown',
    reasons: [],
    explanationEn: `Extension ID parsed: '${extensionId}'. On-device management API is available only inside the Chrome extension context.`,
    explanationBn: `এক্সটেনশন আইডি '${extensionId}' শনাক্ত হয়েছে। লোকাল অডিট শুধুমাত্র ক্রোম এক্সটেনশন মোডে উপলব্ধ।`
  };
}
