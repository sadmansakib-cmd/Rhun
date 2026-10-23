import { PlatformAdapter } from './index';

export const webAdapter: PlatformAdapter = {
  id: 'web',
  capabilities: {
    installedAppsAudit: false,
    notificationMonitor: false,
    currentTabCheck: true,
    installedExtensionsAudit: false,
    downloadGuard: false,
    backgroundScan: false
  },

  async getCurrentTabUrl(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.href;
    }
    return null;
  },

  async getScheduledScanConfig() {
    return {
      enabled: false,
      intervalHours: 24,
      wifiOnly: true,
      deepPermissionAudit: false,
      notificationUrlGuard: false,
      lastScanTime: 'Not supported in Web tab',
      nextScanTime: 'Requires Android app or Chrome Extension',
      history: []
    };
  }
};
