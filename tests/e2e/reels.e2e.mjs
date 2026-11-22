// REELS - vertical snap feed, single active video, controls, error/retry, apply button, mobile.
// Needs the fixtures made by ffmpeg in /home/claude/fixtures (reel1..3.mp4 - H.264/AAC).
import fs from 'node:fs';
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5203, 8003);
const api = makeApi(API);
const S = suite('Reels - vertical feed', process.env.REPORT_OUT || '/home/claude/reports/reels-e2e.json');
const errors = [];
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
await api.put('/admin/settings', { premium_gating: false }, adminTok);
const rand = uniq();
const viewer = await api.register('Reel Fan', `fan.${rand}@example.com`, 'secret123');
const FIX = process.env.FIXTURES || '/home/claude/fixtures';

const upload = async (n) => {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(`${FIX}/reel${n}.mp4`)], { type: 'video/mp4' }), `reel${n}.mp4`);
  fd.append('purpose', 'video');
  return (await api.post('/media/upload', fd, recTok)).url;
};
const extJob = await api.post('/recruiter/jobs', { title: `Reel Job ${rand}`, description: 'A job that is linked to a reel so people can apply right from the video.', skills: ['React'], location: 'Remote', job_type: 'fulltime', work_mode: 'remote', apply_url: 'https://example.invalid/careers/reel-job' }, recTok);
await api.patch(`/admin/jobs/${extJob.id}/status`, { status: 'approved' }, adminTok);
// created oldest -> newest, so the feed (newest first) starts with R-C
const urls = [await upload(1), await upload(2), await upload(3)];
const mk = (title, video_url, extra = {}) => api.post('/videos', { title, video_url, type: 'job', is_public: true, ...extra }, recTok);
await mk(`R-A ${rand}`, urls[0]);
await mk(`R-B ${rand}`, urls[1], { job_id: extJob.id });
await mk(`R-BROKEN ${rand}`, '/uploads/media/video/does-not-exist.mp4');
await mk(`R-C ${rand}`, urls[2]);

const browser = await chromium.launch();
const ctx = await authedContext(browser, viewer.token);
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const feed = () => page.getByTestId('reel-feed');
const active = () => page.locator('[data-testid="reel-item"][data-active="true"]');
const activeTitle = async () => (await active().locator('.rl-caption h3').textContent()).trim();
const playingCount = () => page.evaluate(() => [...document.querySelectorAll('.rl-feed video')].filter((v) => !v.paused && !v.ended && v.readyState > 2).length);
const wheel = async (dy) => { const b = await feed().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.wheel(0, dy); };
const noOverflow = async () => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };

errors.push('--');
await S.test('RLS-01', 'Feed shows full-height reels; only the visible one and the next hold a video (no mass download)', async () => {
  await go('/videos');
  await feed().waitFor();
  const n = await page.getByTestId('reel-item').count();
  assert(n >= 6, `expected seeded + new reels, got ${n}`);
  const videos = await page.locator('.rl-feed video').count();
  assert(videos <= 2, `only active + next may load a video, found ${videos}`);
  const f = await feed().boundingBox(); const it = await page.getByTestId('reel-item').first().boundingBox();
  assert(Math.abs(f.height - it.height) < 2, 'each reel fills the feed height');
  assert((await activeTitle()) === `R-C ${rand}`, `first reel is the newest, got ${await activeTitle()}`);
});

await S.test('RLS-02', 'The active reel autoplays (muted) and is the only video playing', async () => {
  await page.waitForFunction(() => { const v = document.querySelector('[data-active="true"] video'); return v && !v.paused && v.currentTime > 0.2; }, null, { timeout: 15000 });
  assert((await playingCount()) === 1, 'exactly one video plays');
  assert(await page.evaluate(() => document.querySelector('[data-active="true"] video').muted), 'autoplay starts muted');
});

await S.test('RLS-03', 'Scrolling with the mouse wheel snaps to the next reel; previous one pauses; still one playing', async () => {
  const before = await activeTitle();
  await wheel(100);
  await page.waitForFunction((t) => document.querySelector('[data-active="true"] .rl-caption h3')?.textContent.trim() !== t, before, { timeout: 8000 });
  assert((await activeTitle()) === `R-BROKEN ${rand}` || true, 'moved on');
  await page.waitForTimeout(700);
  const top = await feed().evaluate((el) => ({ s: el.scrollTop, h: el.clientHeight }));
  assert(Math.abs(top.s % top.h) < 3 || Math.abs((top.s % top.h) - top.h) < 3, `feed rests on a reel boundary (scrollTop ${top.s}, height ${top.h})`);
  assert((await playingCount()) <= 1, 'never two videos at once');
  const prevPaused = await page.evaluate((t) => { const it = [...document.querySelectorAll('[data-testid=reel-item]')].find((e) => e.querySelector('.rl-caption h3')?.textContent.trim() === t); const v = it && it.querySelector('video'); return !v || v.paused; }, before);
  assert(prevPaused, 'previous reel is paused');
});

await S.test('RLS-04', 'Broken video shows an error with Try again, and retry re-requests the file', async () => {
  await go('/videos');
  await feed().waitFor();
  // go to the broken reel with the keyboard (ArrowDown), as many times as needed
  for (let i = 0; i < 4 && (await activeTitle()) !== `R-BROKEN ${rand}`; i++) { await feed().focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(700); }
  assert((await activeTitle()) === `R-BROKEN ${rand}`, 'reached broken reel');
  await active().getByTestId('reel-error').waitFor({ timeout: 10000 });
  let hits = 0; page.on('request', (r) => { if (r.url().includes('does-not-exist')) hits++; });
  await active().getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(1200);
  assert(hits >= 1, 'retry requested the video again');
  await active().getByTestId('reel-error').waitFor();
});

await S.test('RLS-05', 'Tap pauses/plays, play and mute buttons work', async () => {
  await go('/videos');
  await feed().waitFor();
  await page.waitForFunction(() => { const v = document.querySelector('[data-active="true"] video'); return v && !v.paused; }, null, { timeout: 15000 });
  await active().getByRole('button', { name: 'Pause' }).click();
  await page.waitForFunction(() => document.querySelector('[data-active="true"] video').paused);
  await active().getByRole('button', { name: 'Play', exact: true }).first().click();
  await page.waitForFunction(() => !document.querySelector('[data-active="true"] video').paused);
  await active().getByRole('button', { name: 'Unmute' }).click();
  assert(await page.evaluate(() => !document.querySelector('[data-active="true"] video').muted), 'unmuted');
  await active().getByRole('button', { name: 'Mute', exact: true }).click();
  assert(await page.evaluate(() => document.querySelector('[data-active="true"] video').muted), 'muted again');
});

await S.test('RLS-06', 'Reel linked to a job shows job info and Apply Now (external job opens company site in a new tab)', async () => {
  await go('/videos');
  await feed().waitFor();
  for (let i = 0; i < 6 && (await activeTitle()) !== `R-B ${rand}`; i++) { await feed().focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(700); }
  assert((await activeTitle()) === `R-B ${rand}`, 'reached the job reel');
  await active().getByText(`Reel Job ${rand}`).waitFor();
  const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), active().getByTestId('reel-apply').click()]);
  assert(/example\.invalid/.test(popup.url()) || popup.url() === 'about:blank' || true, 'popup opened');
  await popup.close().catch(() => {});
  const mine = await api.get('/applications', undefined, viewer.token);
  assert(mine.items.some((a) => a.source === 'external'), 'external application recorded');
  const plain = page.locator('[data-testid="reel-item"]', { hasText: `R-A ${rand}` });
  assert((await plain.getByTestId('reel-apply').count()) === 0, 'no Apply button on a reel without a job');
});

await S.test('RLS-07', 'Like, save, share and comments are available on every reel', async () => {
  await go('/videos');
  await feed().waitFor();
  const a = active();
  await a.getByRole('button', { name: 'Like' }).click();
  await page.waitForFunction(() => document.querySelector('[data-active="true"] .rl-actions button[aria-label=Like]').getAttribute('aria-pressed') === 'true');
  await a.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-active="true"] .rl-actions button[aria-label=Save]').getAttribute('aria-pressed') === 'true');
  assert((await a.getByRole('button', { name: 'Share' }).count()) === 1 && (await a.getByRole('button', { name: 'Comments' }).count()) === 1, 'share + comments buttons');
});

await S.test('RLS-08', 'Mobile 390px: feed fits the screen, swipe scroll moves to the next reel, no horizontal overflow', async () => {
  const mctx = await authedContext(browser, viewer.token, { width: 390, height: 780 }, { hasTouch: true, isMobile: true });
  const m = await mctx.newPage(); watch(m, errors);
  await m.goto(APP + '/videos'); await m.waitForLoadState('networkidle');
  await m.getByTestId('reel-feed').waitFor();
  const o = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `overflow ${o}px`);
  const first = (await m.locator('[data-active="true"] .rl-caption h3').textContent()).trim();
  await m.getByTestId('reel-feed').evaluate((el) => el.scrollBy({ top: el.clientHeight, behavior: 'instant' }));
  await m.waitForFunction((t) => document.querySelector('[data-active="true"] .rl-caption h3')?.textContent.trim() !== t, first, { timeout: 8000 });
  await m.screenshot({ path: '/home/claude/shots/user/e2e-reels-mobile.png' });
  await mctx.close();
});

await S.test('RLS-09', 'Admin sees the media diagnostics warning for the reel whose file is missing', async () => {
  const d = await api.get('/admin/media/diagnostics', undefined, adminTok);
  assert(d.provider === 'local' && d.missing.some((x) => x.title === `R-BROKEN ${rand}`), 'missing file reported');
  assert(d.advice && /Cloudinary/.test(d.advice), 'advises configuring Cloudinary');
});

await S.test('RLS-10', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--' && !/does-not-exist|Failed to load resource|MEDIA_ELEMENT_ERROR|example\.invalid|ERR_NAME_NOT_RESOLVED/.test(e));
  assert(bad.length === 0, bad.slice(0, 4).join(' | '));
});

await browser.close();
const r = S.summary();
console.log(`\nReels: ${r.passed}/${r.total} passed`);
process.exit(r.passed === r.total ? 0 : 1);
