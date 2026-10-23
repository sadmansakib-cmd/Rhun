import {
  PlatformId,
  PlatformCapabilities,
  AuditedApp,
  MonitoredNotification,
  AuditedExtension,
  ScheduledScanConfig,
  ScanResult
} from '../types';

export interface PlatformAdapter {
  id: PlatformId;
  capabilities: PlatformCapabilities;

  // Optional methods mapped to capabilities
  auditInstalledApps?: () => Promise<AuditedApp[]>;
  getMonitoredNotifications?: () => Promise<MonitoredNotification[]>;
  getCurrentTabUrl?: () => Promise<string | null>;
  auditInstalledExtensions?: () => Promise<AuditedExtension[]>;
  inspectDownload?: (fileName: string, url: string) => Promise<{ riskLevel: string; warningEn: string; warningBn: string }>;
  getScheduledScanConfig?: () => Promise<ScheduledScanConfig>;
  triggerBackgroundScan?: () => Promise<{ threatsFound: number; itemsScanned: number }>;
  requestOptionalAllUrls?: () => Promise<boolean>;
}

export { webAdapter } from './webAdapter';
export { androidAdapter } from './androidAdapter';
export { chromeAdapter } from './chromeAdapter';
