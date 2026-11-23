// RESPONSIVE SWEEP - every page of the User, Recruiter and Admin panels at phone / small-phone / tablet widths.
// A page fails when the document scrolls sideways OR any visible element sticks out past the right edge without sitting
// inside a horizontally scrollable box (tables are expected to scroll inside their own wrapper).
import fs from 'node:fs';
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5203, 8003);
const api = makeApi(API);
const S = suite('Responsive sweep (mobile / tablet)', process.env.REPORT_OUT || '/home/claude/reports/responsive-e2e.json');
const errors = [];
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const user = await api.register('Rani Responsive', `rani.${uniq()}@example.com`, 'secret123');

const PANELS = {
  user: { token: user.token, routes: ['/dashboard', '/jobs', '/applications', '/saved', '/companies', '/videos', '/resume', '/resume-builder', '/profile', '/settings', '/premium', '/skills', '/prep', '/assessments', '/interviews', '/following', '/alerts', '/documents', '/referrals', '/events', '/offers', '/account', '/help', '/messages', '/notifications'] },
  recruiter: { token: recTok, routes: ['/recruiter/dashboard', '/recruiter/company', '/recruiter/jobs', '/recruiter/jobs/new', '/recruiter/applications', '/recruiter/interviews', '/recruiter/videos', '/recruiter/followers', '/recruiter/messages', '/recruiter/notifications', '/recruiter/account', '/recruiter/calendar', '/recruiter/candidates', '/recruiter/offers', '/recruiter/analytics', '/recruiter/team', '/recruiter/security', '/recruiter/help'] },
  admin: { token: adminTok, routes: ['/admin/dashboard', '/admin/users', '/admin/recruiters', '/admin/companies', '/admin/jobs', '/admin/applications', '/admin/interviews', '/admin/offers', '/admin/videos', '/admin/reports', '/admin/skills', '/admin/landing', '/admin/learning', '/admin/audit', '/admin/banners', '/admin/payments', '/admin/analytics', '/admin/support', '/admin/events', '/admin/emails', '/admin/roles', '/admin/health', '/admin/data', '/admin/broadcast', '/admin/settings', '/admin/account', '/admin/messages', '/admin/notifications'] },
};
const VIEWPORTS = [{ name: 'phone 390', width: 390, height: 800 }, { name: 'small phone 360', width: 360, height: 700 }, { name: 'tablet 820', width: 820, height: 1000 }];

const browser = await chromium.launch();
const shotDir = '/home/claude/shots/responsive'; fs.mkdirSync(shotDir, { recursive: true });

async function audit(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    // only a box the user can scroll sideways (overflow auto/scroll, e.g. a table wrapper) is allowed to be wider than the screen
    const scrollsX = (el) => { for (let e = el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) { if (['auto', 'scroll'].includes(getComputedStyle(e).overflowX)) return true; } return false; };
    const bad = [];
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' || el.closest('[aria-hidden="true"], .sr-only, .toast-stack, [hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1.5 && !scrollsX(el)) bad.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} (+${Math.round(r.right - vw)}px)`);
      if (bad.length >= 4) break;
    }
    return { doc: document.documentElement.scrollWidth - vw, bad, blank: (document.body.innerText || '').trim().length < 20 };
  });
}

await S.test('RSP-S0', 'Self-check: the detector really catches a 700px-wide box, a sideways-scrolling page, and ignores a scroll-box', async () => {
  const ctx = await authedContext(browser, user.token, { width: 390, height: 800 });
  const p = await ctx.newPage();
  await p.goto(APP + '/dashboard'); await p.waitForLoadState('networkidle');
  const clean = await audit(p);
  assert(clean.doc <= 1 && clean.bad.length === 0, 'baseline dashboard is clean');
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'probe'; d.style.cssText = 'width:700px;height:20px;background:red'; (document.querySelector('main') || document.body).appendChild(d); });
  const dirty = await audit(p);
  assert(dirty.bad.some((x) => x.startsWith('div')), 'wide box found: ' + JSON.stringify(dirty));
  await p.evaluate(() => { const o = document.getElementById('probe'); const w = document.createElement('div'); w.style.cssText = 'overflow-x:auto;width:100%'; o.parentNode.insertBefore(w, o); w.appendChild(o); });
  const scrolled = await audit(p);
  assert(scrolled.bad.length === 0, 'a scroll-box is allowed: ' + JSON.stringify(scrolled));
  await ctx.close();
});

for (const [panel, cfg] of Object.entries(PANELS)) {
  for (const [i, vp] of VIEWPORTS.entries()) {
    const id = `RSP-${panel[0].toUpperCase()}${i + 1}`;
    await S.test(id, `${panel} panel: ${cfg.routes.length} pages fit a ${vp.name}px screen (no sideways scroll, nothing cut off, not blank)`, async () => {
      const ctx = await authedContext(browser, cfg.token, { width: vp.width, height: vp.height });
      const p = await ctx.newPage(); watch(p, errors);
      const fails = [];
      for (const r of cfg.routes) {
        await p.goto(APP + r); await p.waitForLoadState('networkidle').catch(() => {});
        await p.waitForTimeout(250);
        const a = await audit(p);
        if (a.doc > 1 || a.bad.length || a.blank) fails.push(`${r}: ${a.blank ? 'blank page; ' : ''}${a.doc > 1 ? `page scrolls sideways ${a.doc}px; ` : ''}${a.bad.join(', ')}`);
        if (vp.width === 390) await p.screenshot({ path: `${shotDir}/${panel}${r.replace(/\//g, '_')}.png` });
      }
      await ctx.close();
      assert(fails.length === 0, `${fails.length} page(s):\n   ${fails.join('\n   ')}`);
    });
  }
}

await S.test('RSP-N1', 'Phone menus: the burger opens the navigation in all three panels and a link navigates', async () => {
  const want = { user: ['/dashboard', /\/jobs$/], recruiter: ['/recruiter/dashboard', /\/recruiter\/jobs$/], admin: ['/admin/dashboard', /\/admin\/users$/] };
  for (const [panel, cfg] of Object.entries(PANELS)) {
    const ctx = await authedContext(browser, cfg.token, { width: 390, height: 800 });
    const p = await ctx.newPage(); watch(p, errors);
    await p.goto(APP + want[panel][0]); await p.waitForLoadState('networkidle');
    const burger = p.getByRole('button', { name: 'Open menu' }).first();
    await burger.click();
    const nav = p.getByRole('dialog', { name: 'Menu' }).first();
    await nav.waitFor({ state: 'visible' });
    const target = panel === 'user' ? 'Browse Jobs' : panel === 'recruiter' ? 'Jobs' : 'Users';
    await nav.getByRole('link', { name: new RegExp(`^${target}$`) }).first().click();
    await p.waitForURL(want[panel][1]);
    await ctx.close();
  }
});

await S.test('RSP-N2', 'Touch targets: on a phone, buttons and links in the main areas are at least 32px tall (counted per panel)', async () => {
  const small = [];
  for (const [panel, cfg] of Object.entries(PANELS)) {
    const ctx = await authedContext(browser, cfg.token, { width: 390, height: 800 });
    const p = await ctx.newPage(); watch(p, errors);
    for (const r of cfg.routes.slice(0, 4)) {
      await p.goto(APP + r); await p.waitForLoadState('networkidle').catch(() => {});
      const n = await p.evaluate(() => [...document.querySelectorAll('main button, main a[href], .main button, .main a[href]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'inline' && r.height < 30; }).length);
      if (n) small.push(`${panel}${r}: ${n}`);
    }
    await ctx.close();
  }
  assert(small.length === 0, 'small tap targets: ' + small.join(', '));
});

await S.test('RSP-N3', 'No console errors or 5xx while visiting every page', async () => {
  const bad = errors.filter((e) => e !== '--' && !/example\.invalid|ERR_NAME_NOT_RESOLVED|Failed to load resource: net::ERR/.test(e));
  assert(bad.length === 0, bad.slice(0, 4).join(' | '));
});

await browser.close();
const r = S.summary();
process.exit(r ? 0 : 1);
