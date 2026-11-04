import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, tokenStore } from '../src/api/client.js';
import { authApi, isUnregisteredGoogleAccount } from '../src/api/authApi.js';
import { endpoints } from '../src/api/endpoints.js';
import { googleSignupSchema } from '../src/schemas/googleSignupSchema.js';
import { sessionDestination } from '../src/utils/sessionDestination.js';

test('Google adapters use credential identity and exact signup serializer fields', async (t) => {
  const adapter = apiClient.defaults.adapter;
  const calls = [];
  t.after(() => { apiClient.defaults.adapter = adapter; tokenStore.clear(); });
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return { config, status: 200, headers: {}, data: { data: {
      access_token: 'test-access', user: { role: 'OWNER' }, restaurant: { status: 'PENDING' },
    } } };
  };
  await authApi.googleLogin('test-only-credential');
  assert.equal(calls[0].url, endpoints.auth.googleLogin);
  assert.deepEqual(JSON.parse(calls[0].data), { credential: 'test-only-credential' });
  const values = { mobile: '+919876543210', restaurant_name: 'Test Kitchen', restaurant_phone: '+919876543211', city: 'Test City', requested_slug: 'test-kitchen' };
  const session = await authApi.googleSignup('test-only-credential', { ...values, email: 'ignored@example.com', full_name: 'Ignored', slug: 'wrong-field', role: 'SUPER_ADMIN' });
  assert.deepEqual(JSON.parse(calls[1].data), { credential: 'test-only-credential', ...values });
  assert.equal(session.accessToken, 'test-access');
  assert.equal(tokenStore.get(), 'test-access');
  assert.equal(sessionDestination(session), '/owner/pending');
});

test('only the specific Google unregistered response opens onboarding', () => {
  const error = {
    config: { url: endpoints.auth.googleLogin },
    response: { status: 404, data: { detail: 'Google account is not registered. Please complete restaurant signup.' } },
  };
  assert.equal(isUnregisteredGoogleAccount(error), true);
  assert.equal(isUnregisteredGoogleAccount({ ...error, config: { url: endpoints.auth.googleSignup } }), false);
  assert.equal(isUnregisteredGoogleAccount({ ...error, response: { status: 404, data: { detail: 'Not found.' } } }), false);
  assert.equal(isUnregisteredGoogleAccount({ ...error, response: { status: 409, data: error.response.data } }), false);
});

test('Google onboarding validates phone format and slug without email claims', () => {
  const values = { mobile: '+91 98765 43210', restaurant_name: ' Test Kitchen ', restaurant_phone: '+919876543211', city: 'Kochi', requested_slug: 'test-kitchen' };
  assert.equal(googleSignupSchema.parse(values).mobile, '+919876543210');
  assert.equal(googleSignupSchema.safeParse({ ...values, mobile: 'not-a-phone' }).success, false);
  assert.equal(googleSignupSchema.safeParse({ ...values, requested_slug: '../other' }).success, false);
  assert.equal(googleSignupSchema.safeParse({ ...values, restaurant_phone: '9876543211' }).success, false);
  assert.equal(googleSignupSchema.safeParse({ ...values, restaurant_name: 'x'.repeat(201) }).success, false);
  assert.equal(googleSignupSchema.safeParse({ ...values, restaurant_name: 'x'.repeat(200) }).success, true);
});

test('unknown role and restaurant state never fall back to owner pending', () => {
  assert.equal(sessionDestination({ user: { role: 'STAFF' } }), '/forbidden');
  assert.equal(sessionDestination({ user: { role: 'OWNER' }, restaurant: null }), '/forbidden');
  assert.equal(sessionDestination({ user: { role: 'SUPER_ADMIN' } }), '/admin');
});
