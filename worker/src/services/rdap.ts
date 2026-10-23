import { SourceStatus, ScanReason } from '../types';

export interface RdapResult {
  status: SourceStatus;
  domainAgeDays: number | null;
  registrationDate?: string;
  reasons: ScanReason[];
}

/**
 * Queries RDAP for domain registration date and calculates domain age in days.
 * Gracefully degrades to 'unavailable' / unknown on error or timeout.
 */
export async function checkDomainAgeRdap(domain: string): Promise<RdapResult> {
  // Ignore raw IPs
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain.includes(':') || domain === 'localhost') {
    return { status: 'unsupported', domainAgeDays: null, reasons: [] };
  }

  const endpoint = `https://rdap.org/domain/${encodeURIComponent(domain)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/rdap+json, application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { status: 'unavailable', domainAgeDays: null, reasons: [] };
    }

    const data: any = await res.json();
    const events: Array<{ eventAction: string; eventDate: string }> = data.events || [];
    
    // Find registration event
    const regEvent = events.find(
      (e) => e.eventAction === 'registration' || e.eventAction === 'created'
    );

    if (!regEvent || !regEvent.eventDate) {
      return { status: 'clean', domainAgeDays: null, reasons: [] };
    }

    const regTime = new Date(regEvent.eventDate).getTime();
    const now = Date.now();
    const ageDays = Math.max(0, Math.floor((now - regTime) / (1000 * 60 * 60 * 24)));

    const reasons: ScanReason[] = [];

    // Flag young domains (< 30 days old)
    if (ageDays < 30) {
      reasons.push({
        code: 'NEWLY_REGISTERED_DOMAIN',
        severity: ageDays < 7 ? 'critical' : 'high',
        explanationEn: `Domain was registered only ${ageDays} day(s) ago (${regEvent.eventDate.split('T')[0]}).`,
        explanationBn: `ডোমেনটি মাত্র ${ageDays} দিন আগে নিবন্ধিত হয়েছে (${regEvent.eventDate.split('T')[0]})।`,
        potentialHarmEn: 'Newly registered domains account for the vast majority of ephemeral phishing kits and disposable scam infrastructure.',
        potentialHarmBn: 'সদ্য নিবন্ধিত নতুন ডোমেনগুলো বেশিরভাগ ক্ষেত্রেই প্রতারণা ও ক্ষণস্থায়ী ফিশিং ক্যাম্পেইনে ব্যবহৃত হয়।'
      });
    }

    return {
      status: reasons.length > 0 ? 'threat_found' : 'clean',
      domainAgeDays: ageDays,
      registrationDate: regEvent.eventDate,
      reasons
    };
  } catch (_e) {
    return { status: 'unavailable', domainAgeDays: null, reasons: [] };
  }
}
