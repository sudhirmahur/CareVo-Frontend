import test from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, assetUrl, buildQuery, errorMessage, setUnauthorizedHandler, tokenStore } from '../../src/lib/api.js';

const json = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
const mock = (fn) => { globalThis.fetch = async (...a) => fn(...a); };
test.afterEach(() => { tokenStore.clear(); setUnauthorizedHandler(null); });

test('buildQuery skips empty values and encodes the rest', () => {
  assert.equal(buildQuery({}), '');
  assert.equal(buildQuery({ q: 'react dev', page: 2, x: '', y: null, z: undefined, f: false }), '?q=react+dev&page=2');
});
test('sends bearer token and JSON body; parses the response', async () => {
  tokenStore.set('tok123');
  let seen;
  mock((url, init) => { seen = { url, init }; return json(200, { ok: true }); });
  const r = await api.post('/jobs/1/apply', { cover_letter: 'hi' });
  assert.deepEqual(r, { ok: true });
  assert.equal(seen.url, 'http://api.test/api/jobs/1/apply');
  assert.equal(seen.init.headers.Authorization, 'Bearer tok123');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.equal(seen.init.body, JSON.stringify({ cover_letter: 'hi' }));
});
test('GET puts params in the query string, no token header when signed out', async () => {
  let seen;
  mock((url, init) => { seen = { url, init }; return json(200, []); });
  await api.get('/jobs', { q: 'python', page: 1 });
  assert.equal(seen.url, 'http://api.test/api/jobs?q=python&page=1');
  assert.equal(seen.init.headers.Authorization, undefined);
});
test('server error detail becomes ApiError.message with status', async () => {
  mock(() => json(400, { detail: 'Email already registered' }));
  await assert.rejects(() => api.post('/auth/register', {}), (e) => e instanceof ApiError && e.status === 400 && e.message === 'Email already registered');
});
test('validation (array) detail is flattened to readable text', async () => {
  mock(() => json(422, { detail: [{ msg: 'Field required' }, { msg: 'Too short' }] }));
  await assert.rejects(() => api.post('/x', {}), (e) => e.message === 'Field required; Too short');
});
test('network failure gives a friendly message with status 0', async () => {
  mock(() => { throw new TypeError('fetch failed'); });
  await assert.rejects(() => api.get('/jobs'), (e) => e.status === 0 && /Cannot reach the server/.test(e.message));
});
test('401 with a stored token triggers the unauthorized handler (session expired)', async () => {
  tokenStore.set('old');
  let msg = null;
  setUnauthorizedHandler((m) => { msg = m; });
  mock(() => json(401, { detail: 'Invalid or expired token' }));
  await assert.rejects(() => api.get('/auth/me'));
  assert.equal(msg, 'Invalid or expired token');
});
test('403 "blocked" triggers the handler; plain 403 does not', async () => {
  tokenStore.set('t');
  let calls = 0;
  setUnauthorizedHandler(() => { calls += 1; });
  mock(() => json(403, { detail: 'Account is blocked or inactive' }));
  await assert.rejects(() => api.get('/auth/me'));
  assert.equal(calls, 1);
  mock(() => json(403, { detail: 'Admin access required' }));
  await assert.rejects(() => api.get('/admin/users'));
  assert.equal(calls, 1);
});
test('wrong login (401, no token) does not trigger the handler', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => { calls += 1; });
  mock(() => json(401, { detail: 'Invalid email or password' }));
  await assert.rejects(() => api.post('/auth/login', {}, { auth: false }));
  assert.equal(calls, 0);
});
test('apply response shape is passed through untouched (redirect_url, already_applied)', async () => {
  const body = { already_applied: false, application_id: 'a1', status: 'applied', redirect_url: 'https://company.com/j/1', source: 'external' };
  mock(() => json(200, body));
  assert.deepEqual(await api.post('/jobs/1/apply'), body);
});
test('errorMessage + assetUrl helpers', () => {
  assert.equal(errorMessage(null), 'Something went wrong. Please try again.');
  assert.equal(errorMessage(new Error('boom')), 'boom');
  assert.equal(assetUrl('https://cdn.x/y.png'), 'https://cdn.x/y.png');
  assert.equal(assetUrl('/uploads/a.pdf'), 'http://api.test/uploads/a.pdf');
});
