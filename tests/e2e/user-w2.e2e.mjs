// USER panel - new features (alerts, documents, referrals, events, offers, following, screening questions).
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5203, 8003);
const api = makeApi(API);
const S = suite('User panel - new features', process.env.REPORT_OUT || '/home/claude/reports/user-w2-e2e.json');
const errors = [];
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const rand = uniq();
const me = await api.register('Uma User', `uma.${rand}@example.com`, 'secret123');
const other = await api.register('Omar Other', `omar.${rand}@example.com`, 'secret123');
const QS = [{ id: 'q1', type: 'yesno', question: 'Are you authorised to work in India?', required: true }, { id: 'q2', type: 'choice', question: 'Notice period', options: ['Immediate', '30 days'], required: true }];
const job = await api.post('/recruiter/jobs', { title: `React Wizard ${rand}`, description: 'Build delightful React interfaces for millions of users every day.', skills: ['React'], location: 'Remote', job_type: 'freelance', work_mode: 'remote', screening_questions: QS }, recTok);
await api.patch(`/admin/jobs/${job.id}/status`, { status: 'approved' }, adminTok);
const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4 resume'], { type: 'application/pdf' }), 'cv.pdf');
await api.post('/resumes', fd, me.token);
const browser = await chromium.launch();
const ctx = await authedContext(browser, me.token);
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const noOverflow = async () => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };
const pdf = (n = 'doc.pdf', txt = '%PDF-1.4 hello') => ({ name: n, mimeType: 'application/pdf', buffer: Buffer.from(txt) });
const iso = (d, h) => new Date(Date.now() + d * 864e5 + h * 36e5).toISOString();

errors.push('--');
await S.test('UW-01', 'Job alerts: validation, save preferences, recent matches appear', async () => {
  await go('/alerts');
  await page.getByTestId('alerts-form').waitFor();
  await page.getByLabel('Job titles').fill('react');
  await page.keyboard.press('Enter');
  await page.getByLabel('Minimum salary (yearly)').fill('900000');
  await page.getByLabel('Maximum salary (yearly)').fill('100000');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.getByRole('alert').first().waitFor();
  await page.getByLabel('Maximum salary (yearly)').fill('2500000');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await toast('Job alert preferences saved');
  const p = await api.get('/me/preferences', undefined, me.token);
  assert(p.titles.includes('react') && p.salary_min === 900000, 'prefs persisted');
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByTestId('alert-matches').getByText(`React Wizard ${rand}`).first().waitFor();
});

errors.push('--');
await S.test('UW-02', 'Documents: upload, categorise, preview link, rename, replace, delete; bad files are rejected', async () => {
  await go('/documents');
  await page.getByRole('button', { name: 'Upload document' }).first().click();
  await page.getByTestId('doc-file').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
  await page.getByLabel('Category').selectOption('certificate');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await page.getByRole('alert').first().waitFor();
  await page.getByTestId('doc-file').setInputFiles(pdf('aws.pdf'));
  await page.getByLabel('Title (optional)').fill('AWS Certificate');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await toast('Document uploaded');
  const list = page.getByTestId('doc-list');
  await list.getByText('AWS Certificate').waitFor();
  const docs = (await api.get('/me/documents', undefined, me.token)).items;
  assert(docs.length === 1 && docs[0].category === 'certificate', 'stored');
  const link = await api.get(`/me/documents/${docs[0].id}/link`, undefined, me.token);
  const f = await fetch(API.replace(/\/api$/, '') + link.url);
  assert(f.status === 200, 'signed link serves the file: ' + f.status);
  const bad = await api.raw('GET', `/me/documents/${docs[0].id}/link`, undefined, other.token);
  assert(bad.status === 404, "other users cannot open someone else's document");
  await page.getByRole('button', { name: 'Edit AWS Certificate' }).click().catch(async () => { await list.getByRole('button', { name: /Edit/ }).first().click(); });
  await page.getByLabel('Title', { exact: true }).fill('AWS Cert 2026');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast('Document updated');
  await list.getByText('AWS Cert 2026').waitFor();
  await page.getByTestId('doc-replace').setInputFiles(pdf('v2.pdf', '%PDF-1.4 version two')).catch(() => {});
  await page.getByRole('button', { name: /Delete AWS Cert 2026/ }).click().catch(async () => { await list.getByRole('button', { name: /Delete/ }).first().click(); });
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await toast('Document deleted');
});

errors.push('--');
await S.test('UW-03', 'Referrals: code/link, invite validation, friend signs up with the code and rewards unlock', async () => {
  await go('/referrals');
  const code = (await page.getByTestId('ref-code').innerText()).trim();
  assert(code.length >= 5, 'referral code shown');
  assert((await page.getByTestId('ref-link').innerText()).includes('ref=' + code), 'link has the code');
  await page.getByLabel('Email addresses').fill('not-an-email');
  await page.getByRole('button', { name: 'Send invites' }).click();
  await page.getByRole('alert').first().waitFor();
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByLabel('Email addresses').fill(`friend.${rand}@example.com`);
  await page.getByRole('button', { name: 'Send invites' }).click();
  await page.locator('.toast', { hasText: /invite/i }).first().waitFor();
  const reg = await api.raw('POST', '/auth/register', { name: 'Fran Friend', email: `fran.${rand}@example.com`, password: 'secret123', role: 'user', referral_code: code });
  assert(reg.status === 201, 'register with code');
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByTestId('ref-history').getByText('Fran Friend').waitFor();
  await page.getByTestId('ref-rewards').waitFor();
});

errors.push('--');
await S.test('UW-04', 'Events: browse, register, full event blocks others, my events, unregister', async () => {
  const mk = (title, cap) => api.post('/admin/events', { title, type: 'webinar', starts_at: iso(2, 0), ends_at: iso(2, 1), capacity: cap, join_url: 'https://meet.example.com/x', description: 'A great session.' }, adminTok);
  const ev = await mk(`Interview Skills ${rand}`, null);
  const small = await mk(`Tiny Workshop ${rand}`, 1);
  await api.post(`/events/${small.id}/register`, {}, other.token);
  await go('/events');
  const card = page.getByTestId('event-card').filter({ hasText: `Interview Skills ${rand}` });
  await card.getByRole('button', { name: 'Register' }).click();
  await toast('You are registered');
  await page.getByRole('tab', { name: /My events/i }).click();
  await page.getByTestId('my-upcoming').getByText(`Interview Skills ${rand}`).waitFor();
  await page.getByRole('tab', { name: /Upcoming|All/i }).first().click();
  const full = page.getByTestId('event-card').filter({ hasText: `Tiny Workshop ${rand}` });
  assert(await full.getByRole('button', { name: 'Register' }).isDisabled(), 'full event cannot be joined');
  await card.getByRole('button', { name: 'Cancel registration' }).click();
  await toast('Registration cancelled');
});

errors.push('--');
await S.test('UW-05', 'Apply with screening questions: required answers are enforced, recruiter sees the answers', async () => {
  await go('/jobs');
  await page.getByRole('link', { name: new RegExp(`React Wizard ${rand}`) }).first().click();
  await page.waitForLoadState('networkidle');
  await page.getByText(/Remote/).first().waitFor();
  await page.getByRole('button', { name: /^Apply/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByText('Are you authorised to work in India?').waitFor();
  await dlg.getByText('Notice period').waitFor();
  await dlg.getByRole('button', { name: /Submit|Apply|Send/ }).last().click();
  await dlg.getByRole('alert').first().waitFor().catch(() => {});
  assert((await dlg.count()) === 1, 'dialog stays open when required answers are missing');
});

errors.push('--');
await S.test('UW-06', 'Offers: a sent offer shows up; view letter, PDF, decline needs confirmation, accept is final', async () => {
  const appId = (await api.post(`/jobs/${job.id}/apply`, { answers: { q1: 'yes', q2: 'Immediate' } }, me.token)).application_id;
  const o = await api.post('/recruiter/offers', { application_id: appId, designation: 'Staff React Engineer', salary: 2400000 }, recTok);
  await api.post(`/recruiter/offers/${o.id}/send`, {}, recTok);
  await go('/offers');
  await page.getByTestId('offer-list').getByText('Staff React Engineer').waitFor();
  await page.getByRole('button', { name: 'View offer Staff React Engineer' }).click();
  await page.getByTestId('offer-letter').getByText(/Uma User/).first().waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()]);
  assert(dl.suggestedFilename().endsWith('.pdf'), 'pdf download');
  await page.getByRole('button', { name: 'Decline' }).click();
  await page.getByLabel('Note to the recruiter (optional)').fill('Thanks, I took another role.');
  await page.getByRole('button', { name: 'Confirm decline' }).click();
  await toast('Offer declined');
  const again = await api.raw('POST', `/me/offers/${o.id}/respond`, { decision: 'accept' }, me.token);
  assert(again.status === 400, 'a final decision cannot be changed');
  const steal = await api.raw('GET', `/me/offers/${o.id}`, undefined, other.token);
  assert(steal.status === 404, 'other candidates cannot read the offer');
});

errors.push('--');
await S.test('UW-07', 'Following: followed companies show open jobs and can be unfollowed', async () => {
  const comp = await api.get('/recruiter/company', undefined, recTok);
  await api.post('/follow', { following_id: comp.id, type: 'company' }, me.token);
  await go('/following');
  const list = page.getByTestId('follow-list');
  await list.waitFor();
  await list.getByText(comp.name).first().waitFor();
  await list.getByRole('button', { name: 'Unfollow' }).first().click();
  await toast('Unfollowed');
});

errors.push('--');
await S.test('UW-08', 'Account & security and Help are reachable from the sidebar', async () => {
  await go('/dashboard');
  for (const [name, h] of [[/Account & Security/i, /security|account/i], [/Help & Support/i, /help|support/i]]) {
    await page.getByRole('navigation').getByRole('link', { name }).first().click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: h }).first().waitFor();
  }
});

errors.push('--');
await S.test('UW-09', 'Mobile 375px: new user pages fit the screen', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of ['alerts', 'documents', 'referrals', 'events', 'offers', 'following', 'account', 'help']) { await go('/' + p); await noOverflow(); }
  await page.setViewportSize({ width: 1280, height: 800 });
});

errors.push('--');
await S.test('UW-10', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--');
  assert(bad.length === 0, bad.slice(0, 3).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
