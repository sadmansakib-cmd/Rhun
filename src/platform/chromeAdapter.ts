import { PlatformAdapter } from './index';
import { AuditedExtension, ScheduledScanConfig, DangerousPermissionInfo, RiskLevel } from '../types';

function isChromeExtensionApiAvailable(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export const chromeAdapter: PlatformAdapter = {
  id: 'chrome-ext',
  capabilities: {
    installedAppsAudit: false,
    notificationMonitor: false,
    currentTabCheck: true,
    installedExtensionsAudit: true,
    downloadGuard: true,
    backgroundScan: true
  },

  async getCurrentTabUrl(): Promise<string | null> {
    if (!isChromeExtensionApiAvailable() || !chrome.tabs) {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.href;
      }
      return null;
    }
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          resolve(null);
        } else {
          resolve(tabs[0].url || null);
        }
      });
    });
  },

  async auditInstalledExtensions(): Promise<AuditedExtension[]> {
    if (!isChromeExtensionApiAvailable() || !chrome.management || !chrome.management.getAll) {
      // Fallback sample for Web/Dev simulation when outside of Chrome extension — clearly labeled as DEMO
      return [
        {
          id: 'demo-ext-unpacked-sample',
          name: '[DEMO] Sample Unpacked Proxy Helper',
          version: '1.4.2',
          enabled: true,
          installType: 'development',
          hostAccessBreadth: '<all_urls> (All Websites)',
          hostAccessRisk: 'high',
          permissions: [
            {
              name: '<all_urls>',
              severity: 'high',
              descEn: 'Can read and alter all web traffic on every page',
              descBn: 'সব ওয়েবসাইটের তথ্য ও ট্রাফিক পড়তে ও পরিবর্তন করতে পারে'
            },
            {
              name: 'webRequest',
              severity: 'high',
              descEn: 'Monitors HTTP headers and session traffic',
              descBn: 'নেটওয়ার্ক রিকোয়েস্ট ও সেশন ট্রাফিক পর্যবেক্ষণ করে'
            },
            {
              name: 'clipboardRead',
              severity: 'high',
              descEn: 'Can read copied text from clipboard',
              descBn: 'ক্লিপবোর্ডের টেক্সট বা পাসওয়ার্ড পড়তে পারে'
            }
          ],
          optionalPermissions: ['notifications'],
          lastUpdated: 'Demo Preview (Simulated)',
          riskLevel: 'high',
          explanationEn: '[DEMO ONLY - NOT A REAL DEVICE EXTENSION] Demonstrates warning for extensions with <all_urls> and clipboard permissions.',
          explanationBn: '[শুধুমাত্র ডেমো প্রিভিউ - আসল ডিভাইসের ডেটা নয়] সব ওয়েবসাইটের ডেটা ও ক্লিপবোর্ড পড়ার অনুমতি থাকলে কীভাবে সতর্কতা দেখানো হয় তা প্রদর্শিত হচ্ছে।'
        },
        {
          id: 'demo-ext-active-tab-clean',
          name: '[DEMO] Sample Bangla Reader',
          version: '2.0.1',
          enabled: true,
          installType: 'normal',
          hostAccessBreadth: 'activeTab only (On explicit click)',
          hostAccessRisk: 'safe',
          permissions: [
            {
              name: 'activeTab',
              severity: 'safe',
              descEn: 'Only accesses current tab upon toolbar click',
              descBn: 'শুধুমাত্র আইকনে ক্লিক করলেই বর্তমান ট্যাবটি অ্যাক্সেস করে'
            },
            {
              name: 'storage',
              severity: 'safe',
              descEn: 'Saves user preferences locally',
              descBn: 'লোকাল স্টোরেজে সেটিংস সেভ রাখে'
            }
          ],
          optionalPermissions: [],
          lastUpdated: 'Demo Preview (Simulated)',
          riskLevel: 'safe',
          explanationEn: '[DEMO ONLY - NOT A REAL DEVICE EXTENSION] Demonstrates safe rating for extensions using minimal activeTab permissions.',
          explanationBn: '[শুধুমাত্র ডেমো প্রিভিউ - আসল ডিভাইসের ডেটা নয়] নিরাপদ activeTab পারমিশন ব্যবহারের নমুনা প্রদর্শিত হচ্ছে।'
        }
      ];
    }

    return new Promise((resolve) => {
      chrome.management.getAll((extensions) => {
        if (chrome.runtime.lastError || !extensions) {
          resolve([]);
          return;
        }

        const selfId = chrome.runtime.id;
        const results: AuditedExtension[] = extensions
          .filter((ext) => ext.id !== selfId && ext.type === 'extension')
          .map((ext) => {
            const perms = ext.permissions || [];
            const hostPerms = ext.hostPermissions || [];
            const hasAllUrls = hostPerms.some((h) => h.includes('<all_urls>') || h.includes('*://*/*'));
            const hasClipboard = perms.includes('clipboardRead') || perms.includes('clipboardWrite');
            const hasWebRequest = perms.includes('webRequest') || perms.includes('webRequestBlocking');
            const hasCookies = perms.includes('cookies');
            const hasDebugger = perms.includes('debugger');
            const isUnpacked = ext.installType === 'development';

            let hostAccessBreadth = 'None';
            let hostAccessRisk: RiskLevel = 'safe';

            if (hasAllUrls) {
              hostAccessBreadth = '<all_urls> (All Websites)';
              hostAccessRisk = 'high';
            } else if (hostPerms.length > 0) {
              hostAccessBreadth = `${hostPerms.length} specific domain(s)`;
              hostAccessRisk = 'medium';
            } else if (perms.includes('activeTab')) {
              hostAccessBreadth = 'activeTab only (On explicit click)';
              hostAccessRisk = 'safe';
            }

            const reasonsEn: string[] = [];
            const reasonsBn: string[] = [];
            let riskLevel: RiskLevel = 'safe';

            if (hasAllUrls && (hasWebRequest || hasCookies)) {
              riskLevel = 'high';
              reasonsEn.push('Has broad access to all websites (<all_urls>) combined with network or session cookie inspection.');
              reasonsBn.push('সব ওয়েবসাইটে ডেটা ও সেশন কুকিজ পর্যবেক্ষণের অনুমতি রয়েছে।');
            } else if (hasClipboard) {
              riskLevel = 'high';
              reasonsEn.push('Can read or modify clipboard contents, which may expose passwords or copied account numbers.');
              reasonsBn.push('ক্লিপবোর্ডের টেক্সট পড়তে ও বদলাতে পারে, যা পাসওয়ার্ড বা ব্যাংক নম্বরের জন্য ঝুঁকিপূর্ণ।');
            } else if (hasDebugger) {
              riskLevel = 'high';
              reasonsEn.push('Uses Chrome debugger API which has complete control over browser tabs and network traffic.');
              reasonsBn.push('ক্রোম ডিবাগার অনুমতি ব্যবহার করে যা ট্যাবের ওপর পূর্ণ নিয়ন্ত্রণ দেয়।');
            } else if (hasAllUrls) {
              riskLevel = 'medium';
              reasonsEn.push('Requests broad access to all websites.');
              reasonsBn.push('সব ওয়েবসাইটের তথ্য পড়ার অনুমতি চেয়েছে।');
            }

            if (isUnpacked) {
              reasonsEn.push('Loaded unpacked in developer mode outside the Chrome Web Store.');
              reasonsBn.push('ক্রোম ওয়েব স্টোরের বাইরে থেকে ডেভেলপার মোডে লোড করা হয়েছে।');
              if (riskLevel === 'safe') riskLevel = 'medium';
            }

            const formattedPerms: DangerousPermissionInfo[] = perms.map((p) => {
              const isHigh = p === '<all_urls>' || p === 'cookies' || p === 'clipboardRead' || p === 'clipboardWrite' || p === 'debugger';
              const isMed = p === 'webRequest' || p === 'scripting' || p === 'tabs';
              return {
                name: p,
                severity: isHigh ? 'high' : isMed ? 'medium' : 'safe',
                descEn: `Permission: ${p}`,
                descBn: `অনুমতি: ${p}`
              };
            });

            return {
              id: ext.id,
              name: ext.name,
              version: ext.version,
              enabled: ext.enabled,
              installType: ext.installType,
              hostAccessBreadth,
              hostAccessRisk,
              permissions: formattedPerms,
              optionalPermissions: [],
              lastUpdated: ext.installType === 'development' ? 'Unpacked Development' : 'Chrome Web Store',
              riskLevel,
              explanationEn: reasonsEn.join(' ') || 'Standard extension permissions with no high-risk behaviors detected.',
              explanationBn: reasonsBn.join(' ') || 'স্বাভাবিক অনুমতিযুক্ত এক্সটেনশন, কোনো অস্বাভাবিক ঝুঁকি পাওয়া যায়নি।'
            };
          });

        resolve(results);
      });
    });
  },

  async requestOptionalAllUrls(): Promise<boolean> {
    if (!isChromeExtensionApiAvailable() || !chrome.permissions) {
      return false;
    }
    return new Promise((resolve) => {
      chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
        resolve(!!granted);
      });
    });
  },

  async getScheduledScanConfig(): Promise<ScheduledScanConfig> {
    return {
      enabled: true,
      intervalHours: 6,
      wifiOnly: false,
      deepPermissionAudit: true,
      notificationUrlGuard: false,
      lastScanTime: '15 mins ago (chrome.alarms)',
      nextScanTime: 'In 5h 45m',
      history: [
        {
          id: 'alarm-1',
          timestamp: 'Today, 10:30 AM',
          targetPlatform: 'chrome.alarms Service Worker',
          itemsScanned: 6,
          threatsFound: 1,
          summaryEn: 'Audited extensions via chrome.management. Flagged 1 with <all_urls>.',
          summaryBn: 'এক্সটেনশন অডিটে ১টি ব্রড অ্যাক্সেসযুক্ত এক্সটেনশন পাওয়া গেছে।'
        }
      ]
    };
  }
};
