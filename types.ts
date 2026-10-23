export type PlatformId = 'web' | 'android' | 'chrome-ext';

export interface PlatformCapabilities {
  installedAppsAudit: boolean;
  notificationMonitor: boolean;
  currentTabCheck: boolean;
  installedExtensionsAudit: boolean;
  downloadGuard: boolean;
  backgroundScan: boolean;
}

export type ScanVerdict = 'safe' | 'suspicious' | 'phishing' | 'malware' | 'unknown';
export type RiskLevel = 'high' | 'medium' | 'low' | 'safe' | 'unknown';
export type ReasonSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ScanReason {
  code: string;
  severity: ReasonSeverity;
  explanationEn: string;
  explanationBn: string;
  potentialHarmEn: string;
  potentialHarmBn: string;
}

export type SourceStatus = 'clean' | 'threat_found' | 'error' | 'rate_limited' | 'unavailable' | 'unsupported';

export interface ScanSourcesStatus {
  localEngine: SourceStatus;
  safeBrowsing: SourceStatus;
  virusTotal: SourceStatus;
  urlHaus: SourceStatus;
  rdapAge?: SourceStatus;
  malwareBazaar?: SourceStatus;
}

export interface ScanResult {
  targetUrl: string;
  normalizedUrl: string;
  domain: string;
  verdict: ScanVerdict;
  riskScore: number; // 0 to 100, never 100% safe
  riskLevel: RiskLevel;
  reasons: ScanReason[];
  sources: ScanSourcesStatus;
  redirectChain?: string[];
  domainAgeDays?: number | null;
  checkedAt: string;
  triggersShadowBanner: boolean;
  triggersFullInterstitial: boolean;
  isDemo?: boolean;
}

export interface DangerousPermissionInfo {
  name: string;
  severity: RiskLevel;
  descEn: string;
  descBn: string;
}

export interface AuditedApp {
  packageName: string;
  appName: string;
  versionName: string;
  installerSource: string;
  isUnknownSource: boolean;
  riskLevel: RiskLevel;
  permissions: DangerousPermissionInfo[];
  lastUpdated: string;
  explanationEn: string;
  explanationBn: string;
  actionAdviceEn: string;
  actionAdviceBn: string;
}

export interface AuditedExtension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  installType: string;
  hostAccessBreadth: string;
  hostAccessRisk: RiskLevel;
  permissions: DangerousPermissionInfo[];
  optionalPermissions: string[];
  lastUpdated: string;
  riskLevel: RiskLevel;
  explanationEn: string;
  explanationBn: string;
}

export interface MonitoredNotification {
  id: string;
  appName: string;
  packageName: string;
  title: string;
  messageBody: string;
  extractedUrl: string | null;
  timestamp: string;
  riskLevel: RiskLevel;
  explanationEn: string;
  explanationBn: string;
  isDismissed?: boolean;
}

export interface ApkAnalysisResult {
  fileName: string;
  sha256?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  verdict: ScanVerdict;
  reasons: ScanReason[];
  identifiedPermCombos: string[];
  explanationEn: string;
  explanationBn: string;
  sources: {
    hashCheck: SourceStatus;
    permissionAudit: SourceStatus;
  };
}

export interface ScheduledScanConfig {
  enabled: boolean;
  intervalHours: number;
  wifiOnly: boolean;
  deepPermissionAudit: boolean;
  notificationUrlGuard: boolean;
  lastScanTime: string;
  nextScanTime: string;
  history: Array<{
    id: string;
    timestamp: string;
    targetPlatform: string;
    itemsScanned: number;
    threatsFound: number;
    summaryEn: string;
    summaryBn: string;
  }>;
}
