/**
 * DevPulse Studio - Shared ROI Math Utilities
 *
 * Re-implements the Python ROI calculator logic in TypeScript 
 * to ensure exact 1:1 mathematical consistency between agent backend 
 * and Next.js frontend analytics dashboard.
 */

export const DEFAULT_DEV_HOURLY_RATE = 85;

/**
 * Calculates dollar value saved based on developer hourly rate.
 * Rate defaults to process.env.DEV_HOURLY_RATE or $85/hr.
 */
export function calculate_dollar_value(hoursSaved: number): number {
  const envRate = process.env.DEV_HOURLY_RATE;
  const rate = envRate ? parseFloat(envRate) : DEFAULT_DEV_HOURLY_RATE;
  const validRate = isNaN(rate) || rate <= 0 ? DEFAULT_DEV_HOURLY_RATE : rate;
  return Number((hoursSaved * validRate).toFixed(2));
}

/**
 * Calculates MTTR reduction percentage given baseline and current MTTR minutes.
 * Default baseline MTTR for un-automated pipelines is 45 minutes.
 */
export function calculate_mttr_reduction_percent(
  baselineMttrMinutes = 45,
  currentMttrMinutes = 14.4
): number {
  if (baselineMttrMinutes <= 0) return 0;
  const reduction = ((baselineMttrMinutes - currentMttrMinutes) / baselineMttrMinutes) * 100;
  return Math.min(Math.max(Math.round(reduction), 0), 99);
}
