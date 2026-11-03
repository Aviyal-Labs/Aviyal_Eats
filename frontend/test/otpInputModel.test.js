import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteOtpDigit, otpDigits, pasteOtp, updateOtpDigit } from '../src/components/auth/otpInputModel.js';

test('typing a digit updates the corresponding empty box', () => {
  assert.equal(updateOtpDigit('', 0, '1'), '1');
  assert.equal(updateOtpDigit('1', 1, '2'), '12');
  assert.deepEqual(otpDigits('12'), ['1', '2', '', '', '', '']);
});

test('paste keeps six numeric digits and ignores non-numeric characters', () => {
  assert.equal(pasteOtp('12a3 4567'), '123456');
});

test('backspace deletes the active digit, then the previous digit', () => {
  assert.equal(deleteOtpDigit('123', 2), '12');
  assert.equal(deleteOtpDigit('12', 2), '1');
});

test('the resulting value is suitable for React Hook Form synchronization', () => {
  let formValue = '';
  formValue = updateOtpDigit(formValue, 0, '1');
  formValue = updateOtpDigit(formValue, 1, '2');
  formValue = pasteOtp(`${formValue}3456`);
  assert.equal(formValue, '123456');
});
