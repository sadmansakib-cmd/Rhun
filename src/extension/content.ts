// Chrome Extension Content Script (Shadow DOM Warning Banner)

let bannerHost: HTMLElement | null = null;

function renderWarningBanner(verdict: any) {
  if (bannerHost) {
    bannerHost.remove();
  }

  bannerHost = document.createElement('div');
  bannerHost.id = 'shield-warning-host';
  bannerHost.style.position = 'fixed';
  bannerHost.style.top = '16px';
  bannerHost.style.left = '50%';
  bannerHost.style.transform = 'translateX(-50%)';
  bannerHost.style.zIndex = '2147483647';
  bannerHost.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const shadow = bannerHost.attachShadow({ mode: 'closed' });

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '12px';
  container.style.backgroundColor = '#18040a';
  container.style.color = '#ffffff';
  container.style.border = '1.5px solid #E11D48';
  container.style.boxShadow = '0 10px 25px -5px rgba(225, 29, 72, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
  container.style.padding = '12px 18px';
  container.style.borderRadius = '9999px';
  container.style.maxWidth = '90vw';

  const icon = document.createElement('div');
  icon.textContent = '⚠';
  icon.style.color = '#FB7185';
  icon.style.fontSize = '20px';
  icon.style.lineHeight = '1';

  const text = document.createElement('div');
  text.style.fontSize = '13px';
  text.style.lineHeight = '1.4';

  const boldPrefix = document.createElement('strong');
  boldPrefix.textContent = `Shield Warning (${verdict.verdict || 'phishing'}): `;
  const detailSpan = document.createElement('span');
  detailSpan.style.color = '#cbd5e1';
  detailSpan.textContent = verdict.reasons?.[0]?.explanationEn || 'Proceed with caution.';

  text.appendChild(boldPrefix);
  text.appendChild(detailSpan);

  const detailsBtn = document.createElement('button');
  detailsBtn.innerText = 'Details';
  detailsBtn.style.backgroundColor = '#E11D48';
  detailsBtn.style.color = '#ffffff';
  detailsBtn.style.border = 'none';
  detailsBtn.style.padding = '6px 14px';
  detailsBtn.style.borderRadius = '9999px';
  detailsBtn.style.cursor = 'pointer';
  detailsBtn.style.fontSize = '12px';
  detailsBtn.style.fontWeight = '600';
  detailsBtn.onclick = () => {
    const warningUrl = chrome.runtime.getURL(`warning.html?url=${encodeURIComponent(window.location.href)}&verdict=${encodeURIComponent(JSON.stringify(verdict))}`);
    window.location.href = warningUrl;
  };

  const dismissBtn = document.createElement('button');
  dismissBtn.innerText = 'Dismiss';
  dismissBtn.style.backgroundColor = 'transparent';
  dismissBtn.style.color = '#94a3b8';
  dismissBtn.style.border = '1px solid #334155';
  dismissBtn.style.padding = '5px 12px';
  dismissBtn.style.borderRadius = '9999px';
  dismissBtn.style.cursor = 'pointer';
  dismissBtn.style.fontSize = '12px';
  dismissBtn.onclick = () => {
    if (bannerHost) bannerHost.remove();
  };

  container.appendChild(icon);
  container.appendChild(text);
  container.appendChild(detailsBtn);
  container.appendChild(dismissBtn);
  shadow.appendChild(container);

  document.body.appendChild(bannerHost);
}

// Listen for messages from background script
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SHIELD_SHOW_WARNING' && message.verdict) {
      renderWarningBanner(message.verdict);
    }
  });
}
