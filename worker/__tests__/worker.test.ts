import { describe, it, expect, vi } from 'vitest';
import { isSsrfBlockedHost } from '../src/ssrf';
import { checkIpRateLimit } from '../src/cors';
import { checkSafeBrowsing } from '../src/services/safeBrowsing';
import { checkVirusTotalUrl, checkVirusTotalHash } from '../src/services/virusTotal';
import { checkAbuseChUrl, checkMalwareBazaarHash } from '../src/services/abuseCh';
import worker from '../src/index';

describe('Worker SSRF Protection', () => {
  it('blocks localhost, loopback, and private IPv4 ranges', () => {
    expect(isSsrfBlockedHost('localhost')).toBe(true);
    expect(isSsrfBlockedHost('127.0.0.1')).toBe(true);
    expect(isSsrfBlockedHost('10.0.0.5')).toBe(true);
    expect(isSsrfBlockedHost('172.20.0.1')).toBe(true);
    expect(isSsrfBlockedHost('192.168.1.1')).toBe(true);
    expect(isSsrfBlockedHost('169.254.169.254')).toBe(true); // AWS/cloud metadata IP
  });

  it('blocks IPv6 loopback, link-local and unique local', () => {
    expect(isSsrfBlockedHost('::1')).toBe(true);
    expect(isSsrfBlockedHost('[::1]')).toBe(true);
    expect(isSsrfBlockedHost('fe80::1')).toBe(true);
    expect(isSsrfBlockedHost('fc00::1')).toBe(true);
  });

  it('permits public valid hostnames and public IPs', () => {
    expect(isSsrfBlockedHost('example.com')).toBe(false);
    expect(isSsrfBlockedHost('sub.domain.org')).toBe(false);
    expect(isSsrfBlockedHost('93.184.216.34')).toBe(false);
  });
});

describe('Worker Rate Limiting', () => {
  it('allows requests within limit and blocks when exceeded', () => {
    const testIp = '203.0.113.199';
    let limited = false;
    for (let i = 0; i < 35; i++) {
      const res = checkIpRateLimit(testIp);
      if (res.isLimited) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});

describe('Worker Threat Source Graceful Degradation', () => {
  it('returns unavailable when API keys are omitted', async () => {
    const sb = await checkSafeBrowsing('https://example.com', undefined);
    expect(sb.status).toBe('unavailable');

    const vtUrl = await checkVirusTotalUrl('https://example.com', undefined);
    expect(vtUrl.status).toBe('unavailable');

    const vtHash = await checkVirusTotalHash('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', undefined);
    expect(vtHash.status).toBe('unavailable');
  });

  it('handles network fetch errors without throwing', async () => {
    // Mock global fetch to simulate network error
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const sb = await checkSafeBrowsing('https://example.com', 'dummy_key');
    expect(sb.status).toBe('unavailable');

    const vt = await checkVirusTotalUrl('https://example.com', 'dummy_key');
    expect(vt.status).toBe('unavailable');

    const urlhaus = await checkAbuseChUrl('https://example.com');
    expect(urlhaus.status).toBe('unavailable');

    const mb = await checkMalwareBazaarHash('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    expect(mb.status).toBe('unavailable');

    globalThis.fetch = originalFetch;
  });
});

describe('Worker API Endpoints Validation', () => {
  it('rejects invalid hash format with 400', async () => {
    const req = new Request('http://localhost/api/hash-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'invalid_short_hash' })
    });
    const res = await worker.fetch(req, {}, {} as any);
    expect(res.status).toBe(400);
    const data: any = await res.json();
    expect(data.error).toContain('Invalid SHA-256');
  });

  it('blocks SSRF destination via URL check', async () => {
    const req = new Request('http://localhost/api/url-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' })
    });
    const res = await worker.fetch(req, {}, {} as any);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.reasons.some((r: any) => r.code === 'SSRF_BLOCKED_DESTINATION')).toBe(true);
    expect(data.verdict).toBe('malware');
  });
});
