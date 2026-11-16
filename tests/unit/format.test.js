import test from 'node:test';
import assert from 'node:assert/strict';
import { compactNumber, formatDate, fromLocalInput, initials, isEmail, isHttpUrl, jobTypeLabel, salaryRange, timeAgo, titleCase, toLocalInput } from '../../src/lib/format.js';

test('formatDate returns "-" for empty or invalid input', () => {
  assert.equal(formatDate(null), '-');
  assert.equal(formatDate('not a date'), '-');
});
test('formatDate formats a valid ISO date', () => {
  assert.match(formatDate('2026-03-05T10:00:00Z'), /2026/);
  assert.match(formatDate('2026-03-05T10:00:00Z', true), /\d{2}:\d{2}/);
});
test('timeAgo buckets', () => {
  const now = new Date('2026-06-01T12:00:00Z').getTime();
  const ago = (s) => new Date(now - s * 1000).toISOString();
  assert.equal(timeAgo(ago(5), now), 'just now');
  assert.equal(timeAgo(ago(5 * 60), now), '5 min ago');
  assert.equal(timeAgo(ago(3 * 3600), now), '3 hr ago');
  assert.equal(timeAgo(ago(86400), now), '1 day ago');
  assert.equal(timeAgo(ago(3 * 86400), now), '3 days ago');
  assert.equal(timeAgo(ago(14 * 86400), now), '2 wk ago');
  assert.equal(timeAgo('', now), '');
});
test('compactNumber', () => {
  assert.equal(compactNumber(950), '950');
  assert.equal(compactNumber(1500), '1.5K');
});
test('salaryRange handles both, one or no bound', () => {
  assert.equal(salaryRange(null, null), '');
  assert.match(salaryRange(40000, 70000), /40.*-.*70/);
  assert.match(salaryRange(40000, null), /^From/);
  assert.match(salaryRange(null, 70000), /^Up to/);
});
test('jobTypeLabel / titleCase / initials', () => {
  assert.equal(jobTypeLabel('fulltime'), 'Full-time');
  assert.equal(jobTypeLabel('some_other'), 'Some Other');
  assert.equal(titleCase('under_review'), 'Under Review');
  assert.equal(initials('Priya Sharma'), 'PS');
  assert.equal(initials('Madonna'), 'M');
  assert.equal(initials('  '), '?');
});
test('isEmail / isHttpUrl validators', () => {
  assert.ok(isEmail('a@b.co'));
  assert.ok(!isEmail('a@b'));
  assert.ok(!isEmail('a b@c.com'));
  assert.ok(isHttpUrl('https://company.com/careers/1'));
  assert.ok(isHttpUrl('http://x.io'));
  assert.ok(!isHttpUrl('ftp://x.io'));
  assert.ok(!isHttpUrl('javascript:alert(1)'));
  assert.ok(!isHttpUrl('company.com'));
});
test('datetime-local helpers round-trip', () => {
  const iso = '2026-05-10T09:30:00.000Z';
  assert.equal(fromLocalInput(toLocalInput(iso)), iso);
  assert.equal(toLocalInput(''), '');
  assert.equal(fromLocalInput(''), null);
});
