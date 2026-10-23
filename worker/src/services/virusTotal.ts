import { SourceStatus, ScanReason } from '../types';

export interface VirusTotalUrlResult {
  status: SourceStatus;
  positives: number;
  total: number;
  reasons: ScanReason[];
}

export interface VirusTotalHashResult {
  status: SourceStatus;
  positives: number;
  total: number;
  names: string[];
  reasons: ScanReason[];
}

function base64UrlEncode(str: string): string {
  // Convert string to base64 and make URL-safe without padding
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Queries VirusTotal v3 URL Report.
 */
export async function checkVirusTotalUrl(url: string, apiKey?: string): Promise<VirusTotalUrlResult> {
  if (!apiKey) {
    return { status: 'unavailable', positives: 0, total: 0, reasons: [] };
  }

  const urlId = base64UrlEncode(url);
  const endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { status: 'rate_limited', positives: 0, total: 0, reasons: [] };
    }

    if (res.status === 404) {
      // Not yet indexed on VT, consider clean or unknown
      return { status: 'clean', positives: 0, total: 0, reasons: [] };
    }

    if (!res.ok) {
      return { status: 'unavailable', positives: 0, total: 0, reasons: [] };
    }

    const data: any = await res.json();
    const stats = data?.data?.attributes?.last_analysis_stats || {};
    const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
    const total = (stats.harmless || 0) + (stats.undetected || 0) + malicious;

    if (malicious >= 2) {
      return {
        status: 'threat_found',
        positives: malicious,
        total,
        reasons: [
          {
            code: 'VIRUSTOTAL_MALICIOUS_DETECTIONS',
            severity: 'critical',
            explanationEn: `VirusTotal: Flagged as malicious by ${malicious}/${total} security vendors.`,
            explanationBn: `ভাইরাসটোটাল: ${malicious}টি অ্যান্টিভাইরাস ও সিকিউরিটি ইঞ্জিন একে বিপজ্জনক হিসেবে চিহ্নিত করেছে।`,
            potentialHarmEn: 'Multiple antivirus vendors classified this destination as active phishing or malware.',
            potentialHarmBn: 'একাধিক আন্তর্জাতিক নিরাপত্তা প্রতিষ্ঠান এই সাইটটিকে ক্ষতিকর বলে নিশ্চিত করেছে।'
          }
        ]
      };
    } else if (malicious === 1) {
      return {
        status: 'clean', // 1 low detection often a false positive, report clean/low
        positives: 1,
        total,
        reasons: []
      };
    }

    return { status: 'clean', positives: 0, total, reasons: [] };
  } catch (_e) {
    return { status: 'unavailable', positives: 0, total: 0, reasons: [] };
  }
}

/**
 * Queries VirusTotal v3 File Hash.
 */
export async function checkVirusTotalHash(hash: string, apiKey?: string): Promise<VirusTotalHashResult> {
  if (!apiKey) {
    return { status: 'unavailable', positives: 0, total: 0, names: [], reasons: [] };
  }

  const endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash.toLowerCase().trim())}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { status: 'rate_limited', positives: 0, total: 0, names: [], reasons: [] };
    }

    if (res.status === 404) {
      return { status: 'clean', positives: 0, total: 0, names: [], reasons: [] };
    }

    if (!res.ok) {
      return { status: 'unavailable', positives: 0, total: 0, names: [], reasons: [] };
    }

    const data: any = await res.json();
    const attrs = data?.data?.attributes || {};
    const stats = attrs.last_analysis_stats || {};
    const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
    const total = (stats.harmless || 0) + (stats.undetected || 0) + malicious;
    const names: string[] = attrs.names || [];

    if (malicious >= 2) {
      return {
        status: 'threat_found',
        positives: malicious,
        total,
        names,
        reasons: [
          {
            code: 'VIRUSTOTAL_MALICIOUS_HASH',
            severity: 'critical',
            explanationEn: `File hash flagged as malware by ${malicious}/${total} antivirus engines on VirusTotal.`,
            explanationBn: `ফাইল হ্যাশটি ভাইরাসটোটালে ${malicious}টি অ্যান্টিভাইরাস ইঞ্জিন দ্বারা ম্যালওয়্যার চিহ্নিত।`,
            potentialHarmEn: 'Known trojan or malicious payload identified by file signature.',
            potentialHarmBn: 'পরিচিত ট্রোজান বা ম্যালওয়্যার সিগনেচার শনাক্ত হয়েছে।'
          }
        ]
      };
    }

    return { status: 'clean', positives: malicious, total, names, reasons: [] };
  } catch (_e) {
    return { status: 'unavailable', positives: 0, total: 0, names: [], reasons: [] };
  }
}
