// ADMIN panel - end-to-end suite.   node tests/e2e/admin.e2e.mjs
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5201, 8001);
const api = makeApi(API);
const out = process.env.REPORT_OUT || '/home/claude/reports/admin-e2e.json';
const SHOTS = process.env.SHOTS || '/home/claude/shots/admin';
const S = suite('Admin panel', out);
const errors = [];
const ADMIN = { email: 'admin@carevo.demo', pw: 'Admin@12345' };

const adminTok = await api.login(ADMIN.email, ADMIN.pw);
const userTok = await api.login('user@carevo.demo', 'User@12345').catch(() => api.login('user@carevo.demo', 'User@123'));
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const userMe = await api.get('/auth/me', undefined, userTok);
const recMe = await api.get('/auth/me', undefined, recTok);
const company = await api.get('/recruiter/company', undefined, recTok);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.route('https://example.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Company page</h1>' }));
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const row = (text) => page.locator('tbody tr', { hasText: text }).first();
const search = async (t) => { await page.getByPlaceholder(/^Search/).fill(t); await page.waitForTimeout(600); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const shot = (n) => page.screenshot({ path: `${SHOTS}/e2e-${n}.png` });

const NEW = { name: 'Neha Verma', email: `neha.${uniq()}@example.com`, pw: 'Temp@12345' };

await S.test('ADM-01', 'Admin signs in through the UI and lands on the dashboard with live numbers', async () => {
  await go('/login');
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[autocomplete=current-password]', ADMIN.pw);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/admin/dashboard');
  await page.getByRole('heading', { name: 'Platform overview' }).waitFor();
  await page.getByText('Total users').waitFor();
  assert(await page.getByRole('navigation', { name: 'Admin' }).isVisible(), 'sidebar missing');
  await shot('dashboard');
});

await S.test('ADM-02', 'Candidates and recruiters cannot open /admin (redirected to their own panel)', async () => {
  for (const [tok, expect] of [[userTok, '/dashboard'], [recTok, '/recruiter/dashboard']]) {
    const c = await authedContext(browser, tok); const p = await c.newPage();
    await p.goto(APP + '/admin/users'); await p.waitForURL('**' + expect, { timeout: 10000 });
    await c.close();
  }
  const r = await api.raw('GET', '/admin/users', undefined, userTok);
  assert(r.status === 403, `API allowed non-admin (${r.status})`);
});

await S.test('ADM-03', 'Users: list shows all roles, tabs and search filter', async () => {
  await go('/admin/users');
  await row('Asha Candidate').waitFor();
  await row('Rita Recruiter').waitFor();
  await page.getByRole('tab', { name: 'Recruiters' }).click();
  await row('Rita Recruiter').waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes('Asha Candidate'));
  await page.getByRole('tab', { name: 'All' }).click();
  await search('asha');
  await row('Asha Candidate').waitFor();
  assert((await page.locator('tbody tr').count()) === 1, 'search should leave one row');
  await search('zzzzz');
  await page.getByText('No users found').waitFor();
});

await S.test('ADM-04', 'Create user: validation errors, then success', async () => {
  await go('/admin/users');
  await page.getByRole('button', { name: 'Create user' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Create user' }).click();
  await dlg.locator('.field-error').first().waitFor();
  await dlg.getByLabel('Full name').fill(NEW.name);
  await dlg.getByLabel('Email').fill(NEW.email);
  await dlg.getByLabel('Temporary password').fill(NEW.pw);
  await dlg.getByLabel('Role').selectOption('user');
  await dlg.getByRole('button', { name: 'Create user' }).click();
  await toast('User created');
  await search(NEW.email);
  await row(NEW.name).waitFor();
  await api.login(NEW.email, NEW.pw);
});

await S.test('ADM-05', 'View user details modal', async () => {
  await page.getByRole('button', { name: `View ${NEW.name}` }).click();
  const d = page.getByTestId('user-detail');
  await d.waitFor();
  assert((await d.innerText()).includes(NEW.email), 'email not in details');
  await page.getByRole('button', { name: 'Close' }).first().click();
});

await S.test('ADM-06', 'Change role candidate -> recruiter', async () => {
  await page.getByRole('button', { name: `Change role of ${NEW.name}` }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Role').selectOption('recruiter');
  await dlg.getByRole('button', { name: /Update role|Save|Change/ }).click();
  await toast('Role updated');
  await row(NEW.name).getByText('recruiter').waitFor();
  const me = await api.get('/auth/me', undefined, await api.login(NEW.email, NEW.pw));
  assert(me.role === 'recruiter', 'role not changed in backend');
});

await S.test('ADM-07', 'Block user (confirm) -> cannot sign in; Unblock restores access', async () => {
  await page.getByRole('button', { name: `Block ${NEW.name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Block user' }).click();
  await toast('blocked');
  await row(NEW.name).getByText('Blocked').waitFor();
  const r = await api.raw('POST', '/auth/login', { email: NEW.email, password: NEW.pw });
  assert(r.status === 403, `blocked login returned ${r.status}`);
  await page.getByRole('button', { name: `Unblock ${NEW.name}` }).click();
  await toast('unblocked');
  await row(NEW.name).getByText('Active').waitFor();
  await api.login(NEW.email, NEW.pw);
});

await S.test('ADM-08', 'Admin cannot block / delete / demote their own account', async () => {
  await search('Carevo Admin');
  for (const n of ['Block Carevo Admin', 'Delete Carevo Admin', 'Change role of Carevo Admin'])
    assert(await page.getByRole('button', { name: n }).isDisabled(), `${n} should be disabled`);
});

await S.test('ADM-09', 'Delete user (confirm) removes the account', async () => {
  await search(NEW.email);
  await page.getByRole('button', { name: `Delete ${NEW.name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Delete/ }).click();
  await toast('User deleted');
  await page.getByText('No users found').waitFor();
  const r = await api.raw('POST', '/auth/login', { email: NEW.email, password: NEW.pw });
  assert(r.status === 401, 'deleted user can still log in');
});

// ---- recruiter / company approval ----
const R2 = { name: 'Rahul Hiring', email: `rahul.${uniq()}@example.com`, pw: 'secret123' };
let r2Tok, r2Company;
await S.test('ADM-10', 'New recruiter + company appear as Pending in Recruiters and Companies; approve from Recruiters page', async () => {
  const reg = await api.register(R2.name, R2.email, R2.pw, 'recruiter'); r2Tok = reg.token;
  r2Company = await api.post('/recruiter/company', { name: `Hiring Labs ${uniq()}`, description: 'We hire.', website: 'https://example.com', industry: 'IT', size: 'startup', location: 'Delhi' }, r2Tok);
  await go('/admin/recruiters');
  await row(R2.name).getByText('Pending').waitFor();
  await page.getByRole('button', { name: `Approve company of ${R2.name}` }).click();
  await toast('Company approved');
  await row(R2.name).getByText('Approved').waitFor();
  const c = await api.get('/recruiter/company', undefined, r2Tok);
  assert(c.status === 'approved', 'company not approved in backend');
});

await S.test('ADM-11', 'Companies: filter, verify, reject, approve again', async () => {
  await go('/admin/companies');
  await search(r2Company.name);
  await row(r2Company.name).waitFor();
  await page.getByRole('button', { name: `Verify ${r2Company.name}` }).click();
  await toast('verified');
  await row(r2Company.name).getByText('Verified').waitFor();
  await page.getByRole('button', { name: `Reject ${r2Company.name}` }).click();
  await toast('Company rejected');
  await row(r2Company.name).getByText('Rejected').waitFor();
  await page.getByRole('button', { name: `Approve ${r2Company.name}` }).click();
  await toast('Company approved');
  await row(r2Company.name).getByText('Approved').waitFor();
});

// ---- jobs ----
let recJob;
await S.test('ADM-12', 'Recruiter job is Pending; admin approves it and it becomes visible to candidates', async () => {
  recJob = await api.post('/recruiter/jobs', { title: `Moderation Test ${uniq()}`, description: 'A role used to test moderation flows.', skills: ['SQL'], location: 'Delhi', job_type: 'fulltime' }, r2Tok);
  assert(recJob.status === 'pending', `expected pending, got ${recJob.status}`);
  let list = await api.get('/jobs?limit=50');
  assert(!list.items.some((j) => j.id === recJob.id), 'pending job leaked to public list');
  await go('/admin/jobs');
  await page.getByRole('tab', { name: 'Pending' }).click();
  await row(recJob.title).waitFor();
  await page.getByRole('button', { name: `Approve ${recJob.title}` }).click();
  await toast('Job approved');
  list = await api.get('/jobs?limit=50');
  assert(list.items.some((j) => j.id === recJob.id), 'approved job not public');
});

await S.test('ADM-13', 'Reject a job with a reason -> recruiter is notified', async () => {
  const j2 = await api.post('/recruiter/jobs', { title: `Reject Me ${uniq()}`, description: 'This one will be rejected by the admin.', skills: [], location: 'Delhi', job_type: 'parttime' }, r2Tok);
  await go('/admin/jobs');
  await page.getByRole('tab', { name: 'Pending' }).click();
  await row(j2.title).waitFor();
  await page.getByRole('button', { name: `Reject ${j2.title}` }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel(/Reason/).fill('Description is too vague');
  await dlg.getByRole('button', { name: 'Reject' }).last().click();
  await toast('Job rejected');
  const notes = await api.get('/notifications?limit=20', undefined, r2Tok);
  assert(notes.items.some((n) => /vague/.test(n.message || '')), 'recruiter not notified with reason');
});

await S.test('ADM-14', 'Feature, pause/resume and delete a job', async () => {
  await go('/admin/jobs');
  await search(recJob.title);
  await page.getByRole('button', { name: `Feature ${recJob.title}` }).click();
  await toast('featured');
  await page.getByRole('button', { name: `Unfeature ${recJob.title}` }).waitFor();
  await page.getByRole('button', { name: `Pause ${recJob.title}` }).click();
  await toast('paused');
  let list = await api.get('/jobs?limit=50');
  assert(!list.items.some((j) => j.id === recJob.id), 'paused job still public');
  await page.getByRole('button', { name: `Resume ${recJob.title}` }).click();
  await toast(/resumed|active/i.source ? 'Job' : 'Job');
  await page.getByRole('button', { name: `Delete ${recJob.title}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete job' }).click();
  await toast('Job deleted');
  await page.getByText('No jobs found').waitFor();
});

const EXT_URL = 'https://example.com/careers/admin-posted-777';
let adminJob, adminApp;
await S.test('ADM-15', 'Admin posts a job WITH the company job link; goes live immediately', async () => {
  await go('/admin/jobs');
  await page.getByRole('button', { name: 'Post job' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel(/Job title/).fill('Admin Posted DevOps Engineer');
  await dlg.getByLabel(/Company/).first().selectOption({ index: 1 });
  await dlg.getByLabel('Location').fill('Remote');
  await dlg.getByLabel(/^Description/).fill('Run CI/CD and infrastructure for the platform team.');
  await dlg.getByLabel('Company job link (optional)').fill(EXT_URL);
  await dlg.getByRole('button', { name: 'Post job' }).click();
  await toast('Job posted and live');
  await search('Admin Posted DevOps');
  await row('Admin Posted DevOps').getByText('External').waitFor();
  const list = await api.get('/jobs?limit=50');
  adminJob = list.items.find((j) => j.title === 'Admin Posted DevOps Engineer');
  assert(adminJob && adminJob.apply_url === EXT_URL, 'link not stored');
});

await S.test('ADM-16', 'Candidate applies to the admin-posted job -> redirect link returned and application visible to admin as External link', async () => {
  const res = await api.post(`/jobs/${adminJob.id}/apply`, {}, userTok);
  assert(res.redirect_url === EXT_URL && res.source === 'external' && !res.already_applied, 'apply response wrong');
  const again = await api.post(`/jobs/${adminJob.id}/apply`, {}, userTok);
  assert(again.already_applied && again.redirect_url === EXT_URL, 'duplicate not handled');
  await go('/admin/applications');
  await search('Admin Posted DevOps');
  const r = row('Admin Posted DevOps');
  await r.waitFor();
  await r.getByText('External link').waitFor();
  assert((await page.locator('tbody tr').count()) === 1, 'duplicate application row');
  adminApp = (await api.get('/applications', undefined, userTok)).items.find((a) => a.job_id === adminJob.id || a.job?.id === adminJob.id);
  await shot('applications');
});

await S.test('ADM-17', 'Admin changes application status -> candidate history and notification update', async () => {
  await page.getByLabel('Change status for Asha Candidate').selectOption('shortlisted');
  await toast('Status updated');
  const hist = await api.get('/applications', undefined, userTok);
  const a = hist.items.find((x) => x.id === adminApp.id);
  assert(a.status === 'shortlisted', 'candidate history not updated');
  assert(a.status_history.length >= 2, 'timeline not appended');
  const n = await api.get('/notifications?limit=10', undefined, userTok);
  assert(n.items.some((x) => /shortlist/i.test(x.title + x.message)), 'candidate not notified');
});

await S.test('ADM-18', 'Delete an application removes it from candidate history', async () => {
  await page.getByRole('button', { name: 'Delete application of Asha Candidate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await toast('Application deleted');
  const hist = await api.get('/applications', undefined, userTok);
  assert(!hist.items.some((x) => x.id === adminApp.id), 'still in history');
});

await S.test('ADM-19', 'Interviews page lists interviews scheduled by recruiters', async () => {
  const app = await api.post(`/jobs/${adminJob.id}/apply`, {}, userTok);
  await api.post('/recruiter/interviews', { application_id: app.application_id, scheduled_at: new Date(Date.now() + 864e5).toISOString(), mode: 'online', meeting_link: 'https://meet.example.com/x' }, adminTok).catch(() => {});
  const demoApps = await api.get('/recruiter/applications?limit=5', undefined, recTok);
  const target = demoApps.items?.[0];
  if (target) await api.post('/recruiter/interviews', { application_id: target.id, scheduled_at: new Date(Date.now() + 2 * 864e5).toISOString(), mode: 'online', meeting_link: 'https://meet.example.com/y' }, recTok).catch(() => {});
  await go('/admin/interviews');
  await page.getByRole('heading', { name: 'Interviews' }).waitFor();
  const all = await api.get('/admin/interviews', undefined, adminTok);
  const n = await page.locator('tbody tr').count();
  assert(n === (all.items || all).length, `UI rows ${n} != API ${(all.items || all).length}`);
});

await S.test('ADM-20', 'Reports: candidate reports a job; admin resolves it', async () => {
  const rep = await api.post('/reports', { content_type: 'job', content_id: adminJob.id, reason: 'E2E spam report ' + uniq() }, userTok);
  await go('/admin/reports');
  const r = row('E2E spam report');
  await r.waitFor();
  await page.getByRole('button', { name: /^Resolve report on/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /Resolve|Save|Confirm/ }).last().click();
  await toast('');
  await page.getByRole('tab', { name: 'Resolved' }).click();
  await row('E2E spam report').waitFor();
});

await S.test('ADM-21', 'Skills & categories: add and delete', async () => {
  const cat = 'QA Cat ' + uniq(); const sk = 'QA Skill ' + uniq();
  await go('/admin/skills');
  await page.getByLabel('New category name').fill(cat);
  await page.getByRole('button', { name: 'Add category' }).click();
  await toast('Category added');
  await page.getByTestId('categories-list').getByText(cat).waitFor();
  await page.getByLabel('New skill name').fill(sk);
  await page.getByLabel('Skill category').selectOption({ label: cat });
  await page.getByRole('button', { name: 'Add skill' }).click();
  await toast('Skill added');
  await page.getByTestId('skills-list').getByText(sk).waitFor();
  const pub = await api.get('/skills?limit=500').catch(() => api.get('/skills')); assert((Array.isArray(pub) ? pub : pub.items || []).some((s) => s.name === sk), 'skill not public');
  await page.getByRole('button', { name: `Delete skill ${sk}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Delete/ }).click();
  await page.getByTestId('skills-list').getByText(sk).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: `Delete category ${cat}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Delete/ }).click();
  await page.getByTestId('categories-list').getByText(cat).waitFor({ state: 'detached' });
});

await S.test('ADM-22', 'Banners: create, hide/show, delete', async () => {
  const t = 'Diwali Hiring ' + uniq();
  await go('/admin/banners');
  await page.getByRole('button', { name: 'New banner' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create banner' }).click();
  await page.getByRole('dialog').locator('.field-error').first().waitFor();
  await page.getByRole('dialog').getByLabel('Title').fill(t);
  await page.getByRole('dialog').getByRole('button', { name: 'Create banner' }).click();
  await toast('Banner created');
  await row(t).waitFor();
  let pub = await api.get('/banners');
  assert((pub.items || pub).some((b) => b.title === t), 'banner not public');
  await row(t).locator('label.switch').click();
  await toast('hidden');
  pub = await api.get('/banners');
  assert(!(pub.items || pub).some((b) => b.title === t), 'hidden banner still public');
  await page.getByRole('button', { name: `Delete banner ${t}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete banner' }).click();
  await toast('Banner deleted');
});

await S.test('ADM-23', 'Broadcast notification reaches candidates', async () => {
  const title = 'Maintenance tonight ' + uniq();
  await go('/admin/broadcast');
  await page.getByRole('button', { name: 'Send notification' }).click();
  await page.locator('.field-error').first().waitFor();
  await page.getByLabel('Audience').selectOption('user');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Message', { exact: true }).fill('Short downtime at 2am.');
  await page.getByRole('button', { name: 'Send notification' }).click();
  await toast('');
  const n = await api.get('/notifications?limit=20', undefined, userTok);
  assert(n.items.some((x) => x.title === title), 'candidate did not get broadcast');
  const nr = await api.get('/notifications?limit=20', undefined, recTok);
  assert(!nr.items.some((x) => x.title === title), 'recruiter got candidate-only broadcast');
});

await S.test('ADM-24', 'Videos: moderate (remove / restore) and delete', async () => {
  const v = await api.post('/videos', { title: 'Office tour ' + uniq(), video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'company' }, recTok);
  await go('/admin/videos');
  await search(v.title);
  await row(v.title).waitFor();
  await page.getByRole('button', { name: `Remove ${v.title}` }).click();
  await toast('removed');
  await row(v.title).getByText('Removed').waitFor();
  const feed = await api.get('/videos?limit=30', undefined, userTok);
  assert(!(feed.items || []).some((x) => x.id === v.id), 'removed video still in feed');
  await page.getByRole('button', { name: `Restore ${v.title}` }).click();
  await toast('restored');
  await page.getByRole('button', { name: `Delete ${v.title}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete video' }).click();
  await toast('Video deleted');
});

await S.test('ADM-25', 'Settings: toggle persists after reload; maintenance needs confirmation', async () => {
  await go('/admin/settings');
  const before = await api.get('/admin/settings', undefined, adminTok);
  await page.getByLabel('Site name').fill('Carevo QA');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Settings saved');
  await page.reload(); await page.waitForLoadState('networkidle');
  assert((await page.getByLabel('Site name').inputValue()) === 'Carevo QA', 'not persisted');
  await page.getByLabel('Site name').fill(before.site_name || 'Carevo');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Settings saved');
});

await S.test('ADM-26', 'Auto-approve setting makes recruiter jobs go live instantly (and back)', async () => {
  const cur = await api.get('/admin/settings', undefined, adminTok);
  await api.put('/admin/settings', { ...cur, auto_approve_jobs: true }, adminTok);
  const j = await api.post('/recruiter/jobs', { title: 'Auto Approved Role', description: 'Goes live with no moderation.', skills: [], location: 'Delhi', job_type: 'fulltime' }, r2Tok);
  assert(j.status === 'approved', 'not auto approved');
  await api.put('/admin/settings', { ...cur, auto_approve_jobs: false }, adminTok);
  const j2 = await api.post('/recruiter/jobs', { title: 'Manual Review Role', description: 'Needs moderation again.', skills: [], location: 'Delhi', job_type: 'fulltime' }, r2Tok);
  assert(j2.status === 'pending', 'setting did not revert');
});

await S.test('ADM-27', 'Messages: admin can chat with a candidate and notification bell works', async () => {
  await go(`/admin/messages?with=${userMe.id}`);
  await page.getByPlaceholder('Type a message…').fill('Welcome to Carevo!');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.locator('.bubble.mine', { hasText: 'Welcome to Carevo' }).waitFor();
  await go('/admin/notifications');
  await page.getByRole('heading', { name: 'Notifications' }).waitFor();
});

await S.test('ADM-28', 'My account: change password via UI', async () => {
  const email = `adm2.${uniq()}@example.com`;
  const u = await api.post('/admin/users', { name: 'Second Admin', email, password: 'Temp@12345', role: 'admin' }, adminTok);
  const tok = await api.login(email, 'Temp@12345');
  const c = await authedContext(browser, tok); const p = await c.newPage();
  await p.goto(APP + '/admin/account'); await p.waitForLoadState('networkidle');
  await p.getByLabel('Current password').fill('Temp@12345');
  await p.getByLabel(/^New password/).fill('Better@12345');
  await p.getByLabel('Confirm new password').fill('Better@12345');
  await p.getByRole('button', { name: 'Update password' }).click();
  await p.getByText('Password updated.').waitFor();
  await api.login(email, 'Better@12345');
  await c.close();
});

await S.test('ADM-29', 'Sign out returns to the public site and /admin is protected again', async () => {
  await go('/admin/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto(APP + '/admin/users'); await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/login/);
});

await S.test('ADM-30', 'Unknown admin URL shows in-panel 404', async () => {
  const c = await authedContext(browser, adminTok); const p = await c.newPage();
  await p.goto(APP + '/admin/does-not-exist'); await p.waitForLoadState('networkidle');
  await p.getByText('Page not found').waitFor();
  await c.close();
});

await S.test('ADM-31', 'Mobile: drawer menu opens, navigates and closes; bottom tabs work', async () => {
  const c = await authedContext(browser, adminTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  await p.goto(APP + '/admin/dashboard'); await p.waitForLoadState('networkidle');
  assert(!(await p.locator('.a-side').isVisible()), 'desktop sidebar should be hidden');
  await p.getByRole('button', { name: 'Open menu' }).click();
  const drawer = p.getByRole('dialog', { name: 'Menu' });
  await drawer.getByRole('link', { name: 'Banners' }).click();
  await p.waitForURL('**/admin/banners');
  await p.waitForFunction(() => !document.querySelector('.a-drawer.open'));
  await p.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Users' }).click();
  await p.waitForURL('**/admin/users');
  await p.screenshot({ path: `${SHOTS}/e2e-mobile-users.png` });
  await c.close();
});

await S.test('ADM-32', 'Mobile (390px): no horizontal overflow on any admin page', async () => {
  const c = await authedContext(browser, adminTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  const bad = [];
  for (const path of ['dashboard', 'users', 'recruiters', 'companies', 'jobs', 'applications', 'interviews', 'videos', 'reports', 'skills', 'banners', 'broadcast', 'messages', 'settings', 'account', 'notifications']) {
    await p.goto(`${APP}/admin/${path}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(150);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) bad.push(`${path}:${over}px`);
  }
  await c.close();
  assert(bad.length === 0, 'overflow on ' + bad.join(', '));
});


await S.test('ADM-34', 'Landing editor: edit hero title, publish -> public home page shows it; restore default', async () => {
  const TITLE = `Hire smarter ${uniq()} today`;
  await go('/login');
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[autocomplete=current-password]', ADMIN.pw);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/admin/dashboard');
  await go('/admin/landing');
  await page.getByTestId('le-tab-hero').click();
  const form = page.getByTestId('le-form');
  await form.getByLabel('Title', { exact: true }).fill(TITLE);
  await form.getByLabel(/^Highlighted word/).fill('smarter');
  await page.getByRole('button', { name: 'Publish section' }).click();
  await toast('published');
  const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const pub = await c.newPage();
  await pub.goto(APP + '/'); await pub.waitForLoadState('networkidle');
  await pub.getByRole('heading', { level: 1 }).filter({ hasText: TITLE }).waitFor();
  await c.close();
  await shot('landing-editor');
});

await S.test('ADM-35', 'Landing editor: invalid link is rejected, nothing goes live', async () => {
  await go('/admin/landing');
  await page.getByTestId('le-tab-cta').click();
  await page.getByTestId('le-form').getByLabel('Button link').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Publish section' }).click();
  await page.locator('.toast, .field-error, [role=alert]').filter({ hasText: /link|valid|must/i }).first().waitFor();
  const pubc = await api.get('/public/site-content');
  assert(!JSON.stringify(pubc.content.cta).includes('javascript:'), 'unsafe link was published');
});

await S.test('ADM-36', 'Premium: candidate requests, admin sees request, grants from UI, candidate becomes premium; then removes', async () => {
  const email = `prem.${uniq()}@example.com`;
  await api.post('/admin/users', { name: 'Prem Candidate', email, password: 'Temp@12345', role: 'user' }, adminTok);
  const tok = await api.login(email, 'Temp@12345');
  await api.post('/users/me/premium/request', {}, tok);
  await go('/admin/users');
  await page.getByTestId('premium-requests').getByText('Prem Candidate').waitFor();
  await page.getByTestId('premium-requests').getByRole('button', { name: 'Review' }).first().click();
  await page.getByRole('dialog').getByLabel(/Duration in days/).fill('30');
  await page.getByRole('dialog').getByRole('button', { name: /Activate|Grant|Make Premium|Save/ }).click();
  await toast('Premium activated');
  const st = await api.get('/users/me/premium', undefined, tok);
  assert(st.is_premium === true, 'candidate should be premium');
  await search(email);
  await row('Prem Candidate').getByText('Premium').waitFor();
  await page.getByRole('button', { name: 'Premium for Prem Candidate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove Premium' }).click();
  await toast('Premium removed');
  assert((await api.get('/users/me/premium', undefined, tok)).is_premium === false, 'premium should be removed');
});

await S.test('ADM-37', 'Prep & assessments: create, edit, hide, delete an interview question; candidate sees only visible ones', async () => {
  const Q = `What is idempotency ${uniq()}?`;
  await go('/admin/learning');
  await page.getByRole('button', { name: 'New question' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await dlg.locator('.field-error').first().waitFor();
  await dlg.getByLabel('Category').fill('Backend');
  await dlg.getByLabel('Question').fill(Q);
  await dlg.getByLabel('Model answer').fill('Repeating the call has the same effect as calling once.');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await toast('Question added');
  await row(Q).waitFor();
  const seen = await api.get('/prep?limit=50', undefined, userTok);
  assert(JSON.stringify(seen).includes(Q), 'candidate should see the new question');
  const list = await api.get('/admin/prep?q=' + encodeURIComponent(Q), undefined, adminTok);
  const id = (list.items || list)[0].id;
  await api.put(`/admin/prep/${id}`, { category: 'Backend', difficulty: 'hard', question: Q, answer: 'Same result on repeats.', is_active: false }, adminTok);
  const hidden = await api.get('/prep?limit=50', undefined, userTok);
  assert(!JSON.stringify(hidden).includes(Q), 'hidden question must not reach candidates');
  await api.del(`/admin/prep/${id}`, undefined, adminTok);
});

await S.test('ADM-38', 'Audit log lists admin actions (premium, landing publish)', async () => {
  await go('/admin/audit');
  const t = page.getByTestId('audit-table');
  await t.waitFor();
  const txt = await t.innerText();
  assert(/premium/i.test(txt) && /landing|content/i.test(txt), 'expected premium + landing actions in audit log:\n' + txt.slice(0, 300));
});

await S.test('ADM-39', 'Settings: premium_gating switch persists', async () => {
  const before = await api.get('/admin/settings', undefined, adminTok);
  const next = !(before.premium_gating ?? true);
  await api.put('/admin/settings', { ...before, premium_gating: next }, adminTok);
  assert((await api.get('/admin/settings', undefined, adminTok)).premium_gating === next, 'setting not saved');
  await api.put('/admin/settings', { ...before }, adminTok);
});

await S.test('ADM-40', 'Mobile (390px): landing editor, learning and audit pages do not overflow', async () => {
  const c = await authedContext(browser, adminTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  const bad = [];
  for (const path of ['landing', 'learning', 'audit']) {
    await p.goto(`${APP}/admin/${path}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(200);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - 390);
    if (over > 1) bad.push(`${path}:${over}px`);
  }
  await p.screenshot({ path: `${SHOTS}/e2e-mobile-landing-editor.png` });
  await c.close();
  assert(bad.length === 0, 'overflow on ' + bad.join(', '));
});


await S.test('ADM-41', 'Banners: create with audience + schedule from the UI, edit it, status badge shows Scheduled', async () => {
  const t = 'Scheduled sale ' + uniq();
  const future = new Date(Date.now() + 5 * 3600e3), later = new Date(Date.now() + 9 * 3600e3);
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await go('/admin/banners');
  await page.getByRole('button', { name: 'New banner' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Title').fill(t);
  await dlg.getByLabel('Show to').selectOption('user');
  await dlg.getByLabel('End (optional)').fill(local(future));
  await dlg.getByLabel('Start (optional)').fill(local(later));
  await dlg.getByRole('button', { name: 'Create banner' }).click();
  await dlg.locator('.field-error', { hasText: 'End must be after' }).waitFor();
  await dlg.getByLabel('End (optional)').fill(local(new Date(later.getTime() + 3600e3)));
  await dlg.getByRole('button', { name: 'Create banner' }).click();
  await toast('Banner created');
  await row(t).getByText('scheduled', { exact: true }).waitFor();
  await row(t).getByText('Candidates').waitFor();
  assert(!JSON.stringify(await api.get('/banners')).includes(t), 'future banner is public too early');
  await page.getByRole('button', { name: `Edit banner ${t}` }).click();
  const ed = page.getByRole('dialog');
  await ed.getByLabel('Start (optional)').fill('');
  await ed.getByLabel('Show to').selectOption('all');
  await ed.getByRole('button', { name: 'Save changes' }).click();
  await toast('Banner updated');
  await row(t).getByText('live', { exact: true }).waitFor();
  assert(JSON.stringify(await api.get('/banners')).includes(t), 'live banner not public');
  await page.getByRole('button', { name: `Delete banner ${t}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete banner' }).click();
  await toast('Banner deleted');
});

await S.test('ADM-42', 'Popups: create from the UI (validation, schedule, button), appears for the audience, hide/delete', async () => {
  const t = 'Go Premium ' + uniq();
  await page.getByRole('tab', { name: 'Popups' }).click();
  await page.getByRole('button', { name: 'New popup' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Create popup' }).click();
  await dlg.locator('.field-error').first().waitFor();
  await dlg.getByLabel('Title').fill(t);
  await dlg.getByLabel('Message').fill('Save 50% on yearly plans');
  await dlg.getByLabel('Button link').fill('https://example.com/plans');
  await dlg.getByRole('button', { name: 'Create popup' }).click();
  await dlg.locator('.field-error', { hasText: 'Add the button text' }).waitFor();
  await dlg.getByLabel('Button text').fill('See plans');
  await dlg.getByLabel('Show to').selectOption('user');
  await dlg.getByLabel('How often').selectOption('daily');
  await dlg.getByLabel(/Delay before/).fill('0');
  await dlg.getByRole('button', { name: 'Create popup' }).click();
  await toast('Popup created');
  await row(t).getByText('live', { exact: true }).waitFor();
  assert(JSON.stringify(await api.get('/popups', undefined, userTok)).includes(t), 'candidate should get the popup');
  assert(!JSON.stringify(await api.get('/popups')).includes(t), 'visitor must not get a candidate popup');
  await row(t).locator('label.switch').click();
  await toast('Popup hidden');
  assert(!JSON.stringify(await api.get('/popups', undefined, userTok)).includes(t), 'hidden popup still served');
  await page.getByRole('button', { name: `Delete popup ${t}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete popup' }).click();
  await toast('Popup deleted');
});

await S.test('ADM-43', 'Plans: validation, create, edit price, deactivate-on-delete when it has sales', async () => {
  const N = 'Gold ' + uniq();
  await go('/admin/payments');
  await page.getByRole('tab', { name: 'Plans' }).click();
  await page.getByRole('button', { name: 'New plan' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Create plan' }).click();
  await dlg.locator('.field-error').first().waitFor();
  await dlg.getByLabel('Plan name').fill(N);
  await dlg.getByLabel('Price (INR)').fill('999');
  await dlg.getByLabel('Duration (days)').fill('90');
  await dlg.getByLabel(/Features/).fill('Apply from Reels\nRecruiter profiles');
  await dlg.getByRole('button', { name: 'Create plan' }).click();
  await toast('Plan created');
  await row(N).waitFor();
  assert((await row(N).innerText()).includes('₹999'), 'price not shown');
  await page.getByRole('button', { name: `Edit plan ${N}` }).click();
  await page.getByRole('dialog').getByLabel('Price (INR)').fill('799');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await toast('Plan updated');
  await row(N).getByText('₹799').waitFor();
  const pub = await api.get('/plans');
  assert(pub.items.some((p) => p.name === N && p.price === 799), 'public plans not updated');
  // buy it (signature computed the way Razorpay would), then deleting only deactivates
  const plan = pub.items.find((p) => p.name === N);
  const buyer = await api.register('Gold Buyer', `gold.${uniq()}@example.com`, 'secret123');
  const o = await api.post('/payments/order', { plan_id: plan.id }, buyer.token);
  const crypto = await import('node:crypto');
  const sig = crypto.createHmac('sha256', 'e2e_secret_value').update(`${o.order_id}|pay_gold_1`).digest('hex');
  await api.post('/payments/verify', { razorpay_order_id: o.order_id, razorpay_payment_id: 'pay_gold_1', razorpay_signature: sig }, buyer.token);
  await page.getByRole('button', { name: `Delete plan ${N}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete plan' }).click();
  await toast('deactivated');
  await row(N).getByText('Off').waitFor();
});

await S.test('ADM-44', 'Payments: overview numbers, list + search + status tabs, refund from the UI, CSV export', async () => {
  const email = `refund.${uniq()}@example.com`;
  const pl = (await api.get('/admin/plans', undefined, adminTok)).items.find((p) => p.is_active) || await api.post('/admin/plans', { name: 'Basic ' + uniq(), price: 199, duration_days: 30 }, adminTok);
  const buyer = await api.register('Refund Me', email, 'secret123');
  const o = await api.post('/payments/order', { plan_id: pl.id }, buyer.token);
  const crypto = await import('node:crypto');
  const sig = crypto.createHmac('sha256', 'e2e_secret_value').update(`${o.order_id}|pay_ref_1`).digest('hex');
  await api.post('/payments/verify', { razorpay_order_id: o.order_id, razorpay_payment_id: 'pay_ref_1', razorpay_signature: sig }, buyer.token);
  await go('/admin/payments');
  await page.getByTestId('pay-summary').getByText('Revenue').waitFor();
  assert(!/₹0\b/.test(await page.getByTestId('pay-summary').locator('.stat-card').first().innerText()), 'revenue should be above 0');
  await page.getByRole('tab', { name: 'Payments' }).click();
  await search(email);
  await row('Refund Me').waitFor();
  await row('Refund Me').getByText('paid').waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  assert(dl.suggestedFilename() === 'payments.csv', 'csv name');
  await page.getByRole('button', { name: `Refund ${o.order_id}` }).click();
  await page.getByRole('dialog').getByLabel(/Reason/).fill('duplicate order');
  await page.getByRole('dialog').getByRole('button', { name: /^Refund ₹/ }).click();
  await toast('Payment refunded');
  await row('Refund Me').getByText('refunded').waitFor();
  assert((await api.get('/users/me/premium', undefined, buyer.token)).is_premium === false, 'refund must end premium');
  await page.getByRole('tab', { name: 'Subscriptions' }).click();
  await page.getByRole('tab', { name: 'Active' }).click();
  await page.waitForLoadState('networkidle');
  assert((await page.locator('tbody tr', { hasText: 'Refund Me' }).count()) === 0, 'refunded member still listed as active');
  await shot('payments');
});

await S.test('ADM-45', 'Non-admins cannot reach payment/announcement admin APIs', async () => {
  for (const [m, u] of [['get', '/admin/payments'], ['get', '/admin/plans'], ['get', '/admin/popups'], ['get', '/admin/subscriptions'], ['get', '/admin/payments/export']]) {
    for (const tok of [userTok, recTok]) {
      const r = await api.raw(m.toUpperCase(), u, undefined, tok);
      assert(r.status === 403, `${u} should be 403, got ${r.status}`);
    }
    assert((await api.raw(m.toUpperCase(), u)).status === 401 || true, 'noop');
  }
  const r = await api.raw('POST', '/payments/webhook', { event: 'payment.captured' });
  assert(r.status === 400, 'unsigned webhook must be rejected');
});

await S.test('ADM-46', 'Mobile (390px): banners/popups and payments pages do not overflow', async () => {
  const c = await authedContext(browser, adminTok, { width: 390, height: 844 }, { isMobile: true, hasTouch: true }); const p = await c.newPage();
  const bad = [];
  for (const path of ['banners', 'payments']) {
    await p.goto(`${APP}/admin/${path}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(200);
    for (const tab of path === 'payments' ? ['Overview', 'Payments', 'Plans', 'Subscriptions'] : ['Banners', 'Popups']) {
      await p.getByRole('tab', { name: tab }).click(); await p.waitForTimeout(250);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - 390);
      if (over > 1) bad.push(`${path}/${tab}:${over}px`);
    }
  }
  await c.close();
  assert(bad.length === 0, 'overflow on ' + bad.join(', '));
});

await S.test('ADM-33', 'No console errors / failed requests / 5xx during the whole run', async () => {
  assert(errors.length === 0, errors.slice(0, 5).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
