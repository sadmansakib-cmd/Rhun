import { parseAndNormalizeUrl, ParsedUrl } from './url';
import { evaluateUrlHeuristics } from './heuristics';
import { calculateRiskScore, ScoredVerdict } from './scoring';
import { ScanReason } from '../types';

export interface LocalEngineResult {
  parsed: ParsedUrl;
  reasons: ScanReason[];
  verdict: ScoredVerdict;
}

/**
 * Pure TypeScript, zero network local engine evaluation.
 */
export function evaluateLocalUrl(rawUrl: string): LocalEngineResult {
  const parsed = parseAndNormalizeUrl(rawUrl);
  const reasons = evaluateUrlHeuristics(parsed);
  const verdict = calculateRiskScore(reasons);

  return {
    parsed,
    reasons,
    verdict
  };
}

export * from './url';
export * from './brands';
export * from './heuristics';
export * from './scoring';
