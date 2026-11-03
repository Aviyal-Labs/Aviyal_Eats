import test from 'node:test';
import assert from 'node:assert/strict';
import mapApiError from '../src/api/errorMapper.js';

test('API errors retain field messages and request IDs', () => {
  const mapped = mapApiError({ response: { status: 400, data: { email: ['Invalid email.'] }, headers: { 'x-request-id': 'request-1' } } });
  assert.deepEqual(mapped.fields, { email: ['Invalid email.'] });
  assert.equal(mapped.requestId, 'request-1');
});
test('network errors, HTML and server stack details are not shown', () => {
  assert.match(mapApiError(new Error('internal connection detail')).message, /Unable to reach/);
  assert.equal(mapApiError({ response: { status: 500, data: { detail: 'private stack trace' } } }).message.includes('private'), false);
  assert.equal(mapApiError({ response: { status: 403, data: '<html>error</html>' } }).message.includes('<html>'), false);
});
