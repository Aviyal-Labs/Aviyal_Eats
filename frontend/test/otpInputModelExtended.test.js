import test from 'node:test';
import assert from 'node:assert/strict';
import { otpDigits, updateOtpDigit, deleteOtpDigit, pasteOtp, OTP_LENGTH } from '../src/components/auth/otpInputModel.js';

test('OTP_LENGTH constant is 6', () => {
  assert.equal(OTP_LENGTH, 6);
});

test('otpDigits returns array of 6 for empty value', () => {
  const digits = otpDigits('');
  assert.equal(digits.length, 6);
  assert.ok(digits.every(d => d === ''));
});

test('otpDigits fills available digits and pads remainder with empty string', () => {
  const digits = otpDigits('123');
  assert.deepEqual(digits, ['1', '2', '3', '', '', '']);
});

test('otpDigits handles full 6-digit value', () => {
  const digits = otpDigits('654321');
  assert.deepEqual(digits, ['6', '5', '4', '3', '2', '1']);
});

test('updateOtpDigit updates specific index', () => {
  assert.equal(updateOtpDigit('', 0, '5'), '5');
  assert.equal(updateOtpDigit('5', 1, '3'), '53');
});

test('updateOtpDigit ignores non-numeric input', () => {
  assert.equal(updateOtpDigit('', 0, 'a'), '');
  assert.equal(updateOtpDigit('12', 2, 'x'), '12');
});

test('updateOtpDigit takes only the last digit when multiple chars given', () => {
  // slice(-1) takes the last character: '789' -> '9'
  assert.equal(updateOtpDigit('', 0, '789'), '9');
});

test('updateOtpDigit can overwrite existing digit', () => {
  assert.equal(updateOtpDigit('123456', 2, '9'), '129456');
});

test('deleteOtpDigit clears current digit if present', () => {
  assert.equal(deleteOtpDigit('123', 2), '12');
});

test('deleteOtpDigit clears previous digit when current is empty', () => {
  // digit[2] is empty, so previous digit[1] gets cleared
  assert.equal(deleteOtpDigit('12', 2), '1');
});

test('deleteOtpDigit does not go below index 0', () => {
  // digit[0] is empty, index 0 - nothing to delete before it
  assert.equal(deleteOtpDigit('', 0), '');
});

test('pasteOtp extracts numeric digits from pasted text', () => {
  assert.equal(pasteOtp('123456'), '123456');
});

test('pasteOtp strips non-numeric characters', () => {
  assert.equal(pasteOtp('12a34b56'), '123456');
});

test('pasteOtp truncates to 6 digits', () => {
  assert.equal(pasteOtp('1234567890'), '123456');
});

test('pasteOtp handles space-separated paste', () => {
  assert.equal(pasteOtp('1 2 3 4 5 6'), '123456');
});

test('pasteOtp handles partial paste shorter than 6', () => {
  assert.equal(pasteOtp('123'), '123');
});

test('pasteOtp handles empty input', () => {
  assert.equal(pasteOtp(''), '');
});

test('pasteOtp handles OTP-like format with dashes', () => {
  assert.equal(pasteOtp('12-34-56'), '123456');
});

test('complete OTP entry simulation: type all 6 digits one at a time', () => {
  let value = '';
  for (let i = 0; i < 6; i++) {
    value = updateOtpDigit(value, i, String(i + 1));
  }
  assert.equal(value, '123456');
  assert.equal(otpDigits(value).join(''), '123456');
});

test('backspace through all digits returns empty string', () => {
  let value = '123456';
  for (let i = 5; i >= 0; i--) {
    value = deleteOtpDigit(value, i);
  }
  assert.equal(value, '');
});
