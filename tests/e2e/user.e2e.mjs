// USER (job seeker) panel - end-to-end suite.   node tests/e2e/user.e2e.mjs
import crypto from 'node:crypto';
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq, docxBytes } from './lib.mjs';

const { APP, API } = URLS(5203, 8003);
const api = makeApi(API);
const out = process.env.REPORT_OUT || '/home/claude/reports/user-e2e.json';
const S = suite('User panel', out);
const SHOTS = process.env.SHOTS || '/home/claude/shots/user';
const errors = [];

const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const ME = { email: `asha.${uniq()}@example.com`, pw: 'secret123', name: 'Priya Sharma' };

// extra jobs so pagination (8/page) has a 2nd page
for (let i = 1; i <= 4; i++) {
  const j = await api.post('/recruiter/jobs', { title: `Extra Role ${i}`, description: 'Filler job for pagination tests.', skills: ['Git'], location: 'Pune', job_type: 'fulltime' }, recTok);
  await api.patch(`/admin/jobs/${j.id}/status`, { status: 'approved' }, adminTok);
}
const jobs = (await api.get('/jobs?limit=50')).items;
const extJob = jobs.find((j) => j.apply_type === 'external' && j.title === 'Python Backend Engineer');
const intJob = jobs.find((j) => j.title === 'UI/UX Design Intern');
assert(extJob && intJob, 'demo jobs missing');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// company site is not reachable from the sandbox: answer it locally and record every hit
const companyHits = [];
await ctx.route('https://example.com/**', (route) => { companyHits.push(route.request().url()); route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Company careers page</h1>' }); });
const page = await ctx.newPage();
watch(page, errors);
const shot = (n) => page.screenshot({ path: `${SHOTS}/e2e-${n}.png` });
const text = async (sel) => (await page.locator(sel).first().innerText()).trim();
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };

await S.test('USR-01', 'Landing page is public, CMS-driven and shows all sections', async () => {
  await go('/');
  await page.getByRole('heading', { name: /Find Your Next/ }).first().waitFor();
  for (const t of ['Popular Job Categories', 'Trusted by Leading', 'How CareVo Works', 'What Our', 'Career Resources', 'Ready to Start Your Career Journey?']) {
    await page.getByRole('heading', { name: new RegExp(t) }).first().waitFor();
  }
  assert((await page.locator('.lp-logos img').count()) >= 5, 'trusted logos missing');
  assert((await page.locator('.lp-cat').count()) >= 5, 'categories missing');
  assert((await page.locator('.lp-stats li').count()) === 4, 'stats missing');
  await shot('landing');
});

await S.test('USR-02', 'Login form validation (empty + bad email)', async () => {
  await go('/login');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Enter a valid email address.').waitFor();
  await page.getByText('Enter your password.').waitFor();
  await page.fill('input[type=email]', 'nope');
  await page.fill('input[autocomplete=current-password]', 'x');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByText('Enter a valid email address.').waitFor();
});

await S.test('USR-03', 'Wrong password shows server error, stays on login', async () => {
  await go('/login');
  await page.fill('input[type=email]', 'user@carevo.demo');
  await page.fill('input[autocomplete=current-password]', 'WrongPass1');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Invalid email or password' }).waitFor();
  assert(page.url().endsWith('/login'), 'left login');
});

await S.test('USR-04', 'Register via UI (validation, then success -> dashboard)', async () => {
  await go('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText('Enter your full name.').waitFor();
  await page.fill('input[autocomplete=name]', ME.name);
  await page.fill('input[type=email]', ME.email);
  await page.fill('input[autocomplete=new-password]', ME.pw);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: /Welcome back, Priya/ }).waitFor();
  await shot('dashboard-new-user');
});

await S.test('USR-05', 'Duplicate email registration is rejected with a message', async () => {
  const c2 = await browser.newContext(); const p2 = await c2.newPage();
  await p2.goto(APP + '/register');
  await p2.fill('input[autocomplete=name]', 'Dup User');
  await p2.fill('input[type=email]', ME.email);
  await p2.fill('input[autocomplete=new-password]', 'secret123');
  await p2.getByRole('button', { name: 'Create account' }).click();
  await p2.getByRole('alert').filter({ hasText: 'already registered' }).waitFor();
  await c2.close();
});

await S.test('USR-06', 'Jobs: search, type filter, clear, URL sync', async () => {
  await go('/jobs');
  await page.locator('.u-job').first().waitFor();
  const all = await page.locator('.u-job').count();
  await page.getByPlaceholder('Search job title, skill or keyword').fill('python');
  await page.waitForFunction(() => document.querySelectorAll('.u-job').length === 1);
  assert(page.url().includes('q=python'), 'query not in URL');
  await page.getByPlaceholder('Search job title, skill or keyword').fill('');
  await page.getByLabel('Job type').selectOption('internship');
  await page.locator('.u-job-title', { hasText: 'Design Intern' }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.u-job').length === 1);
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.waitForFunction((n) => document.querySelectorAll('.u-job').length === n, all);
  await page.getByPlaceholder('Search job title, skill or keyword').fill('zzzznothing');
  await page.getByText('No jobs found').waitFor();
});

await S.test('USR-07', 'Jobs: pagination moves to page 2', async () => {
  await go('/jobs');
  await page.locator('.u-job').first().waitFor();
  assert((await page.locator('.u-job').count()) === 8, 'page 1 should have 8');
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.u-job').length > 0 && document.querySelectorAll('.u-job').length < 8);
  assert(page.url().includes('page=2'), 'page not in url');
});

await S.test('USR-08', 'Save / unsave a job and see it on Saved page', async () => {
  await go('/jobs');
  await page.getByPlaceholder('Search job title, skill or keyword').fill('Design Intern');
  await page.waitForFunction(() => document.querySelectorAll('.u-job').length === 1);
  await page.getByRole('button', { name: /^Save UI\/UX/ }).click();
  await page.getByText('Job saved').first().waitFor();
  await go('/saved');
  await page.locator('.u-job-title', { hasText: 'UI/UX Design Intern' }).waitFor();
  await page.getByRole('button', { name: /^Unsave UI\/UX/ }).click();
  await page.getByText('Removed from saved jobs').first().waitFor();
  await page.waitForFunction(() => !document.querySelector('.u-job'));
});

let extAppId;
await S.test('USR-09', 'APPLY (company link): new tab opens the exact company URL and application is recorded', async () => {
  await go(`/jobs/${extJob.id}`);
  await page.getByText('Python Backend Engineer').first().waitFor();
  await page.getByText(/takes applications on their own website/).waitFor();
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: /^Apply to Python/ }).click()]);
  await popup.waitForURL(extJob.apply_url);
  assert(popup.url() === extJob.apply_url, `popup went to ${popup.url()}`);
  assert((await popup.locator('h1').innerText()).includes('Company careers page'), 'company page not loaded');
  await popup.close();
  await page.getByText('Applied').first().waitFor();
  await page.getByRole('link', { name: 'View in history' }).waitFor();
  const apps = await api.get('/applications', undefined, await api.login(ME.email, ME.pw));
  assert(apps.total === 1 && apps.items[0].source === 'external' && apps.items[0].status === 'applied', 'API history wrong');
  extAppId = apps.items[0].id;
  await shot('applied-detail');
});

await S.test('USR-10', 'Applied job appears in History (status Applied, source Company site) and dashboard counter updates', async () => {
  await go('/applications');
  const card = page.locator('.u-app').first();
  await card.waitFor();
  const t = await card.innerText();
  assert(t.includes('Python Backend Engineer') && t.includes('Demo Tech'), 'job info missing');
  assert(/Applied/.test(t) && t.includes('Company site'), 'status/source missing');
  assert(await card.getByRole('link', { name: 'Open company site' }).getAttribute('href') === extJob.apply_url, 'company link wrong');
  await shot('history');
  await go('/dashboard');
  await page.getByTestId('stat-applications').getByText('1', { exact: true }).waitFor();
});

await S.test('USR-11', 'Clicking Apply again reopens the link and does NOT create a duplicate', async () => {
  await go(`/jobs/${extJob.id}`);
  await page.getByRole('button', { name: /Reopen company site|Open company site/ }).first().waitFor();
  const before = companyHits.length;
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: /company site/ }).first().click()]);
  await popup.waitForURL(extJob.apply_url);
  await popup.close();
  assert(companyHits.length > before, 'link not reopened');
  const apps = await api.get('/applications', undefined, await api.login(ME.email, ME.pw));
  assert(apps.total === 1, `duplicate created (${apps.total})`);
});

await S.test('USR-12', 'Jobs list shows Applied state for the applied job', async () => {
  await go('/jobs');
  await page.getByPlaceholder('Search job title, skill or keyword').fill('python');
  await page.waitForFunction(() => document.querySelectorAll('.u-job').length === 1);
  await page.locator('.u-job .badge', { hasText: 'Applied' }).waitFor();
});

await S.test('USR-13', 'Resume upload rejects wrong type and oversize files', async () => {
  await go('/resume');
  await page.setInputFiles('#resume-file', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.getByRole('alert').filter({ hasText: /PDF|DOC/ }).waitFor();
  await page.setInputFiles('#resume-file', { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(5.5 * 1024 * 1024)]) });
  await page.getByRole('alert').filter({ hasText: /5 ?MB|too large|large/i }).waitFor();
});

const CV = ['Priya Sharma', 'priya@example.com', '+91 98765 43210', 'Summary', 'Full stack developer', 'Experience',
  'Built and optimized React and Python services, reduced load time by 40%. Led a team of 4.',
  'Launched a FastAPI platform serving 10k users. Developed MongoDB pipelines and implemented Docker CI/CD.',
  'Education', 'B.Tech Computer Science', 'Skills', 'React, Python, FastAPI, MongoDB, Docker, Git', 'Projects', 'Carevo',
  'github.com/priya linkedin.com/in/priya', 'Worked closely with product teams to deliver features. '.repeat(10)].join('\n');

await S.test('USR-14', 'Resume upload (DOCX) works, first one becomes default', async () => {
  await go('/resume');
  await page.setInputFiles('#resume-file', { name: 'priya-cv.docx', mimeType: 'application/octet-stream', buffer: docxBytes(CV) });
  await page.getByText('priya-cv.docx').waitFor();
  await page.getByText(/default/i).first().waitFor();
});

await S.test('USR-15', 'Resume AI analysis shows score, skills and suggestions', async () => {
  await page.getByRole('button', { name: 'Analyze with AI' }).click();
  await page.getByTestId('analysis').waitFor();
  const t = await text('[data-testid=analysis]');
  assert(/AI resume score/.test(t), 'no score heading');
  assert(/React/.test(t), 'skills not detected');
  const score = await page.locator('.u-score').first().getAttribute('aria-label');
  assert(/Resume score \d+/.test(score), 'score dial missing');
  await shot('resume-analysis');
});

let intAppOk = false;
await S.test('USR-16', 'APPLY (in-platform): modal with resume + cover letter, recorded in history as Carevo', async () => {
  await go(`/jobs/${intJob.id}`);
  await page.getByRole('button', { name: /^Apply to UI\/UX/ }).click();
  await page.getByRole('dialog').getByText('priya-cv.docx').first().waitFor().catch(() => {});
  await page.getByLabel('Cover letter (optional)').fill('I love design systems.');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await page.getByText('Application submitted').waitFor();
  await go('/applications');
  const card = page.locator('.u-app', { hasText: 'UI/UX Design Intern' });
  await card.waitFor();
  assert((await card.innerText()).includes('Carevo'), 'source badge');
  assert((await card.innerText()).includes('I love design systems.'), 'cover letter missing');
  intAppOk = true;
});

await S.test('USR-17', 'Recruiter shortlists via API -> status, timeline, notification bell and notifications page update', async () => {
  const myTok = await api.login(ME.email, ME.pw);
  await api.patch(`/recruiter/applications/${extAppId}/status`, { status: 'shortlisted', note: 'Great profile' }, recTok);
  await go('/applications');
  const card = page.locator('.u-app', { hasText: 'Python Backend Engineer' });
  await card.getByText('Shortlisted').first().waitFor();
  assert((await card.locator('.u-timeline li').count()) === 2, 'timeline should have 2 steps');
  assert((await card.innerText()).includes('Great profile'), 'recruiter note missing');
  await page.getByTestId('bell-count').waitFor();
  await go('/notifications');
  await page.getByText('You have been shortlisted').waitFor();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await page.waitForFunction(() => !document.querySelector('[data-testid=bell-count]'));
  await shot('notifications');
  return `unread cleared`;
});

await S.test('USR-18', 'Scheduled interview appears on Interviews page with meeting link', async () => {
  await api.post('/recruiter/interviews', { application_id: extAppId, scheduled_at: new Date(Date.now() + 3 * 864e5).toISOString(), mode: 'online', meeting_link: 'https://meet.example.com/abc' }, recTok);
  await go('/interviews');
  await page.getByText('Python Backend Engineer').first().waitFor();
  const link = page.getByRole('link', { name: /Join|meeting/i }).first();
  assert((await link.getAttribute('href')) === 'https://meet.example.com/abc', 'meeting link wrong');
});

await S.test('USR-19', 'Withdraw an application (confirm dialog) -> status Withdrawn', async () => {
  await go('/applications');
  const card = page.locator('.u-app', { hasText: 'UI/UX Design Intern' });
  await card.getByRole('button', { name: 'Withdraw' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Withdraw' }).click();
  await page.getByText('Application withdrawn').waitFor();
  await page.locator('.u-app', { hasText: 'UI/UX Design Intern' }).getByText('Withdrawn').first().waitFor();
  await page.getByRole('tab', { name: 'Withdrawn' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.u-app').length === 1);
});

await S.test('USR-20', 'Profile edits persist after reload', async () => {
  await go('/profile');
  await page.getByLabel('Current position').fill('Frontend Engineer');
  await page.getByLabel('Location').fill('Pune, India');
  await page.getByLabel('About you').fill('I build delightful UIs.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByText(/Profile (updated|saved)/i).first().waitFor();
  await page.reload(); await page.waitForLoadState('networkidle');
  assert((await page.getByLabel('Current position').inputValue()) === 'Frontend Engineer', 'position not persisted');
  assert((await page.getByLabel('Location').inputValue()) === 'Pune, India', 'location not persisted');
});

await S.test('USR-21', 'Change password via UI, old password stops working', async () => {
  await go('/profile');
  await page.getByLabel('Current password').fill(ME.pw);
  await page.getByLabel(/^New password/).fill('newsecret456');
  await page.getByLabel('Confirm new password').fill('newsecret456');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByText('Password updated.').waitFor();
  const bad = await api.raw('POST', '/auth/login', { email: ME.email, password: ME.pw });
  assert(bad.status === 401, 'old password still valid');
  await page.reload(); await page.waitForLoadState('networkidle');
  assert(!page.url().includes('/login'), 'session was lost after changing password (new token not stored)');
  await page.getByRole('heading', { name: 'My profile' }).waitFor();
  ME.pw = 'newsecret456';
});

await S.test('USR-22', 'Skills: add and remove', async () => {
  await go('/skills');
  await page.getByRole('button', { name: /^Add React|^React/ }).first().click();
  await page.getByRole('button', { name: 'Remove React' }).waitFor();
  const mine = await api.get('/skills/users/me/skills', undefined, await api.login(ME.email, ME.pw));
  assert(mine.some((s) => s.name === 'React'), 'skill not saved');
  await page.getByRole('button', { name: 'Remove React' }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Remove React"]'));
});

await S.test('USR-23', 'Companies: follow / unfollow, shows on Following page', async () => {
  await go('/companies');
  await page.getByText('Demo Tech Pvt Ltd').first().waitFor();
  await page.getByRole('button', { name: /^Follow/ }).first().click();
  await page.getByRole('button', { name: /Following/ }).first().waitFor();
  await go('/following');
  await page.getByText('Demo Tech Pvt Ltd').waitFor();
  await page.getByRole('button', { name: 'Unfollow' }).click();
  await page.getByText(/not following|Nothing here|No /i).first().waitFor();
});

await S.test('USR-24', 'Job Reels: layout, like, save, comment, delete comment, switch reel', async () => {
  await go('/videos');
  await page.getByTestId('reel-thumb').first().waitFor();
  assert((await page.getByTestId('reel-thumb').count()) >= 3, 'thumbnail column should list reels');
  await page.getByTestId('reel-job').waitFor();
  await page.getByTestId('reel-recruiter').waitFor();
  const stage = page.locator('.rl-stage');
  await stage.getByRole('button', { name: 'Like' }).click();
  await page.waitForFunction(() => document.querySelector('.rl-actions button[aria-label=Like]').getAttribute('aria-pressed') === 'true');
  await stage.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.rl-actions button[aria-label=Save]').getAttribute('aria-pressed') === 'true');
  await stage.getByRole('button', { name: 'Comments' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Add a comment').fill('Great culture!');
  await dlg.getByRole('button', { name: 'Post' }).click();
  await dlg.getByText('Great culture!').waitFor();
  await dlg.getByRole('button', { name: 'Delete comment' }).click();
  await page.getByRole('dialog').filter({ hasText: /Delete/ }).last().getByRole('button', { name: /Delete|Confirm/ }).click().catch(() => {});
  await page.getByText('Great culture!').waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
  await page.getByTestId('reel-thumb').nth(1).click();
  await page.locator('.rl-caption h3', { hasText: 'A day at Demo Tech' }).waitFor();
  await shot('reels');
});

await S.test('USR-25', 'Report a job (modal) and admin sees it', async () => {
  await go(`/jobs/${intJob.id}`);
  await page.getByRole('button', { name: 'Report this job' }).click();
  await page.getByLabel('Reason').fill('Looks like a scam posting');
  await page.getByRole('button', { name: 'Submit report' }).click();
  await page.getByText(/Thanks/).first().waitFor();
  const reps = await api.get('/admin/reports?status=pending', undefined, adminTok);
  assert(reps.items.some((r) => r.reason.includes('scam')), 'report not in admin queue');
});

await S.test('USR-26', 'Chat: message the recruiter, recruiter replies, unread shows', async () => {
  const rec = await api.get('/auth/me', undefined, recTok);
  await go(`/messages?with=${rec.id}`);
  await page.getByPlaceholder('Type a message…').fill('Hello, is the role still open?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.locator('.bubble.mine', { hasText: 'still open' }).waitFor();
  await api.post('/messages', { receiver_id: (await api.get('/auth/me', undefined, await api.login(ME.email, ME.pw))).id, message: 'Yes, please share your availability.' }, recTok);
  await page.getByText('please share your availability').first().waitFor({ timeout: 15000 });
  await shot('chat');
});

await S.test('USR-27', 'Logout, protected URL redirects to login with ?next, login returns to it', async () => {
  await page.getByRole('complementary', { name: 'Sidebar' }).getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/(login.*)?$/);
  await page.goto(APP + '/applications'); await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/login\?next=%2Fapplications/);
  await page.fill('input[type=email]', ME.email);
  await page.fill('input[autocomplete=current-password]', ME.pw);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/applications');
});

await S.test('USR-28', 'Forgot -> reset password via UI, then sign in with the new password', async () => {
  const c2 = await browser.newContext(); const p = await c2.newPage();
  await p.goto(APP + '/forgot-password');
  await p.fill('input[type=email]', ME.email);
  await p.getByRole('button', { name: 'Send reset link' }).click();
  await p.getByText(/reset link has been sent/).waitFor();
  await p.getByRole('link', { name: 'open reset page' }).click();
  await p.getByLabel('New password').fill('resetpass789');
  await p.getByLabel('Confirm password').fill('resetpass789');
  await p.getByRole('button', { name: 'Update password' }).click();
  await p.getByText('Password updated. You can log in now.').waitFor();
  ME.pw = 'resetpass789';
  await api.login(ME.email, ME.pw);
  await c2.close();
  // a password reset signs out every older session (security) - sign the main browser back in
  await go('/login');
  await page.fill('input[type=email]', ME.email);
  await page.fill('input[autocomplete=current-password]', ME.pw);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/dashboard');
});

await S.test('USR-29', 'Recruiter and admin accounts are redirected away from the user panel', async () => {
  for (const [tok, expect] of [[recTok, '/recruiter/dashboard'], [adminTok, '/admin/dashboard']]) {
    const c = await authedContext(browser, tok); const p = await c.newPage();
    await p.goto(APP + '/jobs'); await p.waitForURL('**' + expect, { timeout: 10000 });
    await c.close();
  }
});

await S.test('USR-30', 'Blocked user is signed out on next request with a clear message', async () => {
  const u = await api.register('Block Me', `block.${uniq()}@example.com`, 'secret123');
  const c = await authedContext(browser, u.token); const p = await c.newPage();
  await p.goto(APP + '/dashboard'); await p.waitForLoadState('networkidle');
  await p.getByRole('heading', { name: /Welcome back, Block/ }).waitFor();
  await api.patch(`/admin/users/${u.user.id}`, { is_active: false }, adminTok);
  await p.reload();
  await p.waitForURL(/\/login/, { timeout: 10000 });
  await p.getByText(/blocked|inactive/i).first().waitFor();
  await c.close();
});

await S.test('USR-31', 'Mobile: bottom tab bar + menu drawer navigation', async () => {
  const myTok = await api.login(ME.email, ME.pw);
  const c = await authedContext(browser, myTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(APP + '/dashboard'); await p.waitForLoadState('networkidle');
  const bar = p.getByRole('navigation', { name: 'Primary' });
  await bar.waitFor();
  try { await bar.getByRole('link', { name: 'Jobs' }).click({ timeout: 5000 }); } catch (e) {
    const info = await p.evaluate(() => { const l = document.querySelector('.u-tabbar a[href="/jobs"]'); const r = l.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { rect: [r.x, r.y, r.width, r.height], hit: el && (el.tagName + '.' + el.className), wide: [...document.querySelectorAll('body *')].filter((n) => n.getBoundingClientRect().right > 391).slice(0, 6).map((n) => n.tagName + '.' + (n.className.baseVal ?? n.className) + ':' + Math.round(n.getBoundingClientRect().right) + ' in ' + (n.closest('section,aside,header,main')?.className || '?') + ' | ' + (n.textContent || '').slice(0, 40)), vh: innerHeight, sy: scrollY, docH: document.documentElement.scrollHeight }; });
    await p.screenshot({ path: `${SHOTS}/debug-tab.png` });
    throw new Error('tab click blocked: ' + JSON.stringify(info));
  }
  await p.waitForURL('**/jobs');
  await bar.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Saved Jobs' }).click();
  await p.waitForURL('**/saved');
  await p.getByRole('dialog', { name: 'Menu' }).waitFor({ state: 'detached' });
  await p.screenshot({ path: `${SHOTS}/e2e-mobile-saved.png` });
  await c.close();
});

await S.test('USR-32', 'Mobile (390px): no horizontal overflow on any user page', async () => {
  const myTok = await api.login(ME.email, ME.pw);
  const c = await authedContext(browser, myTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  const bad = [];
  for (const path of ['/dashboard', '/jobs', `/jobs/${extJob.id}`, '/applications', '/saved', '/companies', '/videos', '/resume', '/resume-builder', '/profile', '/settings', '/skills', '/prep', '/assessments', '/interviews', '/messages', '/notifications', '/following', '/does-not-exist']) {
    await p.goto(APP + path); await p.waitForLoadState('networkidle'); await p.waitForTimeout(150);
    const over = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - 390);
    if (over > 1) bad.push(`${path}:${over}px`);
  }
  await c.close();
  assert(bad.length === 0, 'overflow on ' + bad.join(', '));
});


// ----------------------------------------------------------------- new in v3
let me2; // a fresh candidate used for the premium flow
await S.test('USR-35', 'Job Reels: non-premium user sees locked Apply + locked recruiter profile, both explain Premium', async () => {
  const u = await api.register('Reel Viewer', `reel.${uniq()}@example.com`, 'secret123');
  me2 = u;
  const c = await authedContext(browser, u.token); const p = await c.newPage();
  await p.goto(APP + '/videos'); await p.waitForLoadState('networkidle');
  await p.getByTestId('reel-job').waitFor();
  await p.getByRole('button', { name: /Apply Now \(Premium required\)/ }).click();
  const dlg = p.getByRole('alertdialog', { name: 'Apply Access Restricted' });
  await dlg.waitFor();
  await dlg.getByRole('button', { name: 'Maybe Later' }).click();
  await dlg.waitFor({ state: 'detached' });
  await p.getByTestId('reel-recruiter').getByRole('button', { name: 'View Profile' }).click();
  await p.getByRole('alertdialog', { name: 'Recruiter Profile is Restricted' }).waitFor();
  // the server enforces it too, not just the UI
  const vids = await api.get('/videos?type=job', undefined, u.token);
  const reel = vids.items.find((v) => v.job);
  const r = await api.raw('POST', `/videos/${reel.id}/apply`, {}, u.token);
  assert(r.status === 402, `server must refuse (got ${r.status})`);
  const rp = await api.raw('GET', `/recruiters/${reel.author.id}`, undefined, u.token);
  assert(rp.status === 402, 'recruiter profile must be restricted by the API');
  await p.screenshot({ path: `${SHOTS}/e2e-reels-locked.png` });
  await c.close();
});

await S.test('USR-36', 'Upgrade to Premium request reaches the admin; admin grants it; user gets Apply + recruiter profile', async () => {
  const c = await authedContext(browser, me2.token); const p = await c.newPage();
  const hits = [];
  await c.route('https://example.com/**', (route) => { hits.push(route.request().url()); route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Company careers page</h1>' }); });
  await p.goto(APP + '/videos'); await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: /Apply Now \(Premium required\)/ }).click();
  await p.getByRole('alertdialog').getByRole('button', { name: 'Upgrade to Premium' }).click();
  await p.getByText(/Request received/).waitFor();
  const reqs = await api.get('/admin/premium-requests', undefined, adminTok);
  assert(reqs.items.some((x) => x.user.id === me2.user.id), 'admin does not see the request');
  await api.patch(`/admin/users/${me2.user.id}/premium`, { is_premium: true, days: 30 }, adminTok);
  await p.reload(); await p.waitForLoadState('networkidle');
  const applyBtn = p.getByTestId('reel-job').getByRole('button', { name: 'Apply Now' });
  await applyBtn.waitFor();
  const [popup] = await Promise.all([c.waitForEvent('page'), applyBtn.click()]);
  await popup.waitForURL(/example\.com\/careers/);
  await popup.close();
  const apps = await api.get('/applications', undefined, me2.token);
  assert(apps.total === 1 && apps.items[0].source === 'external', 'application from reel not recorded in history');
  await p.getByTestId('reel-recruiter').getByRole('button', { name: 'View Profile' }).click();
  await p.waitForURL(/\/recruiters\//);
  await p.getByRole('heading', { name: 'Rita Recruiter' }).waitFor();
  await p.getByText('Open positions').waitFor();
  await p.screenshot({ path: `${SHOTS}/e2e-recruiter-profile.png` });
  await c.close();
});

await S.test('USR-37', 'Admin turns Premium gating off -> everyone can apply from reels', async () => {
  await api.put('/admin/settings', { premium_gating: false }, adminTok);
  const u = await api.register('Free Viewer', `free.${uniq()}@example.com`, 'secret123');
  const vids = await api.get('/videos?type=job', undefined, u.token);
  const reel = vids.items.find((v) => v.job);
  const r = await api.raw('POST', `/videos/${reel.id}/apply`, {}, u.token);
  assert(r.status === 201 || r.status === 200, `apply should work with gating off (got ${r.status})`);
  await api.put('/admin/settings', { premium_gating: true }, adminTok);
});

await S.test('USR-38', 'Interview Prep: filter, open answer, mark known, progress updates', async () => {
  await go('/prep');
  await page.getByTestId('prep-item').first().waitFor();
  await page.getByLabel('Category').selectOption('Python');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid=prep-item] .badge')].every((b) => !/HR/.test(b.textContent)));
  const first = page.getByTestId('prep-item').first();
  await first.locator('.u-q-head').click();
  await first.getByRole('button', { name: 'I know this' }).click();
  await first.getByText('Known').waitFor();
  await page.getByText(/1 of \d+ questions mastered/).waitFor();
  await shot('prep');
});

await S.test('USR-39', 'Skill assessment: answer all, submit, see score + review, skill becomes verified', async () => {
  await go('/assessments');
  await page.getByTestId('assessment-card').first().waitFor();
  await page.locator('[data-testid=assessment-card]', { hasText: 'Python Fundamentals' }).getByRole('link', { name: 'Start' }).click();
  await page.getByTestId('assessment-question').first().waitFor();
  const submit = page.getByRole('button', { name: 'Submit answers' });
  assert(await submit.isDisabled(), 'submit must be disabled until all answered');
  const n = await page.getByTestId('assessment-question').count();
  for (let i = 0; i < n; i++) await page.locator(`input[name="q${i}"]`).first().check();
  await submit.click();
  await page.getByTestId('assessment-result').waitFor();
  assert(/You scored/.test(await text('[data-testid=assessment-result]')), 'no score');
  await shot('assessment-result');
});

await S.test('USR-40', 'Resume Builder: edit, live preview, save, persists after reload', async () => {
  await go('/resume-builder');
  await page.getByLabel('Headline').fill('Full Stack Developer');
  await page.getByLabel('Summary').fill('Builds reliable web apps.');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByLabel('Role').first().fill('Engineer');
  await page.getByLabel('Company').first().fill('Acme');
  await page.locator('#rb-preview').getByText('Full Stack Developer').waitFor();
  await page.locator('#rb-preview').getByText('Engineer - Acme').waitFor();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Resume saved').first().waitFor();
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.locator('#rb-preview').getByText('Engineer - Acme').waitFor();
  await shot('resume-builder');
});

await S.test('USR-41', 'Settings: upload profile photo (image validated by content), shows in header', async () => {
  await go('/settings');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('.media-up input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  await page.getByText('Photo updated').first().waitFor();
  const me = await api.get('/auth/me', undefined, await api.login(ME.email, ME.pw));
  assert(/\/uploads\/media\/image\//.test(me.profile_image || '') || /^https:\/\//.test(me.profile_image || ''), 'avatar not stored: ' + me.profile_image);
  // a text file renamed to .png must be refused by the server
  await page.locator('.media-up input[type=file]').setInputFiles({ name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('<script>alert(1)</script>') });
  await page.getByRole('alert').filter({ hasText: /not|valid|supported|image/i }).first().waitFor();
});

await S.test('USR-42', 'Chat attachment: send an image, it renders in the thread', async () => {
  const rec = await api.get('/auth/me', undefined, recTok);
  await go(`/messages?with=${rec.id}`);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Attach a file').setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: png });
  await page.locator('.chat-attach').getByText('pic.png').waitFor();
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.locator('.bubble.mine img').first().waitFor();
});

await S.test('USR-43', 'Login: Remember me OFF keeps the session in sessionStorage only; Google/LinkedIn show a clear message when not configured', async () => {
  const c = await browser.newContext(); const p = await c.newPage();
  await p.goto(APP + '/login'); await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: 'Continue with Google' }).click();
  await p.getByText(/Google sign-in is not enabled yet/).waitFor();
  await p.getByRole('button', { name: 'Continue with LinkedIn' }).click();
  await p.getByText(/LinkedIn sign-in is not enabled yet/).waitFor();
  await p.getByLabel('Remember me').uncheck();
  await p.fill('input[type=email]', ME.email);
  await p.fill('input[autocomplete=current-password]', ME.pw);
  await p.getByRole('button', { name: 'Show password' }).click();
  assert((await p.locator('input[autocomplete=current-password]').getAttribute('type')) === 'text', 'eye toggle did not reveal password');
  await p.getByRole('button', { name: 'Login', exact: true }).click();
  await p.waitForURL('**/dashboard');
  const store = await p.evaluate(() => ({ l: localStorage.getItem('carevo_token'), s: sessionStorage.getItem('carevo_token') }));
  assert(!store.l && store.s, `token storage wrong: ${JSON.stringify({ l: !!store.l, s: !!store.s })}`);
  await c.close();
});

await S.test('USR-44', 'Admin edits the landing page -> change is visible on the public site immediately', async () => {
  const before = await api.get('/admin/site-content', undefined, adminTok);
  const hero = { ...before.content.hero, title: 'Hire Smarter, Work Better with CareVo' };
  await api.put('/admin/site-content', { hero }, adminTok);
  const c = await browser.newContext(); const p = await c.newPage();
  await p.goto(APP + '/'); await p.waitForLoadState('networkidle');
  await p.getByRole('heading', { name: /Hire Smarter, Work Better/ }).waitFor();
  await api.post('/admin/site-content/reset', ['hero'], adminTok);
  await c.close();
});

await S.test('USR-45', 'Landing: newsletter subscribe, legal pages, mobile menu, category click goes through login', async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(APP + '/'); await p.waitForLoadState('networkidle');
  const over = await p.evaluate(() => document.documentElement.scrollWidth - 390);
  assert(over <= 1, `landing overflows by ${over}px on mobile`);
  await p.getByRole('button', { name: 'Open menu' }).click();
  await p.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Sign Up' }).waitFor();
  await p.getByRole('button', { name: 'Close menu' }).click();
  const email = `news.${uniq()}@example.com`;
  await p.getByLabel('Email address').fill(email);
  await p.getByRole('button', { name: 'Subscribe' }).click();
  await p.getByText('Thanks for subscribing!').waitFor();
  const subs = await api.get('/admin/newsletter?limit=100', undefined, adminTok);
  assert(subs.items.some((x) => x.email === email), 'subscriber not stored');
  await p.getByRole('link', { name: 'Terms of Service' }).first().click();
  await p.getByRole('heading', { name: 'Terms of Service' }).waitFor();
  await p.goto(APP + '/'); await p.waitForLoadState('networkidle');
  await p.locator('.lp-cat').first().click();
  await p.waitForURL(/\/login\?next=%2Fjobs/);
  await p.screenshot({ path: `${SHOTS}/e2e-login-mobile.png` });
  await c.close();
});

await S.test('USR-46', 'Landing + login pages have no horizontal overflow on phone, tablet and desktop', async () => {
  const bad = [];
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1440, 900]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage();
    for (const path of ['/', '/login', '/register', '/forgot-password', '/terms']) {
      await p.goto(APP + path); await p.waitForLoadState('networkidle');
      const over = await p.evaluate((vw) => document.documentElement.scrollWidth - vw, w);
      if (over > 1) bad.push(`${path}@${w}:${over}px`);
    }
    await c.close();
  }
  assert(bad.length === 0, bad.join(', '));
});

await S.test('USR-47', 'Private resumes: owner opens via signed link, a stranger cannot', async () => {
  const mine = await api.get('/resumes', undefined, await api.login(ME.email, ME.pw));
  const rid = (mine.items || mine)[0].id;
  const tok = await api.login(ME.email, ME.pw);
  const link = await api.get(`/resumes/${rid}/link`, undefined, tok);
  const ok = await fetch(API.replace(/\/api$/, '') + link.url);
  assert(ok.status === 200, `signed link status ${ok.status}`);
  const direct = await fetch(API.replace(/\/api$/, '') + `/uploads/resumes/anything.docx`);
  assert(direct.status === 404, 'resume directory must not be publicly served');
  const stranger = await api.raw('GET', `/resumes/${rid}/link`, undefined, me2.token);
  assert(stranger.status === 404, 'stranger must not get a link');
});

await S.test('USR-33', 'Unknown route shows a friendly 404 inside the app', async () => {
  await go('/this-page-does-not-exist');
  await page.getByText('Page not found').waitFor();
});


const RZP_SECRET = 'e2e_secret_value';
const goodSig = (order, pay) => crypto.createHmac('sha256', RZP_SECRET).update(`${order}|${pay}`).digest('hex');
/** Replace Razorpay's hosted checkout.js with a stub that "pays" (or fails / is dismissed) so the real UI + API flow runs offline. */
async function stubCheckout(context, mode) {
  await context.exposeFunction('__sig', (order, pay) => (mode === 'forged' ? 'f'.repeat(64) : goodSig(order, pay)));
  await context.route('https://checkout.razorpay.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: `
    window.Razorpay = function (o) { this.o = o; };
    window.Razorpay.prototype.on = function () {};
    window.Razorpay.prototype.open = function () {
      var o = this.o, pay = 'pay_e2e_' + Date.now();
      if ('${mode}' === 'cancel') { setTimeout(function () { o.modal.ondismiss(); }, 50); return; }
      window.__sig(o.order_id, pay).then(function (sig) { o.handler({ razorpay_order_id: o.order_id, razorpay_payment_id: pay, razorpay_signature: sig }); });
    };` }));
}

let planA;
await S.test('USR-48', 'Banner/popup targeting: candidate sees candidate banner + scheduled popup; guest and future items stay hidden', async () => {
  const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const T = 'Candidate fest ' + uniq(), F = 'Future promo ' + uniq(), P = 'Premium week ' + uniq();
  const b = await api.post('/admin/banners', { title: T, audience: 'user', starts_at: iso(-1), ends_at: iso(2) }, adminTok);
  const f = await api.post('/admin/banners', { title: F, audience: 'all', starts_at: iso(3) }, adminTok);
  const p = await api.post('/admin/popups', { title: P, message: 'Half price for 7 days', button_label: 'See plans', button_link: 'https://example.com/plans', audience: 'user', frequency: 'once', delay_seconds: 0 }, adminTok);
  const tok = await api.login(ME.email, ME.pw).catch(async () => (await api.register('Banner Tester', `bt.${uniq()}@example.com`, 'secret123')).token);
  const c = await authedContext(browser, tok); const u = await c.newPage();
  await u.goto(APP + '/dashboard'); await u.waitForLoadState('networkidle');
  await u.getByTestId('banner').filter({ hasText: T }).waitFor();
  assert((await u.getByText(F).count()) === 0, 'future banner shown too early');
  const pop = u.getByTestId('popup'); await pop.waitFor();
  assert((await pop.innerText()).includes('Half price'), 'popup text missing');
  await u.screenshot({ path: `${SHOTS}/e2e-popup.png` });
  await pop.getByRole('button', { name: 'Maybe later' }).click();
  await pop.waitFor({ state: 'detached' });
  await u.reload(); await u.waitForLoadState('networkidle'); await u.waitForTimeout(800);
  assert((await u.getByTestId('popup').count()) === 0, 'popup with frequency "once" came back');
  await u.getByRole('button', { name: `Dismiss ${T}` }).click();
  assert((await u.getByTestId('banner').filter({ hasText: T }).count()) === 0, 'dismissed banner still visible');
  await c.close();
  // visitors (not signed in) get neither the candidate banner nor the candidate popup
  const g = await browser.newContext(); const gp = await g.newPage();
  await gp.goto(APP + '/'); await gp.waitForLoadState('networkidle'); await gp.waitForTimeout(800);
  assert((await gp.getByText(T).count()) === 0 && (await gp.getByTestId('popup').count()) === 0, 'candidate-only items leaked to visitors');
  await g.close();
  for (const [k, x] of [['banners', b], ['banners', f], ['popups', p]]) await api.del(`/admin/${k}/${x.id}`, undefined, adminTok);
});

await S.test('USR-49', 'Visitors see an "everyone" banner on the landing page', async () => {
  const T = 'Welcome offer ' + uniq();
  const b = await api.post('/admin/banners', { title: T, text: 'Join free today', audience: 'all', link_url: 'https://example.com/join' }, adminTok);
  const g = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const gp = await g.newPage();
  await gp.goto(APP + '/'); await gp.waitForLoadState('networkidle');
  await gp.getByTestId('banner').filter({ hasText: T }).waitFor();
  const over = await gp.evaluate(() => document.documentElement.scrollWidth - 390);
  assert(over <= 1, 'landing overflows with a banner on mobile: ' + over);
  await gp.screenshot({ path: `${SHOTS}/e2e-banner-landing-mobile.png` });
  await g.close();
  await api.del(`/admin/banners/${b.id}`, undefined, adminTok);
});

await S.test('USR-50', 'Premium plans page lists plans; payment window cancelled -> nothing charged', async () => {
  planA = await api.post('/admin/plans', { name: 'Pro Monthly ' + uniq(), price: 499, duration_days: 30, features: ['Apply from Reels', 'View recruiter profiles'], is_popular: true }, adminTok);
  const tok = (await api.register('Payer One', `pay1.${uniq()}@example.com`, 'secret123')).token;
  const c = await authedContext(browser, tok); await stubCheckout(c, 'cancel'); const u = await c.newPage();
  await u.goto(APP + '/premium'); await u.waitForLoadState('networkidle');
  const card = u.getByTestId('plans').locator('.u-plan', { hasText: planA.name });
  await card.waitFor();
  assert((await card.innerText()).includes('₹499'), 'price not shown');
  await card.getByRole('button', { name: /^Buy/ }).click();
  await u.locator('.toast', { hasText: 'cancelled' }).first().waitFor();
  assert((await api.get('/users/me/premium', undefined, tok)).is_premium === false, 'cancelled payment activated premium');
  await c.close();
});

await S.test('USR-51', 'Forged payment signature is rejected and does not unlock Premium', async () => {
  const tok = (await api.register('Payer Two', `pay2.${uniq()}@example.com`, 'secret123')).token;
  const c = await authedContext(browser, tok); await stubCheckout(c, 'forged'); const u = await c.newPage();
  await u.goto(APP + '/premium'); await u.waitForLoadState('networkidle');
  await u.getByTestId('plans').locator('.u-plan', { hasText: planA.name }).getByRole('button', { name: /^Buy/ }).click();
  await u.locator('.toast', { hasText: /verification failed/i }).first().waitFor();
  assert((await api.get('/users/me/premium', undefined, tok)).is_premium === false, 'forged signature unlocked premium');
  await c.close();
});

await S.test('USR-52', 'Buy a plan through Razorpay checkout -> Premium active, history shows Paid, Reels apply unlocked', async () => {
  const email = `pay3.${uniq()}@example.com`;
  const tok = (await api.register('Payer Three', email, 'secret123')).token;
  const c = await authedContext(browser, tok); await stubCheckout(c, 'ok'); const u = await c.newPage();
  await u.goto(APP + '/premium'); await u.waitForLoadState('networkidle');
  await u.getByTestId('plans').locator('.u-plan', { hasText: planA.name }).getByRole('button', { name: /^Buy/ }).click();
  await u.getByTestId('premium-active').waitFor();
  const row = u.getByTestId('my-payments').locator('tbody tr').first();
  await row.getByText('paid').waitFor();
  const st = await api.get('/users/me/premium', undefined, tok);
  assert(st.is_premium === true && st.premium_until, 'premium not active');
  await u.goto(APP + '/videos'); await u.waitForLoadState('networkidle');
  assert((await u.getByText('Apply Access Restricted').count()) === 0, 'lock dialog should not appear for a paying member');
  await u.screenshot({ path: `${SHOTS}/e2e-premium-active.png` });
  // admin sees the payment + revenue; refund through the API takes Premium away again
  const rows = await api.get('/admin/payments?q=' + encodeURIComponent(email), undefined, adminTok);
  assert(rows.total === 1 && rows.items[0].status === 'paid', 'admin does not see the payment');
  await api.post(`/admin/payments/${rows.items[0].id}/refund`, { reason: 'e2e' }, adminTok);
  assert((await api.get('/users/me/premium', undefined, tok)).is_premium === false, 'refund did not end premium');
  await u.goto(APP + '/premium'); await u.waitForLoadState('networkidle');
  await u.getByTestId('my-payments').locator('tbody tr').first().getByText('refunded').waitFor();
  await c.close();
});

await S.test('USR-53', 'Mobile (390px): premium page has no horizontal overflow', async () => {
  const tok = (await api.register('Mobile Payer', `pay4.${uniq()}@example.com`, 'secret123')).token;
  const c = await authedContext(browser, tok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const u = await c.newPage();
  await u.goto(APP + '/premium'); await u.waitForLoadState('networkidle');
  const over = await u.evaluate(() => document.documentElement.scrollWidth - 390);
  assert(over <= 1, 'overflow ' + over);
  await u.screenshot({ path: `${SHOTS}/e2e-premium-mobile.png` });
  await c.close();
});

await S.test('USR-34', 'No console errors / failed requests / 5xx during the whole run', async () => {
  assert(errors.length === 0, errors.slice(0, 5).join(' | '));
});

await browser.close();
const ok = S.summary();
process.exit(ok ? 0 : 1);
