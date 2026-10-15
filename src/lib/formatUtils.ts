/**
 * Sentry AI - Number & Metric Formatting Utilities
 */

/**
 * Formats a number with proper comma separation (e.g. 1,234, 45,180).
 * If the number is greater than or equal to 1,000,000, it compacts to 1M, 1.1M, etc.
 *
 * Examples:
 * - 0 -> "0"
 * - 999 -> "999"
 * - 1,234 -> "1,234"
 * - 45,180 -> "45,180"
 * - 1,000,000 -> "1M"
 * - 1,100,000 -> "1.1M"
 * - 2,500,000 -> "2.5M"
 * - 1,000,000,000 -> "1B"
 */
export function formatMetricNumber(val: number | undefined | null): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;

  if (num >= 1_000_000_000) {
    const formatted = (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}B`;
  }

  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }

  return num.toLocaleString('en-US');
}

/**
 * Formats a number with full comma separation regardless of magnitude.
 * Used for detailed dashboard displays where exact counts must be preserved.
 *
 * Examples:
 * - 1,234,567 -> "1,234,567"
 */
export function formatFullNumber(val: number | undefined | null): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('en-US');
}
