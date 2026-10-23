import { describe, it, expect } from 'vitest';
import { parseAndNormalizeUrl } from '../url';
import { evaluateUrlHeuristics, damerauLevenshteinDistance } from '../heuristics';
import { calculateRiskScore } from '../scoring';
import { evaluateLocalUrl } from '../index';

describe('Local Engine: URL Parsing and Normalization', () => {
  it('rejects non-http(s) schemes like javascript:, data:, file:', () => {
    expect(() => parseAndNormalizeUrl('javascript:alert(1)')).toThrow(/Rejected non-http\(s\) scheme/);
    expect(() => parseAndNormalizeUrl('data:text/html,<h1>XSS</h1>')).toThrow(/Rejected non-http\(s\) scheme/);
    expect(() => parseAndNormalizeUrl('file:///etc/passwd')).toThrow(/Rejected non-http\(s\) scheme/);
    expect(() => parseAndNormalizeUrl('blob:http://example.com/123')).toThrow(/Rejected non-http\(s\) scheme/);
  });

  it('correctly normalizes valid HTTP and HTTPS URLs', () => {
    const res = parseAndNormalizeUrl('HTTP://EXAMPLE.COM:80/path/to/page?q=1');
    expect(res.protocol).toBe('http:');
    expect(res.hostname).toBe('example.com');
    expect(res.port).toBe('');
    expect(res.pathname).toBe('/path/to/page');
    expect(res.normalized).toBe('http://example.com/path/to/page?q=1');
  });

  it('prepends https:// when protocol is missing', () => {
    const res = parseAndNormalizeUrl('example.com/test');
    expect(res.protocol).toBe('https:');
    expect(res.hostname).toBe('example.com');
  });

  it('parses two-part TLDs correctly (e.g. .com.bd)', () => {
    const res = parseAndNormalizeUrl('https://sub.portal.example.com.bd/login');
    expect(res.tld).toBe('com.bd');
    expect(res.mainDomain).toBe('example.com.bd');
    expect(res.subdomains).toEqual(['sub', 'portal']);
  });
});

describe('Local Engine: Damerau-Levenshtein Typosquatting Algorithm', () => {
  it('accurately computes distance for transpositions, insertions, and substitutions', () => {
    expect(damerauLevenshteinDistance('bkash', 'bkaash')).toBe(1);
    expect(damerauLevenshteinDistance('facebook', 'facebok')).toBe(1);
    expect(damerauLevenshteinDistance('facebook', 'faceb00k')).toBe(2);
    expect(damerauLevenshteinDistance('google', 'gogle')).toBe(1);
    expect(damerauLevenshteinDistance('daraz', 'daraaz')).toBe(1);
    expect(damerauLevenshteinDistance('nagad', 'naagd')).toBe(1); // transposition
  });
});

describe('Local Engine: Heuristics Evaluation', () => {
  it('detects IP-as-host', () => {
    const parsed = parseAndNormalizeUrl('http://192.0.2.1/login');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'IP_AS_HOST')).toBe(true);
  });

  it('detects @ in URL (UserInfo credential masking)', () => {
    const parsed = parseAndNormalizeUrl('https://google.com@attacker-site.example/login');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'USERINFO_IN_URL')).toBe(true);
  });

  it('detects punycode homoglyphs', () => {
    const parsed = parseAndNormalizeUrl('https://xn--gogle-pra.example');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'PUNYCODE_HOMOGLYPH')).toBe(true);
  });

  it('detects risky TLDs like .top and .xyz', () => {
    const parsed = parseAndNormalizeUrl('https://free-bonus-claim.top/verify');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'RISKY_TLD')).toBe(true);
    expect(reasons.some((r) => r.code === 'SUSPICIOUS_KEYWORDS')).toBe(true);
  });

  it('detects URL shorteners', () => {
    const parsed = parseAndNormalizeUrl('https://bit.ly/3xSample');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'URL_SHORTENER')).toBe(true);
  });

  it('flags brand impersonation on unofficial domains (e.g. bkash-reward.example)', () => {
    const parsed = parseAndNormalizeUrl('https://bkash-reward.example/claim');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'BRAND_IMPERSONATION')).toBe(true);
  });

  it('flags typosquatted domain segments (e.g. faceb00k-login.example)', () => {
    const parsed = parseAndNormalizeUrl('https://faceb00k.example/verify');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'TYPOSQUATTING')).toBe(true);
  });

  it('does NOT flag legitimate brand domains as typosquats', () => {
    const parsed = parseAndNormalizeUrl('https://www.bkash.com/about');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'BRAND_IMPERSONATION')).toBe(false);
    expect(reasons.some((r) => r.code === 'TYPOSQUATTING')).toBe(false);
  });

  it('flags non-store APK downloads', () => {
    const parsed = parseAndNormalizeUrl('https://suspicious-files.example/bank-app.apk');
    const reasons = evaluateUrlHeuristics(parsed);
    expect(reasons.some((r) => r.code === 'FAKE_APK_DOWNLOAD')).toBe(true);
  });
});

describe('Local Engine: Scoring Function & Verdicts', () => {
  it('combines reasons into riskScore 0-100 without ever producing 100% safe or 0%', () => {
    const clean = evaluateLocalUrl('https://example.com');
    expect(clean.verdict.riskScore).toBeGreaterThanOrEqual(5);
    expect(clean.verdict.riskScore).toBeLessThan(20);
    expect(clean.verdict.verdict).toBe('safe');
    expect(clean.verdict.riskScore).not.toBe(0);
  });

  it('scores high-risk phishing triggers with high severity and triggers interstitial', () => {
    const phish = evaluateLocalUrl('https://bkash-reward-claim.top/login');
    expect(phish.verdict.riskScore).toBeGreaterThanOrEqual(70);
    expect(phish.verdict.verdict).toBe('phishing');
    expect(phish.verdict.triggersFullInterstitial).toBe(true);
    expect(phish.verdict.triggersShadowBanner).toBe(true);
  });

  it('assigns malware verdict when fake APK downloads are detected', () => {
    const malware = evaluateLocalUrl('http://insecure-cdn.example/trojan.apk');
    expect(malware.verdict.verdict).toBe('malware');
    expect(malware.verdict.riskLevel).toBe('high');
  });

  it('handles missing/unavailable checks with unknown verdict rather than safe', () => {
    const score = calculateRiskScore([], { hasIncompleteChecks: true });
    expect(score.verdict).toBe('unknown');
    expect(score.riskLevel).toBe('unknown');
  });
});
