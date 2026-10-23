// Chrome Extension (MV3) Background Service Worker
import { scanUrl } from '../services/api';

chrome.runtime.onInstalled.addListener(() => {
  // 1. Create Context Menu for Links
  chrome.contextMenus.create({
    id: 'shield_check_link',
    title: 'Check this link with Shield',
    contexts: ['link']
  });

  // 2. Set up periodic alarm for extension security audit (every 6 hours)
  chrome.alarms.create('shield_periodic_audit', {
    periodInMinutes: 360
  });
});

// Handle Context Menu clicks on links
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'shield_check_link' && info.linkUrl) {
    const targetUrl = info.linkUrl;
    try {
      const result = await scanUrl(targetUrl);
      const isHighRisk = result.riskLevel === 'high';

      // Push rich Chrome Notification
      chrome.notifications.create(`shield_scan_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: isHighRisk ? 'Shield Warning: Dangerous Link Detected!' : 'Shield: Link Appears Safe',
        message: `${result.verdict.toUpperCase()} (Risk ${result.riskScore}/100): ${result.reasons[0]?.explanationEn || 'No severe threats detected.'} (${result.domain})`,
        priority: isHighRisk ? 2 : 0
      });

      // If high risk and active tab exists, trigger Shadow DOM banner in content script
      if (isHighRisk && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHIELD_SHOW_WARNING',
          verdict: result
        }).catch(() => {
          // Tab might not be ready or page restricted
        });
      }
    } catch (_err) {
      chrome.notifications.create(`shield_err_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Shield Security',
        message: 'Could not complete link check for the selected URL.'
      });
    }
  }
});

// Handle periodic background audit alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'shield_periodic_audit') {
    chrome.management.getAll((extensions) => {
      const selfId = chrome.runtime.id;
      const risky = extensions.filter(
        (ext) =>
          ext.id !== selfId &&
          ext.enabled &&
          (ext.permissions?.includes('<all_urls>') ||
            ext.permissions?.includes('clipboardRead') ||
            ext.hostPermissions?.some((h) => h.includes('<all_urls>')))
      );

      if (risky.length > 0) {
        chrome.notifications.create('shield_ext_audit_alert', {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Shield Security Audit',
          message: `Periodic audit found ${risky.length} enabled extension(s) with broad website or clipboard permissions.`
        });
      }
    });
  }
});

// Communication listener between popup, content scripts, and background worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'CHECK_URL' && message.url) {
    scanUrl(message.url)
      .then((verdict) => sendResponse({ verdict }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Keep asynchronous channel open
  }
});
