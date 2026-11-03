import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { apiClient, onSessionExpired, refreshAccessToken, tokenStore } from '../src/api/client.js';
import { authApi } from '../src/api/authApi.js';
import { endpoints } from '../src/api/endpoints.js';

function respond(config, data, status = 200) {
  return { config, data, status, statusText: '', headers: {} };
}

function unauthorized(config) {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null,
    respond(config, { detail: 'Session expired.' }, 401));
}

test('real session transport', async (t) => {
  const originalAdapter = apiClient.defaults.adapter;
  t.after(() => { apiClient.defaults.adapter = originalAdapter; tokenStore.clear(); });

  await t.test('concurrent bootstrap sends one CSRF and refresh, then authenticated me', async () => {
    tokenStore.clear();
    const calls = [];
    apiClient.defaults.adapter = async (config) => {
      calls.push(config.url);
      if (config.url === endpoints.auth.csrf) return respond(config, { data: { csrf_token: 'csrf-test' } });
      if (config.url === endpoints.auth.refresh) {
        assert.equal(config.headers['X-CSRFToken'], 'csrf-test');
        assert.equal(config.withCredentials, true);
        return respond(config, { data: { access_token: 'restored-token' } });
      }
      assert.equal(config.url, endpoints.auth.me);
      assert.equal(config.headers.Authorization, 'Bearer restored-token');
      return respond(config, { data: { user: { role: 'OWNER' }, restaurant: { status: 'PENDING' } } });
    };
    const [first, second] = await Promise.all([authApi.restoreSession(), authApi.restoreSession()]);
    assert.deepEqual(first, second);
    assert.equal(first.restaurant.status, 'PENDING');
    assert.deepEqual(calls, [endpoints.auth.csrf, endpoints.auth.refresh, endpoints.auth.me]);
  });

  await t.test('parallel 401 reads share refresh and retry once', async () => {
    tokenStore.set('expired');
    let refreshes = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === endpoints.auth.refresh) {
        refreshes += 1;
        return respond(config, { data: { access_token: 'fresh' } });
      }
      if (config.headers.Authorization === 'Bearer expired') throw unauthorized(config);
      assert.equal(config.headers.Authorization, 'Bearer fresh');
      return respond(config, { data: {} });
    };
    await Promise.all([apiClient.get('/read-one/'), apiClient.get('/read-two/')]);
    assert.equal(refreshes, 1);
  });

  await t.test('unauthorized writes and ambiguous network failures are never replayed', async () => {
    tokenStore.set('expired');
    let writes = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === endpoints.auth.refresh) return respond(config, { data: { access_token: 'fresh' } });
      writes += 1;
      throw unauthorized(config);
    };
    await assert.rejects(apiClient.post('/approve/'));
    assert.equal(writes, 1);
    apiClient.defaults.adapter = async () => { writes += 1; throw new Error('Network Error'); };
    await assert.rejects(apiClient.post('/approve/'));
    assert.equal(writes, 2);
  });

  await t.test('logout sends bearer and CSRF and handles empty 204 before clearing token', async () => {
    tokenStore.set('old');
    apiClient.defaults.adapter = async (config) => {
      if (config.url === endpoints.auth.refresh) return respond(config, { data: { access_token: 'logout-token' } });
      assert.equal(config.url, endpoints.auth.logout);
      assert.equal(config.headers.Authorization, 'Bearer logout-token');
      assert.equal(config.headers['X-CSRFToken'], 'csrf-test');
      assert.equal(tokenStore.get(), 'logout-token');
      return respond(config, '', 204);
    };
    await authApi.logout();
    assert.equal(tokenStore.get(), null);
  });

  await t.test('failed logout preserves token and rejected refresh clears session', async () => {
    let expiredEvents = 0;
    const unsubscribe = onSessionExpired(() => { expiredEvents += 1; });
    tokenStore.set('old');
    apiClient.defaults.adapter = async (config) => {
      if (config.url === endpoints.auth.refresh) return respond(config, { data: { access_token: 'retained' } });
      throw new Error('Network Error');
    };
    await assert.rejects(authApi.logoutAll());
    assert.equal(tokenStore.get(), 'retained');
    apiClient.defaults.adapter = async (config) => { throw unauthorized(config); };
    await assert.rejects(refreshAccessToken());
    assert.equal(tokenStore.get(), null);
    assert.equal(expiredEvents, 1);
    unsubscribe();
  });

  await t.test('late refresh cannot undo cross-tab session clearing', async () => {
    let finishRefresh;
    let refreshStarted;
    const started = new Promise((resolve) => { refreshStarted = resolve; });
    apiClient.defaults.adapter = (config) => new Promise((resolve) => {
      finishRefresh = () => resolve(respond(config, { data: { access_token: 'late' } }));
      refreshStarted();
    });
    const refresh = refreshAccessToken();
    await started;
    tokenStore.clear();
    finishRefresh();
    await assert.rejects(refresh, /Session changed/);
    assert.equal(tokenStore.get(), null);
  });
  await t.test('a second unauthorized read ends the session without a refresh loop', async () => {
    tokenStore.set('expired');
    let reads = 0;
    let refreshes = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === endpoints.auth.refresh) {
        refreshes += 1;
        return respond(config, { data: { access_token: 'still-invalid' } });
      }
      reads += 1;
      throw unauthorized(config);
    };
    await assert.rejects(apiClient.get('/protected/'));
    assert.equal(reads, 2);
    assert.equal(refreshes, 1);
    assert.equal(tokenStore.get(), null);
  });

  await t.test('an old rejected refresh cannot clear a newer login', async () => {
    let rejectRefresh;
    let markStarted;
    const started = new Promise((resolve) => { markStarted = resolve; });
    apiClient.defaults.adapter = (config) => new Promise((resolve, reject) => {
      rejectRefresh = () => reject(unauthorized(config));
      markStarted();
    });
    const oldRefresh = refreshAccessToken();
    await started;
    tokenStore.start('new-login');
    rejectRefresh();
    await assert.rejects(oldRefresh);
    assert.equal(tokenStore.get(), 'new-login');
  });});
