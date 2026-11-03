import test from 'node:test';
import assert from 'node:assert/strict';

// Zod v4 uses result.error.issues (not .errors)
import { registrationSchema } from '../src/schemas/registrationSchema.js';
import { loginSchema } from '../src/schemas/loginSchema.js';
import { otpSchema } from '../src/schemas/otpSchema.js';
import { passwordResetRequestSchema, passwordResetSchema } from '../src/schemas/passwordResetSchema.js';
import { restaurantEditSchema } from '../src/schemas/restaurantEditSchema.js';
import { rejectionSchema } from '../src/schemas/rejectionSchema.js';

const validReg = {
  owner_full_name: 'Anu Nair',
  email: 'anu@example.com',
  mobile: '+919876543210',
  password: 'SecurePass!1',
  confirm_password: 'SecurePass!1',
  restaurant_name: 'Coconut Kitchen',
  restaurant_phone: '+914842000000',
  city: 'Kochi',
  slug: 'coconut-kitchen',
};

// Helper: get failing paths from Zod v4 result
const failingPaths = (result) =>
  result.error?.issues?.map((issue) => issue.path?.[0]).filter(Boolean) ?? [];

// --- Registration Schema ---
test('registrationSchema: valid data passes', () => {
  const result = registrationSchema.safeParse(validReg);
  assert.ok(result.success, JSON.stringify(result.error?.issues));
});

test('registrationSchema: missing owner_full_name fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, owner_full_name: '' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('owner_full_name'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: invalid email fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, email: 'not-an-email' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('email'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: non-Indian mobile fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, mobile: '+14155552671' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('mobile'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: Indian mobile without 6-9 start digit fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, mobile: '+915555555555' });
  assert.ok(!result.success, 'Should fail for mobile starting with 5');
});

test('registrationSchema: short password fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, password: 'Short1!', confirm_password: 'Short1!' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('password'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: password without uppercase fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, password: 'alllower!1', confirm_password: 'alllower!1' });
  assert.ok(!result.success, 'Should fail for no uppercase letter');
});

test('registrationSchema: password without special character fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, password: 'NoSpecial1A', confirm_password: 'NoSpecial1A' });
  assert.ok(!result.success, 'Should fail for no special character');
});

test('registrationSchema: password without digit fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, password: 'NoDigit!AA', confirm_password: 'NoDigit!AA' });
  assert.ok(!result.success, 'Should fail for no digit');
});

test('registrationSchema: mismatched confirm_password fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, confirm_password: 'DifferentPass!1' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('confirm_password'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: invalid slug (uppercase) fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, slug: 'UPPERCASE-SLUG' });
  assert.ok(!result.success, 'Should fail for uppercase slug');
  assert.ok(failingPaths(result).includes('slug'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: slug with double hyphen fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, slug: 'my--restaurant' });
  assert.ok(!result.success, 'Should fail for double hyphen');
});

test('registrationSchema: valid slug with numbers passes', () => {
  const result = registrationSchema.safeParse({ ...validReg, slug: 'restaurant-42' });
  assert.ok(result.success, JSON.stringify(result.error?.issues));
});

test('registrationSchema: missing restaurant_name fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, restaurant_name: '' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('restaurant_name'), `Paths: ${failingPaths(result)}`);
});

test('registrationSchema: missing city fails', () => {
  const result = registrationSchema.safeParse({ ...validReg, city: '' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('city'), `Paths: ${failingPaths(result)}`);
});

// --- Login Schema ---
test('loginSchema: valid data passes', () => {
  const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anypass' });
  assert.ok(result.success);
});

test('loginSchema: empty email fails', () => {
  const result = loginSchema.safeParse({ email: '', password: 'pass' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('email'), `Paths: ${failingPaths(result)}`);
});

test('loginSchema: empty password fails', () => {
  const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('password'), `Paths: ${failingPaths(result)}`);
});

test('loginSchema: invalid email format fails', () => {
  const result = loginSchema.safeParse({ email: 'not-an-email', password: 'pass' });
  assert.ok(!result.success);
});

// --- OTP Schema ---
test('otpSchema: valid 6-digit OTP passes', () => {
  const result = otpSchema.safeParse({ email: 'user@example.com', otp: '123456' });
  assert.ok(result.success);
});

test('otpSchema: 5-digit OTP fails', () => {
  const result = otpSchema.safeParse({ email: 'user@example.com', otp: '12345' });
  assert.ok(!result.success);
});

test('otpSchema: 7-digit OTP fails', () => {
  const result = otpSchema.safeParse({ email: 'user@example.com', otp: '1234567' });
  assert.ok(!result.success);
});

test('otpSchema: non-numeric OTP fails', () => {
  const result = otpSchema.safeParse({ email: 'user@example.com', otp: '12345a' });
  assert.ok(!result.success);
});

test('otpSchema: empty OTP fails', () => {
  const result = otpSchema.safeParse({ email: 'user@example.com', otp: '' });
  assert.ok(!result.success);
});

// --- Password Reset Schemas ---
test('passwordResetRequestSchema: valid email passes', () => {
  const result = passwordResetRequestSchema.safeParse({ email: 'user@example.com' });
  assert.ok(result.success);
});

test('passwordResetRequestSchema: invalid email fails', () => {
  const result = passwordResetRequestSchema.safeParse({ email: 'bad' });
  assert.ok(!result.success);
});

test('passwordResetSchema: valid data passes', () => {
  const result = passwordResetSchema.safeParse({
    email: 'user@example.com',
    otp: '123456',
    new_password: 'NewPass!1',
    confirm_password: 'NewPass!1',
  });
  assert.ok(result.success, JSON.stringify(result.error?.issues));
});

test('passwordResetSchema: mismatched passwords fail', () => {
  const result = passwordResetSchema.safeParse({
    email: 'user@example.com',
    otp: '123456',
    new_password: 'NewPass!1',
    confirm_password: 'Different!1',
  });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('confirm_password'), `Paths: ${failingPaths(result)}`);
});

test('passwordResetSchema: weak new_password fails', () => {
  const result = passwordResetSchema.safeParse({
    email: 'user@example.com',
    otp: '123456',
    new_password: 'weak',
    confirm_password: 'weak',
  });
  assert.ok(!result.success, 'Should fail for weak password');
});

// --- Restaurant Edit Schema ---
const validEdit = {
  restaurant_name: 'Coconut Kitchen',
  restaurant_phone: '+914842000000',
  city: 'Kochi',
  slug: 'coconut-kitchen',
};

test('restaurantEditSchema: valid data passes', () => {
  const result = restaurantEditSchema.safeParse(validEdit);
  assert.ok(result.success, JSON.stringify(result.error?.issues));
});

test('restaurantEditSchema: empty name fails', () => {
  const result = restaurantEditSchema.safeParse({ ...validEdit, restaurant_name: '' });
  assert.ok(!result.success);
});

test('restaurantEditSchema: invalid phone fails', () => {
  const result = restaurantEditSchema.safeParse({ ...validEdit, restaurant_phone: 'not-a-phone' });
  assert.ok(!result.success);
});

test('restaurantEditSchema: invalid slug (uppercase) fails', () => {
  const result = restaurantEditSchema.safeParse({ ...validEdit, slug: 'UPPERCASE' });
  assert.ok(!result.success, 'Should fail for uppercase slug');
});

// --- Rejection Schema ---
test('rejectionSchema: valid reason passes', () => {
  const result = rejectionSchema.safeParse({ reason: 'Please provide a business license.' });
  assert.ok(result.success);
});

test('rejectionSchema: empty reason fails', () => {
  const result = rejectionSchema.safeParse({ reason: '' });
  assert.ok(!result.success);
  assert.ok(failingPaths(result).includes('reason'), `Paths: ${failingPaths(result)}`);
});

test('rejectionSchema: whitespace-only reason fails', () => {
  const result = rejectionSchema.safeParse({ reason: '   ' });
  assert.ok(!result.success, 'Should fail for whitespace-only reason');
});

test('rejectionSchema: reason exceeding 500 chars fails', () => {
  const result = rejectionSchema.safeParse({ reason: 'a'.repeat(501) });
  assert.ok(!result.success);
});

test('rejectionSchema: reason at exactly 500 chars passes', () => {
  const result = rejectionSchema.safeParse({ reason: 'a'.repeat(500) });
  assert.ok(result.success);
});
