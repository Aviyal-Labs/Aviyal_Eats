import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from '../src/api/client.js';
import { adminApi } from '../src/api/adminApi.js';
import { endpoints } from '../src/api/endpoints.js';

test('admin adapters use Django list, detail and decision contracts', async (t) => {
  const originalAdapter = apiClient.defaults.adapter;
  t.after(() => { apiClient.defaults.adapter = originalAdapter; });
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    let data;
    if (config.url === endpoints.admin.restaurants) {
      data = { count: 21, results: [{ id: 'one', owner_name: 'Owner' }], next: null, previous: null };
    } else if (config.method === 'get') {
      data = { restaurant: { id: 'one', owner_name: 'Owner' }, approval_history: [{ actor_email: 'admin@example.com' }] };
    } else {
      data = { id: 'one', status: 'APPROVED' };
    }
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } };
  };
  const list = await adminApi.list({ ordering: 'oldest', page: 2 });
  assert.equal(list.page, 2);
  assert.equal(list.total_pages, 2);
  assert.equal(list.results[0].owner_full_name, 'Owner');
  assert.equal(calls[0].params.page_size, 20);
  assert.equal('ordering' in calls[0].params, false);
  const detail = await adminApi.get('one');
  assert.equal(detail.history[0].actor_email, 'admin@example.com');
  assert.equal(detail.owner_full_name, 'Owner');
  assert.equal((await adminApi.approve('one')).status, 'APPROVED');
  await adminApi.reject('one', { reason: 'Please correct the details.' });
  assert.equal(calls[3].data, JSON.stringify({ reason: 'Please correct the details.' }));
  assert.ok(calls.every((call) => !call.url.endsWith('/history/')));
});
