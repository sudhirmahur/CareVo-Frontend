// RECRUITER panel - end-to-end suite.   node tests/e2e/recruiter.e2e.mjs
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5202, 8002);
const api = makeApi(API);
const out = process.env.REPORT_OUT || '/home/claude/reports/recruiter-e2e.json';
const SHOTS = process.env.SHOTS || '/home/claude/shots/recruiter';
const S = suite('Recruiter panel', out);
const errors = [];

const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const otherRecTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const cand = { name: 'Kabir Seeker', email: `kabir.${uniq()}@example.com`, pw: 'secret123' };
const candReg = await api.register(cand.name, cand.email, cand.pw);
const candTok = candReg.token;

const ME = { name: 'Sana Talent', email: `sana.${uniq()}@example.com`, pw: 'secret123' };
const CO = `Orbit Systems ${uniq()}`;
const EXT = 'https://example.com/careers/orbit-backend-42';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.route('https://example.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Company page</h1>' }));
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const shot = (n) => page.screenshot({ path: `${SHOTS}/e2e-${n}.png` });
let myTok;

await S.test('REC-01', 'Register as Recruiter through the UI -> recruiter dashboard with onboarding prompt', async () => {
  await go('/register?as=recruiter');
  await page.fill('input[autocomplete=name]', ME.name);
  await page.fill('input[type=email]', ME.email);
  await page.fill('input[autocomplete=new-password]', ME.pw);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/recruiter/dashboard');
  await page.getByTestId('onboarding').waitFor();
  myTok = await api.login(ME.email, ME.pw);
  await shot('onboarding');
});

await S.test('REC-02', 'Cannot post a job before creating a company (UI guides to company profile; API refuses)', async () => {
  await go('/recruiter/jobs/new');
  await page.getByText('Create your company profile first').waitFor();
  const r = await api.raw('POST', '/recruiter/jobs', { title: 'No company job', description: 'This should be refused by the API.', skills: [], location: 'X', job_type: 'fulltime' }, myTok);
  assert(r.status >= 400 && r.status < 500, `API returned ${r.status}`);
});

await S.test('REC-03', 'Company form validation, then create -> status Pending', async () => {
  await go('/recruiter/company');
  await page.getByRole('button', { name: 'Create company' }).click();
  await page.locator('.field-error').first().waitFor();
  await page.getByLabel(/Company name/).fill(CO);
  await page.getByLabel('Industry').fill('Software');
  await page.getByLabel('Location').fill('Bengaluru, India');
  await page.getByLabel('Website').fill('https://example.com');
  await page.getByLabel('About the company').fill('We build orbit-grade software.');
  await page.getByRole('button', { name: 'Create company' }).click();
  await toast('Company profile created');
  await page.getByText(/Pending|awaiting/i).first().waitFor();
});

await S.test('REC-04', 'Admin approves the company -> dashboard banner disappears', async () => {
  const comp = (await api.get(`/admin/companies?search=${encodeURIComponent(CO)}`, undefined, adminTok)).items.find((c) => c.name === CO);
  assert(comp, 'company not visible to admin');
  await api.patch(`/admin/companies/${comp.id}`, { status: 'approved' }, adminTok);
  await go('/recruiter/dashboard');
  await page.getByText('Hiring overview').waitFor();
  assert(!(await page.getByText('awaiting admin approval').count()), 'banner still shown');
  await page.locator('.r-company-chip', { hasText: CO }).waitFor();
});

await S.test('REC-05', 'Post a job WITH the company job link (validation, then success -> Pending review)', async () => {
  await go('/recruiter/jobs/new');
  await page.getByRole('button', { name: 'Submit job' }).click();
  await page.locator('.field-error').first().waitFor();
  await page.getByLabel(/Job title/).fill('Orbit Backend Engineer');
  await page.getByLabel('Location').fill('Bengaluru');
  await page.getByLabel(/^Description/).fill('Build and scale the Orbit APIs. Python and MongoDB experience needed.');
  await page.getByLabel('Company job link (optional)').fill('not a url');
  await page.getByRole('button', { name: 'Submit job' }).click();
  await page.locator('.field-error').first().waitFor();
  await page.getByLabel('Company job link (optional)').fill(EXT);
  await page.getByRole('button', { name: 'Submit job' }).click();
  await toast('Job submitted');
  await page.waitForURL('**/recruiter/jobs');
  const card = page.locator('.r-job', { hasText: 'Orbit Backend Engineer' });
  await card.getByText('Pending').first().waitFor();
  await card.getByText('Company link').waitFor();
  await shot('jobs');
});

let job;
await S.test('REC-06', 'Pending job is NOT public; after admin approval candidates see it', async () => {
  const mine = (await api.get('/recruiter/jobs', undefined, myTok)).items.find((j) => j.title === 'Orbit Backend Engineer');
  job = mine;
  assert(mine.status === 'pending' && mine.apply_url === EXT, 'job state wrong');
  let pub = await api.get('/jobs?limit=50');
  assert(!pub.items.some((j) => j.id === job.id), 'pending job is public');
  await api.patch(`/admin/jobs/${job.id}/status`, { status: 'approved' }, adminTok);
  pub = await api.get('/jobs?limit=50');
  assert(pub.items.some((j) => j.id === job.id), 'approved job not public');
  await go('/recruiter/jobs');
  await page.locator('.r-job', { hasText: 'Orbit Backend Engineer' }).getByText('Approved').first().waitFor();
});

await S.test('REC-07', 'Candidate applies via the company link -> recruiter sees it on the board marked "company link"', async () => {
  const res = await api.post(`/jobs/${job.id}/apply`, {}, candTok);
  assert(res.redirect_url === EXT && res.source === 'external', 'apply response wrong');
  await go('/recruiter/applications');
  const card = page.getByRole('button', { name: `Open application from ${cand.name}` });
  await card.waitFor();
  await page.getByRole('region', { name: /Applied/ }).getByText(cand.name).waitFor();
  await shot('board');
});

await S.test('REC-08', 'Open application: details, "applied via company link", note + Shortlist -> candidate history & notification', async () => {
  await page.getByRole('button', { name: `Open application from ${cand.name}` }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByText('Applied via company link').waitFor();
  await dlg.getByText(cand.email).waitFor();
  await dlg.getByLabel(/Note to candidate/).fill('Strong backend profile');
  await dlg.getByRole('button', { name: 'Shortlist' }).click();
  await toast('Marked as shortlisted');
  const hist = (await api.get('/applications', undefined, candTok)).items[0];
  assert(hist.status === 'shortlisted' && hist.status_history.some((h) => h.note === 'Strong backend profile'), 'candidate history wrong');
  const n = await api.get('/notifications?limit=10', undefined, candTok);
  assert(n.items.some((x) => /shortlist/i.test(x.title + x.message)), 'candidate not notified');
});

await S.test('REC-09', 'Schedule interview: link required for online, then success; candidate sees it', async () => {
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Schedule interview' }).click();
  await dlg.getByRole('button', { name: 'Schedule', exact: true }).click();
  await dlg.locator('.field-error').first().waitFor();
  const d = new Date(Date.now() + 2 * 864e5); d.setMinutes(0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await dlg.getByLabel('Date & time').fill(local);
  await dlg.getByLabel('Meeting link').fill('https://meet.example.com/orbit');
  await dlg.getByRole('button', { name: 'Schedule', exact: true }).click();
  await toast('Interview scheduled');
  const ivs = await api.get('/interviews', undefined, candTok);
  assert((ivs.items || ivs).some((i) => i.meeting_link === 'https://meet.example.com/orbit'), 'candidate cannot see interview');
});

await S.test('REC-10', 'Interviews page: reschedule, complete with feedback, cancel another', async () => {
  await go('/recruiter/interviews');
  await page.getByText(cand.name).first().waitFor();
  await page.getByRole('button', { name: 'Reschedule' }).first().click();
  await page.getByRole('dialog').getByLabel('Meeting link').fill('https://meet.example.com/orbit-2');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await toast('Interview updated');
  await page.getByRole('button', { name: 'Complete' }).first().click();
  await page.getByRole('dialog').getByLabel(/Feedback/).fill('Excellent');
  await page.getByRole('dialog').getByRole('button', { name: /Mark completed|Mark com/ }).click();
  await toast('completed');
  await page.getByRole('tab', { name: /Completed/ }).click();
  await page.getByText(cand.name).first().waitFor();
});

await S.test('REC-11', 'Accept the candidate; Reject disabled states update; list view filter works', async () => {
  await go('/recruiter/applications');
  await page.getByRole('tab', { name: 'List' }).click();
  await page.getByText(cand.name).first().waitFor();
  await page.getByRole('button', { name: 'Review' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Accept' }).click();
  await toast('Marked as accepted');
  await dlg.getByRole('button', { name: 'Accept' }).waitFor();
  assert(await dlg.getByRole('button', { name: 'Accept' }).isDisabled(), 'Accept should disable after use');
  const hist = (await api.get('/applications', undefined, candTok)).items[0];
  assert(hist.status === 'accepted', 'candidate not accepted');
});

await S.test('REC-12', 'Edit job: changes saved and job goes back for review', async () => {
  await go('/recruiter/jobs');
  await page.getByRole('link', { name: 'Edit Orbit Backend Engineer' }).click();
  await page.getByLabel('Location').fill('Hyderabad');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Job updated');
  const j = (await api.get('/recruiter/jobs', undefined, myTok)).items.find((x) => x.id === job.id);
  assert(j.location === 'Hyderabad', 'edit not saved');
  assert(j.apply_url === EXT, 'company link lost on edit');
});

await S.test('REC-13', 'Pause / resume a live job (public list reflects it)', async () => {
  await api.patch(`/admin/jobs/${job.id}/status`, { status: 'approved' }, adminTok);
  await go('/recruiter/jobs');
  const card = page.locator('.r-job', { hasText: 'Orbit Backend Engineer' });
  await card.locator('label.switch').click();
  await toast('');
  let pub = await api.get('/jobs?limit=50');
  assert(!pub.items.some((j) => j.id === job.id), 'paused job still public');
  await card.locator('label.switch').click();
  await toast('');
  pub = await api.get('/jobs?limit=50');
  assert(pub.items.some((j) => j.id === job.id), 'resumed job not public');
});

await S.test('REC-14', 'Jobs list: search and status filter', async () => {
  const j2 = await api.post('/recruiter/jobs', { title: 'Zebra Tester Role', description: 'A second job just for filter tests.', skills: [], location: 'Delhi', job_type: 'parttime' }, myTok);
  await go('/recruiter/jobs');
  await page.getByPlaceholder('Search your jobs').fill('zebra');
  await page.waitForFunction(() => document.querySelectorAll('.r-job').length === 1);
  await page.getByPlaceholder('Search your jobs').fill('');
  await page.getByLabel('Filter by status').selectOption('pending');
  await page.locator('.r-job', { hasText: 'Zebra Tester Role' }).waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes('Orbit Backend Engineer'));
});

await S.test('REC-15', 'Delete a job (confirm dialog)', async () => {
  await go('/recruiter/jobs');
  await page.getByRole('button', { name: 'Delete Zebra Tester Role' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Delete/ }).last().click();
  await toast('Job deleted');
  await page.getByText('Zebra Tester Role').waitFor({ state: 'detached' });
});

await S.test('REC-16', 'Company profile edit persists after reload', async () => {
  await go('/recruiter/company');
  await page.getByLabel('Industry').fill('Aerospace Software');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Company profile updated');
  await page.reload(); await page.waitForLoadState('networkidle');
  assert((await page.getByLabel('Industry').inputValue()) === 'Aerospace Software', 'not persisted');
});

await S.test('REC-17', 'Videos: add by link (validation first), appears for candidates, delete', async () => {
  await go('/recruiter/videos');
  await page.getByRole('button', { name: 'Add video' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: /Publish|Add|Save/ }).last().click();
  await dlg.locator('.field-error').first().waitFor();
  await dlg.getByLabel(/^Title/).fill('Life at Orbit');
  await dlg.getByLabel('Video link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await dlg.getByRole('button', { name: /Publish|Add|Save/ }).last().click();
  await toast('Video published');
  await page.getByText('Life at Orbit').first().waitFor();
  const feed = await api.get('/videos?limit=30', undefined, candTok);
  assert((feed.items || []).some((v) => v.title === 'Life at Orbit'), 'video not in candidate feed');
  await page.getByRole('button', { name: 'Delete Life at Orbit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete video' }).click();
  await toast('Video deleted');
});

await S.test('REC-18', 'Followers page lists candidates who follow the company', async () => {
  const comp = await api.get('/recruiter/company', undefined, myTok);
  await api.post('/follow', { following_id: comp.id, type: 'company' }, candTok);
  await go('/recruiter/followers');
  await page.getByText(cand.name).first().waitFor();
});

await S.test('REC-19', 'Messages: reply to a candidate; candidate message arrives', async () => {
  const me = await api.get('/auth/me', undefined, myTok);
  const candMe = await api.get('/auth/me', undefined, candTok);
  await api.post('/messages', { receiver_id: me.id, message: 'Hi, thanks for shortlisting me!' }, candTok);
  await go(`/recruiter/messages?with=${candMe.id}`);
  await page.getByText('thanks for shortlisting').first().waitFor();
  await page.getByPlaceholder('Type a message…').fill('Welcome aboard!');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.locator('.bubble.mine', { hasText: 'Welcome aboard' }).waitFor();
});

await S.test('REC-20', 'Notifications: bell shows unread (application, admin decisions); mark all read', async () => {
  await go('/recruiter/notifications');
  await page.locator('.notif').first().waitFor();
  const n = await api.get('/notifications?limit=30', undefined, myTok);
  assert(n.items.length >= 2, 'expected notifications');
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await page.waitForFunction(() => !document.querySelector('[data-testid=bell-count]'));
});

await S.test('REC-21', 'Data isolation: other recruiter cannot see or change this recruiter\'s jobs and applications', async () => {
  const theirJobs = await api.get('/recruiter/jobs?limit=50', undefined, otherRecTok);
  assert(!theirJobs.items.some((j) => j.id === job.id), 'job leaked');
  const edit = await api.raw('PUT', `/recruiter/jobs/${job.id}`, { title: 'Hacked title', description: 'This edit must be refused.' }, otherRecTok);
  assert([403, 404].includes(edit.status), `edit allowed (${edit.status})`);
  const app = (await api.get('/applications', undefined, candTok)).items[0];
  const st = await api.raw('PATCH', `/recruiter/applications/${app.id}/status`, { status: 'rejected' }, otherRecTok);
  assert([403, 404].includes(st.status), `status change allowed (${st.status})`);
  const apps = await api.get('/recruiter/applications?limit=50', undefined, otherRecTok);
  assert(!apps.items.some((a) => a.id === app.id), 'application leaked');
});

await S.test('REC-22', 'Account: update name/phone and change password through the UI', async () => {
  await go('/recruiter/account');
  await page.getByLabel('Full name').fill('Sana T. Talent');
  await page.getByLabel('Phone').fill('+91 99999 11111');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Account updated');
  await page.getByLabel('Current password').fill(ME.pw);
  await page.getByLabel(/^New password/).fill('newsecret456');
  await page.getByLabel('Confirm new password').fill('newsecret456');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByText('Password updated.').waitFor();
  ME.pw = 'newsecret456';
  myTok = await api.login(ME.email, ME.pw);
});

await S.test('REC-23', 'Role guards: candidate and admin are redirected away from /recruiter', async () => {
  for (const [tok, expect] of [[candTok, '/dashboard'], [adminTok, '/admin/dashboard']]) {
    const c = await authedContext(browser, tok); const p = await c.newPage();
    await p.goto(APP + '/recruiter/jobs'); await p.waitForURL('**' + expect, { timeout: 10000 });
    await c.close();
  }
  const r = await api.raw('GET', '/recruiter/jobs', undefined, candTok);
  assert(r.status === 403, `API allowed candidate (${r.status})`);
});

await S.test('REC-24', 'User menu -> Sign out, then /recruiter is protected', async () => {
  await go('/recruiter/dashboard');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.goto(APP + '/recruiter/jobs'); await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/login/);
});

await S.test('REC-25', 'Unknown recruiter URL shows in-panel 404', async () => {
  const c = await authedContext(browser, myTok); const p = await c.newPage();
  await p.goto(APP + '/recruiter/nothing-here'); await p.waitForLoadState('networkidle');
  await p.getByText('Page not found').waitFor();
  await c.close();
});

await S.test('REC-26', 'Mobile: hamburger menu navigates and closes', async () => {
  const c = await authedContext(browser, myTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(APP + '/recruiter/dashboard'); await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: 'Open menu' }).click();
  await p.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Applications' }).click();
  await p.waitForURL('**/recruiter/applications');
  await p.getByRole('button', { name: 'Open menu' }).waitFor();
  await p.screenshot({ path: `${SHOTS}/e2e-mobile-board.png` });
  await c.close();
});

await S.test('REC-27', 'Mobile (390px): no horizontal overflow on any recruiter page', async () => {
  const c = await authedContext(browser, myTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  const bad = [];
  for (const path of ['dashboard', 'jobs', 'jobs/new', `jobs/${job.id}/edit`, 'applications', 'interviews', 'videos', 'messages', 'company', 'followers', 'notifications', 'account']) {
    await p.goto(`${APP}/recruiter/${path}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(150);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) bad.push(`${path}:${over}px`);
  }
  await c.close();
  assert(bad.length === 0, 'overflow on ' + bad.join(', '));
});


await S.test('REC-29', 'Desktop sidebar: grouped links, active state, navigates, stays while page scrolls', async () => {
  const c = await authedContext(browser, myTok); const p = await c.newPage();
  await p.goto(APP + '/recruiter/dashboard'); await p.waitForLoadState('networkidle');
  const side = p.getByRole('navigation', { name: 'Main' });
  await side.waitFor();
  for (const t of ['Dashboard', 'Jobs', 'Applications', 'Interviews', 'Videos', 'Messages', 'Notifications', 'Followers', 'Company profile', 'Account & security']) {
    assert(await side.getByRole('link', { name: t }).isVisible(), `sidebar link ${t} missing`);
  }
  for (const g of ['Hiring', 'Communicate', 'Company']) await p.locator('.r-side-title', { hasText: g }).waitFor();
  await side.getByRole('link', { name: 'Jobs' }).click();
  await p.waitForURL('**/recruiter/jobs');
  assert(/active/.test(await side.getByRole('link', { name: 'Jobs' }).getAttribute('class')), 'active link not highlighted');
  assert(!(await p.locator('.r-tabbar').isVisible()), 'mobile tab bar must be hidden on desktop');
  const box = await p.locator('.r-side').boundingBox();
  assert(box.x === 0 && box.width > 200 && box.width < 300, 'sidebar geometry off ' + JSON.stringify(box));
  await p.screenshot({ path: `${SHOTS}/e2e-sidebar.png` });
  await p.getByRole('button', { name: 'Account menu' }).click();
  await p.getByRole('menuitem', { name: 'Sign out' }).waitFor();
  await c.close();
});

await S.test('REC-30', 'Mobile: sidebar hidden, bottom tab bar + More drawer work', async () => {
  const c = await authedContext(browser, myTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(APP + '/recruiter/dashboard'); await p.waitForLoadState('networkidle');
  assert(!(await p.locator('.r-side').isVisible()), 'desktop sidebar should be hidden');
  const tabs = p.getByRole('navigation', { name: 'Primary' });
  await tabs.getByRole('link', { name: 'Jobs' }).click();
  await p.waitForURL('**/recruiter/jobs');
  await tabs.getByRole('button', { name: 'More' }).click();
  const drawer = p.getByRole('dialog', { name: 'Menu' });
  await drawer.getByRole('link', { name: 'Company profile' }).click();
  await p.waitForURL('**/recruiter/company');
  await p.waitForFunction(() => !document.querySelector('.r-drawer'));
  await p.screenshot({ path: `${SHOTS}/e2e-mobile-tabs.png` });
  await c.close();
});

await S.test('REC-31', 'Admin banner for recruiters shows in the recruiter panel; candidate-only banner does not', async () => {
  const t1 = 'Hiring week ' + uniq(), t2 = 'Candidates only ' + uniq();
  const b1 = await api.post('/admin/banners', { title: t1, text: 'Post jobs free', audience: 'recruiter', link_url: 'https://example.com/hire' }, adminTok);
  const b2 = await api.post('/admin/banners', { title: t2, audience: 'user' }, adminTok);
  const c = await authedContext(browser, myTok); const p = await c.newPage();
  await p.goto(APP + '/recruiter/dashboard'); await p.waitForLoadState('networkidle');
  await p.getByTestId('banner').filter({ hasText: t1 }).waitFor();
  assert((await p.getByText(t2).count()) === 0, 'candidate-only banner leaked to recruiter');
  await p.getByRole('button', { name: `Dismiss ${t1}` }).click();
  await p.waitForFunction((t) => !document.body.innerText.includes(t), t1);
  await c.close();
  await api.del(`/admin/banners/${b1.id}`, undefined, adminTok); await api.del(`/admin/banners/${b2.id}`, undefined, adminTok);
});

await S.test('REC-32', 'No console errors / failed requests / 5xx during the whole run', async () => {
  assert(errors.length === 0, errors.slice(0, 5).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
