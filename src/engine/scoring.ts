import { ScanReason, ScanVerdict, RiskLevel } from '../types';

export interface ScoredVerdict {
  riskScore: number; // 0 to 100, clamped strictly between 5 and 99 (never 100% safe)
  riskLevel: RiskLevel;
  verdict: ScanVerdict;
  triggersShadowBanner: boolean;
  triggersFullInterstitial: boolean;
}

const SEVERITY_WEIGHTS: Record<ScanReason['severity'], number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 8,
  info: 3
};

/**
 * Combines detected heuristic reasons into an aggregated risk score and safety verdict.
 * Rule: Missing/unavailable checks contribute 'unknown', never 'safe'.
 * Rule: Never outputs "100% safe" or 0% risk.
 */
export function calculateRiskScore(
  reasons: ScanReason[],
  options: { hasIncompleteChecks?: boolean } = {}
): ScoredVerdict {
  if (options.hasIncompleteChecks && reasons.length === 0) {
    return {
      riskScore: 35,
      riskLevel: 'unknown',
      verdict: 'unknown',
      triggersShadowBanner: false,
      triggersFullInterstitial: false
    };
  }

  // Base floor is 6 (never 0, reflecting inherent zero-day / unknown risk)
  let rawScore = 6;

  for (const reason of reasons) {
    rawScore += SEVERITY_WEIGHTS[reason.severity] || 10;
  }

  // Clamp between 6 and 99 (never 100% safe and never 100% absolute)
  const riskScore = Math.min(99, Math.max(6, rawScore));

  const hasCritical = reasons.some((r) => r.severity === 'critical');
  const hasHigh = reasons.some((r) => r.severity === 'high');
  const hasApkOrMalware = reasons.some((r) => r.code === 'FAKE_APK_DOWNLOAD' || r.code === 'MALWARE_DROPPER');

  let verdict: ScanVerdict;
  let riskLevel: RiskLevel;

  if (hasApkOrMalware) {
    verdict = 'malware';
    riskLevel = 'high';
  } else if (hasCritical || riskScore >= 70) {
    verdict = 'phishing';
    riskLevel = 'high';
  } else if (hasHigh || riskScore >= 40) {
    verdict = 'suspicious';
    riskLevel = 'medium';
  } else if (riskScore >= 20 || reasons.length > 0) {
    verdict = 'suspicious';
    riskLevel = 'low';
  } else {
    verdict = 'safe';
    riskLevel = 'safe';
  }

  const triggersShadowBanner = riskLevel === 'high' || riskLevel === 'medium';
  const triggersFullInterstitial = riskLevel === 'high';

  return {
    riskScore,
    riskLevel,
    verdict,
    triggersShadowBanner,
    triggersFullInterstitial
  };
}
