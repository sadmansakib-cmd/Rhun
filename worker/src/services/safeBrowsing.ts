import { SourceStatus, ScanReason } from '../types';

export interface SafeBrowsingResult {
  status: SourceStatus;
  threats: string[];
  reasons: ScanReason[];
}

/**
 * Checks URL using Google Safe Browsing API v4.
 * Gracefully degrades to 'unavailable' if key is unset or API limits are reached.
 */
export async function checkSafeBrowsing(url: string, apiKey?: string): Promise<SafeBrowsingResult> {
  if (!apiKey) {
    return { status: 'unavailable', threats: [], reasons: [] };
  }

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`;

  const body = {
    client: {
      clientId: 'shield-security',
      clientVersion: '1.0.0'
    },
    threatInfo: {
      threatTypes: [
        'MALWARE',
        'SOCIAL_ENGINEERING',
        'UNWANTED_SOFTWARE',
        'POTENTIALLY_HARMFUL_APPLICATION'
      ],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { status: 'rate_limited', threats: [], reasons: [] };
    }

    if (!res.ok) {
      return { status: 'unavailable', threats: [], reasons: [] };
    }

    const data: any = await res.json();
    const matches = data.matches || [];

    if (matches.length > 0) {
      const threatTypes: string[] = matches.map((m: any) => m.threatType);
      return {
        status: 'threat_found',
        threats: threatTypes,
        reasons: [
          {
            code: 'GOOGLE_SAFE_BROWSING_MATCH',
            severity: 'critical',
            explanationEn: `Flagged on Google Safe Browsing: [${threatTypes.join(', ')}].`,
            explanationBn: `গুগল সেফ ব্রাউজিং ডাটাবেজে ক্ষতিকর হিসেবে তালিকাভুক্ত: [${threatTypes.join(', ')}]।`,
            potentialHarmEn: 'Active phishing, financial deception, or malware distribution flagged by global threat telemetry.',
            potentialHarmBn: 'সরাসরি ফিশিং বা ম্যালওয়্যার ছড়ানোর প্রমাণ গুগল সিকিউরিটি দ্বারা নিশ্চিত।'
          }
        ]
      };
    }

    return { status: 'clean', threats: [], reasons: [] };
  } catch (_e) {
    return { status: 'unavailable', threats: [], reasons: [] };
  }
}
