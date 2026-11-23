import test from 'node:test';
import assert from 'node:assert/strict';
import { directUpload } from '../../src/lib/directUpload.js';
import { uploadMedia } from '../../src/lib/api.js';

const file = { name: 'a.mp4', size: 10 };
const ticket = { direct: true, upload_url: 'https://api.cloudinary.com/v1_1/c/video/upload', fields: { public_id: 'carevo/video/u1/x', timestamp: '1', api_key: 'k', signature: 's', allowed_formats: 'mp4,mov,webm' } };

test('no direct upload when the server says direct=false (nothing is sent anywhere)', async () => {
  let sent = false;
  const r = await directUpload({ file, getTicket: async () => ({ direct: false }), complete: async () => 1, send: async () => { sent = true; } });
  assert.equal(r, null); assert.equal(sent, false);
});

test('signed fields first, file LAST, progress reported, then registered with our API', async () => {
  const calls = []; const pcts = [];
  const r = await directUpload({
    file, onProgress: (p) => pcts.push(p), getTicket: async () => ticket,
    send: async (url, form, onProgress) => { calls.push([url, [...form.keys()]]); onProgress(50); onProgress(100); return { secure_url: 'https://res.cloudinary.com/c/video/upload/v1/carevo/video/u1/x.mp4' }; },
    complete: async (u) => ({ url: u }),
  });
  assert.equal(calls[0][0], ticket.upload_url);
  assert.deepEqual(calls[0][1], ['public_id', 'timestamp', 'api_key', 'signature', 'allowed_formats', 'file']);
  assert.deepEqual(pcts, [50, 100]);
  assert.equal(r.url, 'https://res.cloudinary.com/c/video/upload/v1/carevo/video/u1/x.mp4');
});

test('an answer without an https url is rejected and nothing is registered', async () => {
  let done = false;
  await assert.rejects(directUpload({ file, getTicket: async () => ticket, send: async () => ({ secure_url: 'http://evil.example/x.mp4' }), complete: async () => { done = true; } }), /unexpected answer/);
  assert.equal(done, false);
});

// ---- the real uploadMedia wiring, with fake fetch + XMLHttpRequest
function fakeNet({ ticketStatus = 200, ticketBody = ticket } = {}) {
  const log = [];
  globalThis.fetch = async (url, opts) => {
    log.push(['fetch', opts.method, String(url).replace(/^https?:\/\/[^/]+\/api/, '')]);
    const path = String(url);
    let status = 200; let body = {};
    if (path.endsWith('/media/direct-upload/ticket')) { status = ticketStatus; body = ticketStatus === 200 ? ticketBody : { detail: 'nope' }; }
    else if (path.endsWith('/media/direct-upload/complete')) body = { url: JSON.parse(opts.body).url };
    else if (path.endsWith('/media/upload')) body = { url: '/uploads/media/video/local.mp4' };
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  };
  globalThis.XMLHttpRequest = class {
    constructor() { this.upload = {}; }
    open(m, u) { log.push(['xhr', m, u]); this.u = u; }
    send(form) { this.hasAuth = false; setTimeout(() => { this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 }); this.status = 200; this.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/c/video/upload/v1/carevo/video/u1/y.mp4' }); this.onload(); }, 0); }
  };
  return log;
}
globalThis.FormData = globalThis.FormData || class {};

test('uploadMedia(video): ticket -> straight to Cloudinary -> complete (the file never goes through our API)', async () => {
  const log = fakeNet(); const pcts = [];
  const r = await uploadMedia(file, 'video', { onProgress: (p) => pcts.push(p) });
  assert.deepEqual(log.map((l) => l[0] + ' ' + l[2]), ['fetch /media/direct-upload/ticket', `xhr ${ticket.upload_url}`, 'fetch /media/direct-upload/complete']);
  assert.equal(r.url, 'https://res.cloudinary.com/c/video/upload/v1/carevo/video/u1/y.mp4'); assert.deepEqual(pcts, [50]);
});

test('uploadMedia(video) falls back to the normal upload when direct upload is off or not allowed', async () => {
  let log = fakeNet({ ticketBody: { direct: false } });
  assert.equal((await uploadMedia(file, 'video')).url, '/uploads/media/video/local.mp4');
  assert.deepEqual(log.map((l) => l[2]), ['/media/direct-upload/ticket', '/media/upload']);
  log = fakeNet({ ticketStatus: 403 });
  assert.equal((await uploadMedia(file, 'video')).url, '/uploads/media/video/local.mp4');
});

test('uploadMedia(video) shows real errors (e.g. upload limit) instead of silently retrying', async () => {
  fakeNet({ ticketStatus: 429 });
  await assert.rejects(uploadMedia(file, 'video'), (e) => e.status === 429);
});

test('images never ask for a direct-upload ticket', async () => {
  const log = fakeNet();
  await uploadMedia(file, 'avatar');
  assert.deepEqual(log.map((l) => l[2]), ['/media/upload']);
});
