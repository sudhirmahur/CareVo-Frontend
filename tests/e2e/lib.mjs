// Shared helpers for the Playwright end-to-end suites.
//   Needs: `npm i -D playwright` (set PW_PATH to a node_modules dir if installed elsewhere).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire((process.env.PW_PATH || process.cwd() + '/node_modules') + '/');
export const { chromium } = req('playwright');

export const URLS = (appPort, apiPort) => ({
  APP: process.env.APP_URL || `http://127.0.0.1:${appPort}`,
  API: process.env.API_URL || `http://127.0.0.1:${apiPort}/api`,
});

export async function call(API, method, url, body, token) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + url, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

export function makeApi(API) {
  const f = (m) => async (url, body, token) => {
    const r = await call(API, m, url, body, token);
    if (r.status >= 400) throw new Error(`${m} ${url} -> ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  };
  return {
    get: f('GET'), post: f('POST'), put: f('PUT'), patch: f('PATCH'), del: f('DELETE'),
    raw: (m, u, b, t) => call(API, m, u, b, t),
    async login(email, password) { return (await f('POST')('/auth/login', { email, password })).access_token; },
    async register(name, email, password, role = 'user') { const r = await f('POST')('/auth/register', { name, email, password, role }); return { token: r.access_token, user: r.user }; },
  };
}

export function suite(name, outFile) {
  const cases = [];
  return {
    cases,
    async test(id, title, fn) {
      const t0 = Date.now();
      try {
        const details = await fn();
        cases.push({ id, title, passed: true, details: typeof details === 'string' ? details : '', ms: Date.now() - t0 });
        console.log(`PASS ${id} ${title}`);
      } catch (e) {
        cases.push({ id, title, passed: false, details: String(e && e.message ? e.message : e).slice(0, 600), ms: Date.now() - t0 });
        console.log(`FAIL ${id} ${title}\n     ${String(e && e.message ? e.message : e).split('\n')[0]}`);
      }
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify({ suite: name, generated: new Date().toISOString(), cases }, null, 2));
    },
    summary() {
      const p = cases.filter((c) => c.passed).length;
      console.log(`\n${name}: ${p}/${cases.length} passed`);
      return p === cases.length;
    },
  };
}

export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

/** New browser context already signed in (token injected into localStorage). */
export async function authedContext(browser, token, viewport = { width: 1280, height: 800 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra });
  await ctx.addInitScript((t) => { try { localStorage.setItem('carevo_token', t); } catch {} }, token);
  return ctx;
}

/** Watches a page for console errors / failed requests / 5xx and collects them. */
export function watch(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource.*(401|403|404|409|422|400|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET)/.test(m.text())) bucket.push('console: ' + m.text()); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 500) bucket.push(`http ${r.status()} ${r.url()}`); });
}

export const uniq = () => Math.random().toString(36).slice(2, 8);

export function docxBytes(text) {
  // minimal valid .docx (zip with word/document.xml) built by hand (stored, no compression)
  const enc = new TextEncoder();
  const name = enc.encode('word/document.xml');
  const xml = enc.encode(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${text.split('\n').map((l) => `<w:p><w:r><w:t>${l}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  const crc = (buf) => { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; };
  const u16 = (n) => [n & 255, (n >> 8) & 255]; const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  const c = crc(xml);
  const local = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(c), ...u32(xml.length), ...u32(xml.length), ...u16(name.length), ...u16(0), ...name, ...xml];
  const central = [0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(c), ...u32(xml.length), ...u32(xml.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...name];
  const end = [0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(1), ...u16(1), ...u32(central.length), ...u32(local.length), ...u16(0)];
  return Buffer.from([...local, ...central, ...end]);
}
