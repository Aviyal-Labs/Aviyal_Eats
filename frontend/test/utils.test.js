import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/utils/slug.js';
import { formatPhone } from '../src/utils/phone.js';
import { getRequestId } from '../src/utils/requestId.js';

// --- slug.js ---
test('slugify converts uppercase to lowercase', () => {
  assert.equal(slugify('Coconut Kitchen'), 'coconut-kitchen');
});

test('slugify replaces spaces with hyphens', () => {
  assert.equal(slugify('The Spice House'), 'the-spice-house');
});

test('slugify removes special characters (apostrophe becomes hyphen separator)', () => {
  // Apostrophe is a non-alphanumeric char, becomes a separator: "mama-s-kitchen"
  const result = slugify("Mama's Kitchen!");
  assert.ok(result.includes('mama'), `Expected 'mama' in: ${result}`);
  assert.ok(!result.includes("'"), 'Should not contain apostrophe');
  assert.ok(/^[a-z0-9-]+$/.test(result), 'Should only contain lowercase letters, numbers, hyphens');
});

test('slugify collapses multiple spaces/special chars to single hyphen', () => {
  assert.equal(slugify('Cafe  --  Latte'), 'cafe-latte');
});

test('slugify trims leading and trailing hyphens', () => {
  assert.equal(slugify(' -hello- '), 'hello');
});

test('slugify handles empty string', () => {
  assert.equal(slugify(''), '');
});

test('slugify truncates to 100 characters', () => {
  const long = 'a'.repeat(150);
  assert.equal(slugify(long).length, 100);
});

test('slugify preserves numbers', () => {
  assert.equal(slugify('Restaurant 42'), 'restaurant-42');
});

// --- phone.js ---
test('formatPhone formats Indian +91 numbers with spaces', () => {
  assert.equal(formatPhone('+919876543210'), '+91 98765 43210');
});

test('formatPhone returns raw value for non-Indian numbers', () => {
  assert.equal(formatPhone('+14155552671'), '+14155552671');
});

test('formatPhone returns em-dash for empty string', () => {
  assert.equal(formatPhone(''), '—');
});

test('formatPhone strips spaces before checking +91 format', () => {
  assert.equal(formatPhone('+91 987-654-3210'), '+91 98765 43210');
});

test('formatPhone handles short +91 number (not 13 digits after strip)', () => {
  // +91 + 9 digits = 12 chars - should NOT be formatted
  const result = formatPhone('+9198765432');
  assert.equal(result, '+9198765432');
});

// --- requestId.js ---
test('getRequestId extracts from error.response.headers as plain object', () => {
  const error = { response: { headers: { 'x-request-id': 'req-abc-123' } } };
  assert.equal(getRequestId(error), 'req-abc-123');
});

test('getRequestId extracts from Headers.get() method (fetch-style)', () => {
  const error = { response: { headers: { get: (key) => key === 'x-request-id' ? 'req-xyz-456' : null } } };
  assert.equal(getRequestId(error), 'req-xyz-456');
});

test('getRequestId returns null when no response', () => {
  assert.equal(getRequestId(new Error('Network error')), null);
});

test('getRequestId returns null when header missing', () => {
  const error = { response: { headers: {} } };
  assert.equal(getRequestId(error), null);
});

test('getRequestId returns null for null input', () => {
  assert.equal(getRequestId(null), null);
});
