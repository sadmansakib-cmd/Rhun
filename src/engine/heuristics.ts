import { ParsedUrl } from './url';
import { ScanReason } from '../types';
import { PROTECTED_BRANDS } from './brands';

// Known high-risk and disposable TLDs frequently utilized by phishing and malware droppers
const RISKY_TLDS = new Set([
  'top',
  'xyz',
  'work',
  'click',
  'loan',
  'buzz',
  'country',
  'fit',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'rest',
  'monster',
  'surf',
  'icu',
  'cam',
  'bid',
  'win',
  'stream'
]);

// Known URL shortener services commonly used to obscure destinations in SMS/phishing
const URL_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
  'rb.gy',
  'tiny.cc',
  'bc.vc',
  'v.gd'
]);

// Suspicious trigger keywords associated with urgency, financial scams, and credential theft
const SUSPICIOUS_KEYWORDS = [
  'login',
  'signin',
  'verify',
  'verification',
  'bonus',
  'cashback',
  'reward',
  'claim',
  'free-gift',
  'account-lock',
  'security-alert',
  'update-kyc',
  'pin-reset',
  'otp',
  'wallet-unlock',
  'prize',
  'airdrop',
  'recover-account',
  'banking-secure'
];

// Legitimate application store hosts where .apk downloads are verified
const VERIFIED_APP_STORES = new Set([
  'play.google.com',
  'apkpure.com',
  'apkmirror.com',
  'f-droid.org',
  'github.com',
  'gitlab.com',
  'amazon.com'
]);

/**
 * Calculates Damerau-Levenshtein distance between two strings
 * Handles insertions, deletions, substitutions, and transpositions.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        min = Math.min(min, matrix[i - 2][j - 2] + cost);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

/**
 * Evaluates all local heuristics for a given parsed URL.
 * Returns an array of detected ScanReason items.
 */
export function evaluateUrlHeuristics(parsed: ParsedUrl): ScanReason[] {
  const reasons: ScanReason[] = [];

  // 1. IP-as-host
  if (parsed.isIpv4 || parsed.isIpv6) {
    reasons.push({
      code: 'IP_AS_HOST',
      severity: 'high',
      explanationEn: `Host '${parsed.hostname}' is a raw IP address instead of a domain name.`,
      explanationBn: `হোস্ট '${parsed.hostname}' কোনো ডোমেন নেম নয়, সরাসরি আইপি অ্যাড্রেস ব্যবহার করছে।`,
      potentialHarmEn: 'Legitimate services use registered domain names. Raw IPs bypass domain reputation and are typical of botnet command & control servers.',
      potentialHarmBn: 'বৈধ প্রতিষ্ঠানগুলো ডোমেন নেম ব্যবহার করে। সরাসরি আইপি ব্যবহার করে ডোমেন ব্লকলিস্ট বাইপাস এবং ফিশিং সাইট চালানো হয়।'
    });
  }

  // 2. '@' in URL (UserInfo credential masking)
  if (parsed.hasUserInfo || parsed.raw.includes('@')) {
    reasons.push({
      code: 'USERINFO_IN_URL',
      severity: 'critical',
      explanationEn: "URL contains '@' character in the authority section used to obscure the real destination.",
      explanationBn: "ইউআরএলে '@' চিহ্ন ব্যবহার করে আসল গন্তব্য আড়াল করার চেষ্টা করা হয়েছে।",
      potentialHarmEn: "Browsers treat text before '@' as username credentials and connect only to the host after '@', deceiving victims into thinking they visit a legitimate brand.",
      potentialHarmBn: "'@' এর আগের অংশ ব্রাউজার ব্যবহারকারী নাম হিসেবে গ্রহণ করে এবং '@' এর পরের সাইটে কানেক্ট করে প্রতারণা করা হয়।"
    });
  }

  // 3. Punycode / Homoglyph domains
  if (parsed.isPunycode || /[^\u0000-\u007F]/.test(parsed.hostname)) {
    reasons.push({
      code: 'PUNYCODE_HOMOGLYPH',
      severity: 'critical',
      explanationEn: `Domain '${parsed.hostname}' contains punycode or international characters that visually spoof Latin letters.`,
      explanationBn: `ডোমেন '${parsed.hostname}'-এ ইউনিকোড বা পিউনিকোড চিহ্ন রয়েছে যা আসল ইংরেজি অক্ষরের নকল (হোমোগ্লিফ)।`,
      potentialHarmEn: 'Internationalized Domain Name (IDN) homograph attacks trick users into visiting fake portals identical to authentic banking sites.',
      potentialHarmBn: 'অক্ষরের দৃশ্যমান সাদৃশ্য ব্যবহার করে ব্যাংক বা সোশ্যাল মিডিয়ার হুবহু নকল পেজ তৈরি করে পাসওয়ার্ড চুরি করা হয়।'
    });
  }

  // 4. Excessive subdomains or URL length
  const isExcessiveSubdomains = parsed.subdomains.length >= 3;
  const isExcessiveLength = parsed.normalized.length > 120;
  if (isExcessiveSubdomains || isExcessiveLength) {
    reasons.push({
      code: 'EXCESSIVE_SUBDOMAINS_OR_LENGTH',
      severity: 'medium',
      explanationEn: `Unusually long URL (${parsed.normalized.length} chars) or deep subdomain structure (${parsed.subdomains.length} subdomains).`,
      explanationBn: `অস্বাভাবিক লম্বা ইউআরএল (${parsed.normalized.length} অক্ষর) অথবা অত্যধিক সাবডোমেন লেভেল (${parsed.subdomains.length} টি)।`,
      potentialHarmEn: 'Attackers create deeply nested subdomains to make URLs difficult to review on mobile screens and bypass basic filters.',
      potentialHarmBn: 'মোবাইল স্ক্রিনে আসল ডোমেন আড়াল করতে এবং ফিল্টার এড়াতে লম্বা সাবডোমেন ব্যবহার করা হয়।'
    });
  }

  // 5. HTTP without TLS
  if (parsed.protocol === 'http:') {
    reasons.push({
      code: 'HTTP_NO_TLS',
      severity: 'medium',
      explanationEn: 'Unencrypted HTTP connection without Transport Layer Security (TLS/HTTPS).',
      explanationBn: 'সংযোগটি এনক্রিপ্টবিহীন সাধারণ HTTP, কোনো এসএসএল/টিএলএস (HTTPS) নিরাপত্তা নেই।',
      potentialHarmEn: 'Data transmitted over unencrypted HTTP (including passwords and personal details) can be intercepted or manipulated by anyone on your network.',
      potentialHarmBn: 'পাবলিক বা ওয়াই-ফাই নেটওয়ার্কে থাকা যে কেউ আপনার টাইপ করা তথ্য বা পাসওয়ার্ড চুরি করতে পারে।'
    });
  }

  // 6. Risky TLDs
  if (RISKY_TLDS.has(parsed.tld.toLowerCase())) {
    reasons.push({
      code: 'RISKY_TLD',
      severity: 'high',
      explanationEn: `Domain uses top-level domain '.${parsed.tld}', a registry with high rates of malicious spam and phishing abuse.`,
      explanationBn: `ডোমেনটিতে '.${parsed.tld}' ব্যবহার করা হয়েছে, যা সাধারণত স্প্যাম ও ফিশিং সাইটে ব্যাপকভাবে ব্যবহৃত হয়।`,
      potentialHarmEn: 'Cheap or loosely regulated TLDs are predominantly registered for short-lived phishing campaigns targeting banking and mobile wallet users.',
      potentialHarmBn: 'সহজলভ্য বা অনিয়ন্ত্রিত ডোমেন এক্সটেনশন দিয়ে ক্ষণস্থায়ী জাল ওয়েবসাইট তৈরি করে টাকা চুরি করা হয়।'
    });
  }

  // 7. Suspicious Keywords (urgency, bonus, claims, login)
  const fullSearchTarget = `${parsed.hostname}${parsed.pathname}${parsed.search}`.toLowerCase();
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => fullSearchTarget.includes(kw));
  if (matchedKeywords.length > 0) {
    reasons.push({
      code: 'SUSPICIOUS_KEYWORDS',
      severity: matchedKeywords.length >= 2 ? 'high' : 'medium',
      explanationEn: `Contains social-engineering keywords: [${matchedKeywords.join(', ')}].`,
      explanationBn: `প্রতারণামূলক বা প্রলুব্ধকারী শব্দ পাওয়া গেছে: [${matchedKeywords.join(', ')}]।`,
      potentialHarmEn: 'Urgent calls-to-action regarding bonuses, prizes, or account locks trick victims into hasty credential disclosure.',
      potentialHarmBn: 'বোনাস, পুরস্কার বা একাউন্ট বন্ধের ভয় দেখিয়ে তাড়াহুড়ো করে পাসওয়ার্ড ও পিন হাতিয়ে নেওয়া হয়।'
    });
  }

  // 8. URL Shortener
  if (URL_SHORTENERS.has(parsed.hostname.toLowerCase())) {
    reasons.push({
      code: 'URL_SHORTENER',
      severity: 'medium',
      explanationEn: `Host '${parsed.hostname}' is a URL shortening service that conceals the true landing page.`,
      explanationBn: `হোস্ট '${parsed.hostname}' একটি লিংক শর্টনার সেবা যা আসল ওয়েবসাইটের ঠিকানা লুকিয়ে রাখে।`,
      potentialHarmEn: 'Shortened links hide malicious domains inside SMS messages and chat apps, bypassing link preview safety checks.',
      potentialHarmBn: 'এসএমএস বা মেসেঞ্জারে ক্ষতিকর লিংক পাঠানোর সময় আসল ঠিকানা লুকাতে শর্টনার ব্যবহৃত হয়।'
    });
  }

  // 9. Typosquatting (Edit distance check against brand names)
  const typosquatReason = checkTyposquatting(parsed);
  if (typosquatReason) {
    reasons.push(typosquatReason);
  }

  // 10. Fake-APK download patterns
  const isApkFile = parsed.pathname.toLowerCase().endsWith('.apk') || parsed.search.toLowerCase().includes('.apk');
  const isVerifiedStore = VERIFIED_APP_STORES.has(parsed.hostname.toLowerCase()) || Array.from(VERIFIED_APP_STORES).some(store => parsed.hostname.endsWith(`.${store}`));
  if (isApkFile && !isVerifiedStore) {
    reasons.push({
      code: 'FAKE_APK_DOWNLOAD',
      severity: 'critical',
      explanationEn: `Direct Android package (.apk) download detected outside verified app stores on host '${parsed.hostname}'.`,
      explanationBn: `অফিসিয়াল স্টোর ছাড়া অপরিচিত হোস্ট '${parsed.hostname}' থেকে সরাসরি .apk ফাইল ডাউনলোড লিংক পাওয়া গেছে।`,
      potentialHarmEn: 'Sideloaded APKs from unknown websites are the primary delivery vector for SMS stealers, overlay banking trojans, and surveillance spyware.',
      potentialHarmBn: 'অচেনা সাইট থেকে .apk ফাইল ফোনে ইনস্টল করলে ব্যাংক ওটিপি (OTP) চুরি এবং ডিভাইস হ্যাক হতে পারে।'
    });
  }

  return reasons;
}

/**
 * Compares parsed domain components against protected brands using Damerau-Levenshtein distance.
 */
function checkTyposquatting(parsed: ParsedUrl): ScanReason | null {
  const host = parsed.hostname.toLowerCase();
  const domainParts = host.split('.');
  const candidateParts = [parsed.mainDomain.split('.')[0], ...parsed.subdomains];

  for (const brand of PROTECTED_BRANDS) {
    // Check if domain is genuinely an official domain for this brand
    const isOfficial = brand.officialDomains.some(
      (official) => host === official || host.endsWith(`.${official}`)
    );
    if (isOfficial) {
      continue;
    }

    for (const keyword of brand.keywords) {
      // 1. Direct substring match inside an unofficial domain (e.g. "bkash-reward-claim.top" or "login-facebook-secure.com")
      if (host.includes(keyword) && !isOfficial) {
        return {
          code: 'BRAND_IMPERSONATION',
          severity: 'critical',
          explanationEn: `Domain contains protected brand keyword '${keyword}' (${brand.name}) but is NOT an official domain.`,
          explanationBn: `ডোমেনটিতে সংরক্ষিত ব্র্যান্ড নাম '${keyword}' (${brand.name}) রয়েছে, কিন্তু এটি কোনো অফিসিয়াল সাইট নয়।`,
          potentialHarmEn: `Impersonates ${brand.name} to steal customer credentials, PINs, or financial balances.`,
          potentialHarmBn: `${brand.name}-এর পরিচয় নকল করে গ্রাহকের পিন, পাসওয়ার্ড বা টাকা চুরির অপচেষ্টা।`
        };
      }

      // 2. Fuzzy edit-distance typosquat (e.g. "faceb00k", "bkaash", "gogle")
      for (const part of candidateParts) {
        if (!part || part.length < 3) continue;
        const dist = damerauLevenshteinDistance(part, keyword);
        // Distance 1 for words >= 4 chars, Distance 1-2 for words >= 6 chars
        const isFuzzyMatch = (keyword.length >= 4 && dist === 1) || (keyword.length >= 6 && dist === 2);
        if (isFuzzyMatch && part !== keyword) {
          return {
            code: 'TYPOSQUATTING',
            severity: 'critical',
            explanationEn: `Domain segment '${part}' is a deceptive typosquat of '${keyword}' (${brand.name}, edit distance ${dist}).`,
            explanationBn: `ডোমেনের অংশ '${part}' ব্র্যান্ড '${keyword}' (${brand.name})-এর নকল বানানে তৈরি (দূরত্ব ${dist})।`,
            potentialHarmEn: `Exploits common typos and look-alike characters to trick users into believing they are accessing ${brand.name}.`,
            potentialHarmBn: `বানান ভুলের সুযোগ নিয়ে ব্যবহারকারীকে বিভ্রান্ত করে ${brand.name}-এর নকল পেজে নিয়ে যাওয়া হয়।`
          };
        }
      }
    }
  }

  return null;
}
