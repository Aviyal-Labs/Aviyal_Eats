import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, tokenStore } from '../src/api/client.js';
import { authApi } from '../src/api/authApi.js';
import { ownerApi } from '../src/api/ownerApi.js';
import { endpoints } from '../src/api/endpoints.js';

test('onboarding and owner mutations send only Django serializer fields', async (t) => {
  const originalAdapter = apiClient.defaults.adapter;
  t.after(() => { apiClient.defaults.adapter = originalAdapter; tokenStore.clear(); });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { config, status: 200, headers: {}, statusText: 'OK', data: { data: { status: 'PENDING' } } };
  };
  const registration = {
    owner_full_name: 'Test Owner', email: 'owner@example.com', mobile: '+919876543210',
    password: 'TestPassword!234', restaurant_name: 'Test Restaurant',
    restaurant_phone: '+919876543211', city: 'Test City', slug: 'test-restaurant',
  };
  await authApi.register({ ...registration, confirm_password: 'must-not-be-sent', role: 'SUPER_ADMIN' });
  assert.equal(requests[0].url, endpoints.auth.register);
  assert.deepEqual(JSON.parse(requests[0].data), registration);
  await authApi.resetPassword({ email: registration.email, otp: '123456', new_password: 'NewPassword!234', confirm_password: 'must-not-be-sent' });
  assert.deepEqual(Object.keys(JSON.parse(requests[1].data)).sort(), ['email', 'new_password', 'otp']);
  tokenStore.set('test-access');
  const result = await ownerApi.updateRestaurant({ name: 'Updated Name', phone: '+919876543212', city: 'Updated City', slug: 'must-not-change', status: 'APPROVED' });
  assert.equal(requests[2].method, 'patch');
  assert.equal(requests[2].url, endpoints.owner.restaurant);
  assert.equal(requests[2].headers.Authorization, 'Bearer test-access');
  assert.deepEqual(JSON.parse(requests[2].data), { name: 'Updated Name', phone: '+919876543212', city: 'Updated City' });
  assert.deepEqual(result, { status: 'PENDING' });
  await ownerApi.resubmit();
  assert.equal(requests[3].url, endpoints.owner.resubmit);
  assert.equal(requests[3].method, 'post');
});
