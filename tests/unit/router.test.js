import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPath } from '../../src/lib/router.jsx';

test('static paths match exactly (trailing slash ignored)', () => {
  assert.deepEqual(matchPath('/jobs', '/jobs'), {});
  assert.deepEqual(matchPath('/jobs', '/jobs/'), {});
  assert.equal(matchPath('/jobs', '/jobs/12'), null);
  assert.equal(matchPath('/jobs', '/job'), null);
});
test('params are extracted and decoded', () => {
  assert.deepEqual(matchPath('/jobs/:id', '/jobs/abc123'), { id: 'abc123' });
  assert.deepEqual(matchPath('/recruiter/jobs/:id/edit', '/recruiter/jobs/9/edit'), { id: '9' });
  assert.deepEqual(matchPath('/companies/:id', '/companies/a%20b'), { id: 'a b' });
});
test('malformed encoding does not throw', () => {
  assert.equal(matchPath('/jobs/:id', '/jobs/%E0%A4%A'), null);
});
test('wildcard matches the base and everything below', () => {
  assert.deepEqual(matchPath('/admin/*', '/admin'), { '*': '/' });
  assert.deepEqual(matchPath('/admin/*', '/admin/users/3'), { '*': '/users/3' });
  assert.equal(matchPath('/admin/*', '/administrator'), null);
});
test('root', () => {
  assert.deepEqual(matchPath('/', '/'), {});
});
