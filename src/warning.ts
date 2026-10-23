// Handles warning.html interstitial logic without inline scripts
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url') || 'https://unknown-suspicious-domain.top';
  let verdictData: any = null;

  try {
    const rawVerdict = params.get('verdict');
    if (rawVerdict) {
      verdictData = JSON.parse(decodeURIComponent(rawVerdict));
    }
  } catch (_e) {
    // fallback
  }

  const targetUrlEl = document.getElementById('targetUrl');
  if (targetUrlEl) {
    targetUrlEl.textContent = targetUrl;
  }

  if (verdictData) {
    const expEn = document.getElementById('explanationEn');
    const expBn = document.getElementById('explanationBn');
    if (expEn && verdictData.reasons?.[0]?.explanationEn) {
      expEn.textContent = verdictData.reasons[0].explanationEn;
    }
    if (expBn && verdictData.reasons?.[0]?.explanationBn) {
      expBn.textContent = verdictData.reasons[0].explanationBn;
    }
  }

  const btnGoBack = document.getElementById('btnGoBack');
  const btnProceed = document.getElementById('btnProceed');
  const confirmationBox = document.getElementById('confirmationBox');

  let hasConfirmedStep = false;

  btnGoBack?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'about:blank';
    }
  });

  btnProceed?.addEventListener('click', () => {
    if (!hasConfirmedStep) {
      hasConfirmedStep = true;
      if (confirmationBox) {
        confirmationBox.classList.remove('hidden');
      }
      if (btnProceed) {
        btnProceed.textContent = 'Confirm & Proceed Anyway (Unsafe)';
        btnProceed.classList.remove('border-slate-700', 'text-slate-400');
        btnProceed.classList.add('border-amber-500', 'text-amber-400', 'bg-amber-950/20');
      }
    } else {
      // User confirmed, proceed to target
      window.location.href = targetUrl;
    }
  });
});
