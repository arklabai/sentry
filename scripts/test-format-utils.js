/**
 * Unit Test Suite for Number & Metric Formatting Utilities
 */
import assert from 'assert';

function formatMetricNumber(val) {
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

function formatFullNumber(val) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('en-US');
}

console.log('--- Testing Number & Metric Formatting Suite ---');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

// 1. Zero and falsy values
test('Formats zero as "0"', () => {
  assert.strictEqual(formatMetricNumber(0), '0');
  assert.strictEqual(formatFullNumber(0), '0');
});

test('Handles undefined and null gracefully', () => {
  assert.strictEqual(formatMetricNumber(undefined), '0');
  assert.strictEqual(formatMetricNumber(null), '0');
  assert.strictEqual(formatFullNumber(undefined), '0');
  assert.strictEqual(formatFullNumber(null), '0');
});

// 2. Numbers below 1,000 (no commas needed)
test('Formats small integers as plain string', () => {
  assert.strictEqual(formatMetricNumber(42), '42');
  assert.strictEqual(formatMetricNumber(999), '999');
  assert.strictEqual(formatFullNumber(999), '999');
});

// 3. Numbers between 1,000 and 999,999 (comma separation)
test('Formats thousands with comma separation', () => {
  assert.strictEqual(formatMetricNumber(1000), '1,000');
  assert.strictEqual(formatMetricNumber(1234), '1,234');
  assert.strictEqual(formatMetricNumber(45180), '45,180');
  assert.strictEqual(formatMetricNumber(999999), '999,999');
});

// 4. Numbers >= 1,000,000 (compact notation: 1M, 1.1M, etc.)
test('Compacts exactly 1 million to "1M"', () => {
  assert.strictEqual(formatMetricNumber(1_000_000), '1M');
});

test('Compacts 1.1 million to "1.1M"', () => {
  assert.strictEqual(formatMetricNumber(1_100_000), '1.1M');
});

test('Compacts 1.05 million to "1.1M"', () => {
  assert.strictEqual(formatMetricNumber(1_050_000), '1.1M');
});

test('Compacts 2.5 million to "2.5M"', () => {
  assert.strictEqual(formatMetricNumber(2_500_000), '2.5M');
});

test('Compacts 10 million to "10M"', () => {
  assert.strictEqual(formatMetricNumber(10_000_000), '10M');
});

test('Compacts 12.4 million to "12.4M"', () => {
  assert.strictEqual(formatMetricNumber(12_400_000), '12.4M');
});

// 5. Billions
test('Compacts 1 billion to "1B"', () => {
  assert.strictEqual(formatMetricNumber(1_000_000_000), '1B');
});

test('Compacts 2.7 billion to "2.7B"', () => {
  assert.strictEqual(formatMetricNumber(2_700_000_000), '2.7B');
});

// 6. Dashboard full number representation (always full comma separation, never 1M)
test('Dashboard formatFullNumber preserves all digits for millions', () => {
  assert.strictEqual(formatFullNumber(1_000_000), '1,000,000');
  assert.strictEqual(formatFullNumber(1_234_567), '1,234,567');
  assert.strictEqual(formatFullNumber(10_543_210), '10,543,210');
  assert.strictEqual(formatFullNumber(1_000_000_000), '1,000,000,000');
});

console.log(`\nFormat Utils Test Results: ${passed} Passed, 0 Failed.`);
