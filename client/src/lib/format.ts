/**
 * Safe formatting utilities
 * Handles null/undefined values gracefully to prevent runtime errors
 */

/**
 * Safely format a number with locale string
 * Returns "0" if value is null/undefined/NaN
 */
export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return value.toLocaleString(undefined, options);
}

/**
 * Safely format currency (USD)
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0";
  }
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  })}`;
}

/**
 * Safely format percentage
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Safely format large numbers with abbreviations (K, M, B)
 */
export function formatCompact(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(0);
}

/**
 * Safely get numeric value or default
 */
export function getNumber(
  value: number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue;
  }
  return value;
}
