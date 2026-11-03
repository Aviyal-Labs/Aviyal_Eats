// Run explicitly against the local Django service: node test/backendSmoke.mjs
import assert from 'node:assert/strict';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
const origin = 'http://localhost:5173';

const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf/`, { headers: { Origin: origin } });
assert.equal(csrf.status, 200);
assert.equal(csrf.headers.get('access-control-allow-origin'), origin);
assert.equal(csrf.headers.get('access-control-allow-credentials'), 'true');
const csrfBody = await csrf.json();
assert.equal(typeof csrfBody.data.csrf_token, 'string');
const cookie = csrf.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
assert.ok(cookie.includes('csrftoken='));

const missingCsrf = await fetch(`${baseUrl}/api/v1/auth/refresh/`, { method: 'POST' });
assert.equal(missingCsrf.status, 403);

const noSession = await fetch(`${baseUrl}/api/v1/auth/refresh/`, {
  method: 'POST',
  headers: { Cookie: cookie, 'X-CSRFToken': csrfBody.data.csrf_token, Origin: origin },
});
assert.equal(noSession.status, 401);
assert.equal((await noSession.json()).code, 'INVALID_REFRESH_SESSION');

for (const path of ['/api/v1/auth/me/', '/api/v1/admin/restaurants/']) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 401, path);
}

const invalidRegistration = await fetch(`${baseUrl}/api/v1/auth/register/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
assert.equal(invalidRegistration.status, 400);
assert.ok((await invalidRegistration.json()).email);

console.info('PASS: live CSRF, credentialed CORS, refresh rejection, protected routes and registration validation.');
