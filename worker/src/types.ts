export interface Env {
  SAFE_BROWSING_KEY?: string;
  VT_API_KEY?: string;
  ABUSECH_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ALLOWED_EXTENSION_ID?: string;
  CACHE_TTL?: string;
}

export type SourceStatus = 'clean' | 'threat_found' | 'error' | 'rate_limited' | 'unavailable' | 'unsupported';

export interface ScanReason {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  explanationEn: string;
  explanationBn: string;
  potentialHarmEn: string;
  potentialHarmBn: string;
}

export interface UrlCheckRequest {
  url: string;
}

export interface UrlCheckResponse {
  targetUrl: string;
  normalizedUrl: string;
  domain: string;
  verdict: 'safe' | 'suspicious' | 'phishing' | 'malware' | 'unknown';
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low' | 'safe' | 'unknown';
  reasons: ScanReason[];
  sources: {
    safeBrowsing: SourceStatus;
    virusTotal: SourceStatus;
    urlHaus: SourceStatus;
    rdapAge: SourceStatus;
  };
  redirectChain: string[];
  domainAgeDays: number | null;
  checkedAt: string;
}

export interface HashCheckRequest {
  sha256: string;
  fileName?: string;
}

export interface HashCheckResponse {
  sha256: string;
  fileName?: string;
  verdict: 'safe' | 'suspicious' | 'malware' | 'unknown';
  riskLevel: 'high' | 'medium' | 'safe' | 'unknown';
  sources: {
    virusTotal: SourceStatus;
    malwareBazaar: SourceStatus;
  };
  detections: {
    virusTotalCount?: number;
    malwareBazaarFamily?: string | null;
  };
  reasons: ScanReason[];
  checkedAt: string;
}
