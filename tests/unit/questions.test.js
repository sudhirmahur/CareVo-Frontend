import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAnswers, validateAnswers } from '../../src/lib/questions.js';
import { playbackSrc } from '../../src/lib/media.js';

const Q = [
  { id: 'a', type: 'text', question: 'Why?', required: true },
  { id: 'b', type: 'multiple', question: 'Tools', options: ['Git', 'Docker'], required: true },
  { id: 'c', type: 'number', question: 'Salary', required: false },
  { id: 'd', type: 'email', question: 'Ref', required: false },
  { id: 'e', type: 'file', question: 'Portfolio', required: true },
];

test('required questions are enforced, optional ones may stay empty', () => {
  const e = validateAnswers(Q, {});
  assert.deepEqual(Object.keys(e).sort(), ['a', 'b', 'e']);
  assert.deepEqual(validateAnswers(Q, { a: 'x', b: ['Git'], e: 'fileid' }), {});
});
test('whitespace-only and empty multi-select count as unanswered', () => {
  const e = validateAnswers(Q, { a: '   ', b: [], e: 'f' });
  assert.ok(e.a && e.b && !e.e);
});
test('number and e-mail answers are validated when given', () => {
  const e = validateAnswers(Q, { a: 'x', b: ['Git'], e: 'f', c: 'abc', d: 'nope' });
  assert.equal(e.c, 'Enter a valid number');
  assert.equal(e.d, 'Enter a valid e-mail address');
  assert.deepEqual(validateAnswers(Q, { a: 'x', b: ['Git'], e: 'f', c: '12.5', d: 'me@x.co' }), {});
  assert.ok(validateAnswers(Q, { a: 'x', b: ['Git'], e: 'f', c: 'Infinity' }).c);
});
test('required:false is respected and missing flag defaults to required', () => {
  assert.ok(validateAnswers([{ id: 'z', type: 'text', question: 'Q' }], {}).z);
  assert.deepEqual(validateAnswers([{ id: 'z', type: 'text', question: 'Q', required: false }], {}), {});
});
test('cleanAnswers drops empty values but keeps lists and text', () => {
  assert.deepEqual(cleanAnswers({ a: ' ', b: [], c: 'ok', d: ['x'] }), { c: 'ok', d: ['x'] });
});
test('playbackSrc prefers the transcoded URL and makes upload paths absolute', () => {
  assert.match(playbackSrc({ video_url: '/uploads/media/video/a.mp4' }), /\/uploads\/media\/video\/a\.mp4$/);
  assert.equal(playbackSrc({ video_url: 'https://x/a.mov', playback_url: 'https://x/a.mp4' }), 'https://x/a.mp4');
});
