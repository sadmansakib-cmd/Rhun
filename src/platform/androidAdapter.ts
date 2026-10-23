import { PlatformAdapter } from './index';
import { AuditedApp, MonitoredNotification, ScheduledScanConfig } from '../types';

export const androidAdapter: PlatformAdapter = {
  id: 'android',
  capabilities: {
    installedAppsAudit: true,
    notificationMonitor: true,
    currentTabCheck: true,
    installedExtensionsAudit: false,
    downloadGuard: true,
    backgroundScan: true
  },

  async auditInstalledApps(): Promise<AuditedApp[]> {
    // TODO(native): implement with a Capacitor plugin (e.g. ShieldPackageAudit.getInstalledPackages())
    return [
      {
        packageName: 'com.fastloan.instantcash.bd',
        appName: 'QuickCash Instant Loan',
        versionName: '2.4.1',
        installerSource: 'Sideloaded APK (Chrome Downloads)',
        isUnknownSource: true,
        riskLevel: 'high',
        permissions: [
          {
            name: 'READ_SMS',
            severity: 'high',
            descEn: 'Can read all incoming SMS including bank OTPs',
            descBn: 'ব্যাংক ও মোবাইল ব্যাংকিং-এর ওটিপি (OTP) সহ সব মেসেজ পড়তে পারে'
          },
          {
            name: 'READ_CONTACTS',
            severity: 'high',
            descEn: 'Uploads entire phonebook to external servers',
            descBn: 'আপনার ফোনের সব কন্টাক্ট নম্বর বাহ্যিক সার্ভারে কপি করতে পারে'
          }
        ],
        lastUpdated: '2 days ago',
        explanationEn: 'Installed outside Google Play Store with SMS & Contacts access. Severe OTP harvesting risk.',
        explanationBn: 'প্লে স্টোরের বাইরে থেকে ইনস্টল করা হয়েছে এবং মেসেজ ও কন্টাক্ট পড়ার অনুমতি নিয়েছে। ওটিপি চুরির ঝুঁকি রয়েছে।',
        actionAdviceEn: 'Revoke SMS permission immediately or uninstall.',
        actionAdviceBn: 'অবিলম্বে SMS অনুমতি বাতিল করুন অথবা অ্যাপটি আনইনস্টল করুন।'
      },
      {
        packageName: 'org.mozilla.firefox',
        appName: 'Firefox Privacy Browser',
        versionName: '131.0',
        installerSource: 'Google Play Store',
        isUnknownSource: false,
        riskLevel: 'safe',
        permissions: [
          {
            name: 'POST_NOTIFICATIONS',
            severity: 'safe',
            descEn: 'Shows download alerts',
            descBn: 'ডাউনলোড নোটিফিকেশন দেখায়'
          }
        ],
        lastUpdated: 'Yesterday',
        explanationEn: 'Verified store install, standard browser sandbox permissions.',
        explanationBn: 'প্লে স্টোর থেকে ইনস্টল করা বিশ্বস্ত ব্রাউজার। কোনো ক্ষতিকর অনুমতি নেই।',
        actionAdviceEn: 'Verified safe.',
        actionAdviceBn: 'নিরাপদ হিসেবে যাচাইকৃত।'
      }
    ];
  },

  async getMonitoredNotifications(): Promise<MonitoredNotification[]> {
    // TODO(native): implement with a Capacitor plugin binding NotificationListenerService (strictly NO AccessibilityService)
    return [
      {
        id: 'notif-1',
        appName: 'Messages (SMS)',
        packageName: 'com.google.android.apps.messaging',
        title: '+880 17XX-XXXXXX (Spoofed Alert)',
        messageBody: 'Dear customer, your bKash account will be locked in 2 hours. Verify PIN now: https://bkash-reward-claim.top/login',
        extractedUrl: 'https://bkash-reward-claim.top/login',
        timestamp: '3 mins ago',
        riskLevel: 'high',
        explanationEn: 'Phishing link detected in SMS notification! High-risk .top spoof claiming account lock.',
        explanationBn: 'এসএমএসে ফিশিং লিংক শনাক্ত হয়েছে! অ্যাকাউন্ট বন্ধের ভয় দেখিয়ে নকল সাইটে পিন চাওয়া হচ্ছে।'
      }
    ];
  },

  async getCurrentTabUrl(): Promise<string | null> {
    // TODO(native): implement with Android Share Intent or Custom Tabs callback
    return null;
  },

  async inspectDownload(fileName: string, url: string) {
    // TODO(native): implement with Capacitor DownloadManager listener
    const isApk = fileName.toLowerCase().endsWith('.apk');
    return {
      riskLevel: isApk ? 'high' : 'safe',
      warningEn: isApk ? 'Sideloaded Android Package (.APK). Check unknown-apps setting.' : 'Download signature clean.',
      warningBn: isApk ? 'প্লে স্টোরের বাইরের .APK ফাইল। ইনস্টল করা ঝুঁকিপূর্ণ হতে পারে।' : 'ফাইলটি নিরাপদ মনে হচ্ছে।'
    };
  },

  async getScheduledScanConfig(): Promise<ScheduledScanConfig> {
    // TODO(native): implement with Capacitor WorkManager scheduler
    return {
      enabled: true,
      intervalHours: 12,
      wifiOnly: false,
      deepPermissionAudit: true,
      notificationUrlGuard: true,
      lastScanTime: 'Today, 09:15 AM',
      nextScanTime: 'In 5h 42m',
      history: [
        {
          id: 'scan-101',
          timestamp: 'Today, 09:15 AM',
          targetPlatform: 'Android WorkManager',
          itemsScanned: 48,
          threatsFound: 2,
          summaryEn: 'Flagged 2 sideloaded APKs requesting SMS access.',
          summaryBn: '২টি সাইডলোড করা অ্যাপ শনাক্ত হয়েছে যেগুলো SMS অনুমতি চায়।'
        }
      ]
    };
  }
};
