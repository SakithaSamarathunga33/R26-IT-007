// Single source of truth for risk bands; must match every backend's risk_utils.py (low < 0.35, high >= 0.70).
export const RISK_LOW_MAX = 0.35;
export const RISK_HIGH_MIN = 0.7;

export type RiskLevel = "low" | "medium" | "high";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < RISK_LOW_MAX) return "low";
  if (score < RISK_HIGH_MIN) return "medium";
  return "high";
}
