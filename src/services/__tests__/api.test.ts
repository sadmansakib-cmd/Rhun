import { describe, it, expect } from 'vitest';
import { scanUrl, scanApk, scanExtension, DEMO_MODE } from '../api';

describe('Service Layer: scanUrl', () => {
  it('identifies phishing URLs via local engine in DEMO_MODE', async () => {
    const result = await scanUrl('https://bkash-reward-claim.top/login');
    expect(result.verdict).toBe('phishing');
    expect(result.riskLevel).toBe('high');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.isDemo).toBe(DEMO_MODE);
  });

  it('identifies safe URLs with clean verdict and non-zero baseline score', async () => {
    const result = await scanUrl('https://example.com');
    expect(result.verdict).toBe('safe');
    expect(result.riskScore).toBeGreaterThanOrEqual(5);
    expect(result.riskScore).toBeLessThan(20);
  });
});

describe('Service Layer: scanApk', () => {
  it('flags dangerous permission combination: READ_SMS + SYSTEM_ALERT_WINDOW', async () => {
    const res = await scanApk({
      fileName: 'test-banking.apk',
      permissions: ['android.permission.READ_SMS', 'android.permission.SYSTEM_ALERT_WINDOW']
    });
    expect(res.riskLevel).toBe('high');
    expect(res.verdict).toBe('malware');
    expect(res.identifiedPermCombos).toContain('SMS Interception + Screen Overlay Attack');
  });

  it('flags BIND_ACCESSIBILITY_SERVICE as critical', async () => {
    const res = await scanApk({
      fileName: 'stealer.apk',
      permissions: ['android.permission.BIND_ACCESSIBILITY_SERVICE']
    });
    expect(res.riskLevel).toBe('high');
    expect(res.verdict).toBe('malware');
  });

  it('marks safe permissions as safe verdict', async () => {
    const res = await scanApk({
      fileName: 'clean.apk',
      permissions: ['android.permission.INTERNET', 'android.permission.VIBRATE']
    });
    expect(res.riskLevel).toBe('safe');
    expect(res.verdict).toBe('safe');
  });
});

describe('Service Layer: scanExtension', () => {
  it('extracts 32-character extension ID from Chrome Web Store URL', async () => {
    const res = await scanExtension('https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm');
    expect(res.id).toBe('cjpalhdlnbpafiamejdnhcphjbkeiagm');
  });

  it('returns unknown honestly when queried outside Chrome extension environment', async () => {
    const res = await scanExtension('cjpalhdlnbpafiamejdnhcphjbkeiagm');
    expect(res.status).toBe('unknown');
    expect(res.explanationEn).toContain('Extension ID parsed');
  });
});
