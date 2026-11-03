import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime } from '../src/utils/dateTime.js';

test('formatDateTime returns IST formatted string for valid UTC timestamp', () => {
  // 2026-11-01T11:00:00.000Z => 4:30 PM IST (UTC+5:30)
  assert.equal(formatDateTime('2026-11-01T11:00:00.000Z'), '01 Nov 2026, 4:30 PM IST');
});

test('formatDateTime returns em-dash for null input', () => {
  assert.equal(formatDateTime(null), '—');
});

test('formatDateTime returns em-dash for undefined input', () => {
  assert.equal(formatDateTime(undefined), '—');
});

test('formatDateTime returns em-dash for empty string', () => {
  assert.equal(formatDateTime(''), '—');
});

test('formatDateTime handles midnight UTC correctly in IST (adds 5h30m)', () => {
  // 2026-01-01T00:00:00Z => 2026-01-01T05:30:00+05:30 => 01 Jan 2026, 5:30 AM IST
  assert.equal(formatDateTime('2026-01-01T00:00:00Z'), '01 Jan 2026, 5:30 AM IST');
});

test('formatDateTime always produces IST regardless of input timezone offset', () => {
  // Same moment in different representations
  const utc = formatDateTime('2026-11-01T11:00:00.000Z');
  const withOffset = formatDateTime('2026-11-01T16:30:00.000+05:30');
  assert.equal(utc, withOffset);
});

test('formatDateTime output always ends with IST', () => {
  const result = formatDateTime('2026-06-15T06:00:00Z');
  assert.ok(result.endsWith('IST'), `Expected IST suffix, got: ${result}`);
});

test('formatDateTime uses DD MMM YYYY format', () => {
  const result = formatDateTime('2026-11-01T11:00:00.000Z');
  assert.match(result, /^\d{2} [A-Z][a-z]{2} \d{4},/);
});

