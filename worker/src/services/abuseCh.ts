import { SourceStatus, ScanReason } from '../types';

export interface AbuseChUrlResult {
  status: SourceStatus;
  queryStatus?: string;
  threat?: string;
  tags?: string[];
  reasons: ScanReason[];
}

export interface AbuseChHashResult {
  status: SourceStatus;
  queryStatus?: string;
  signature?: string | null;
  fileType?: string | null;
  reasons: ScanReason[];
}

/**
 * Queries abuse.ch URLhaus for URL reputation.
 */
export async function checkAbuseChUrl(url: string, apiKey?: string): Promise<AbuseChUrlResult> {
  const endpoint = 'https://urlhaus-api.abuse.ch/v1/url/';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const formData = new URLSearchParams();
    formData.append('url', url);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    if (apiKey) {
      headers['Auth-Key'] = apiKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData.toString(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { status: 'rate_limited', reasons: [] };
    }

    if (!res.ok) {
      return { status: 'unavailable', reasons: [] };
    }

    const data: any = await res.json();
    const queryStatus = data.query_status;

    if (queryStatus === 'ok') {
      const threat = data.threat || 'malware_download';
      const tags: string[] = data.tags || [];
      const urlStatus = data.url_status; // online or offline

      return {
        status: 'threat_found',
        queryStatus,
        threat,
        tags,
        reasons: [
          {
            code: 'URLHAUS_ACTIVE_MALWARE_URL',
            severity: 'critical',
            explanationEn: `abuse.ch URLhaus: Active malware URL detected (Threat: ${threat}, Status: ${urlStatus}).`,
            explanationBn: `abuse.ch URLhaus ডাটাবেজে সক্রিয় ক্ষতিকর ম্যালওয়্যার লিংক হিসেবে তালিকাভুক্ত (${threat})।`,
            potentialHarmEn: 'Direct connection to an active botnet payload distributor or payload delivery host.',
            potentialHarmBn: 'সরাসরি ক্ষতিকর ভাইরাস ও বটনেট ছড়ানোর কাজে ব্যবহৃত হচ্ছে।'
          }
        ]
      };
    }

    if (queryStatus === 'no_results') {
      return { status: 'clean', queryStatus, reasons: [] };
    }

    return { status: 'clean', queryStatus, reasons: [] };
  } catch (_e) {
    return { status: 'unavailable', reasons: [] };
  }
}

/**
 * Queries abuse.ch MalwareBazaar for file hash lookup.
 */
export async function checkMalwareBazaarHash(sha256: string, apiKey?: string): Promise<AbuseChHashResult> {
  const endpoint = 'https://mb-api.abuse.ch/api/v1/';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const formData = new URLSearchParams();
    formData.append('query', 'get_info');
    formData.append('hash', sha256.toLowerCase().trim());

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    if (apiKey) {
      headers['Auth-Key'] = apiKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData.toString(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { status: 'rate_limited', reasons: [] };
    }

    if (!res.ok) {
      return { status: 'unavailable', reasons: [] };
    }

    const data: any = await res.json();
    const queryStatus = data.query_status;

    if (queryStatus === 'ok' && data.data && data.data.length > 0) {
      const sample = data.data[0];
      const signature = sample.signature || sample.file_type || 'Trojan';

      return {
        status: 'threat_found',
        queryStatus,
        signature,
        fileType: sample.file_type,
        reasons: [
          {
            code: 'MALWAREBAZAAR_KNOWN_SAMPLE',
            severity: 'critical',
            explanationEn: `abuse.ch MalwareBazaar: Verified malware sample detected (Family: ${signature}).`,
            explanationBn: `abuse.ch MalwareBazaar-এ যাচাইকৃত ক্ষতিকর ভাইরাস নমুনা পাওয়া গেছে (${signature})।`,
            potentialHarmEn: 'Known malicious binary cataloged in international threat intelligence databases.',
            potentialHarmBn: 'আন্তর্জাতিক সিকিউরিটি ডাটাবেজে নথিবদ্ধ ক্ষতিকর ভাইরাস ফাইল।'
          }
        ]
      };
    }

    if (queryStatus === 'hash_not_found') {
      return { status: 'clean', queryStatus, reasons: [] };
    }

    return { status: 'clean', queryStatus, reasons: [] };
  } catch (_e) {
    return { status: 'unavailable', reasons: [] };
  }
}
