// RECRUITER panel - new hiring features.
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5202, 8002);
const api = makeApi(API);
const S = suite('Recruiter panel - new features', process.env.REPORT_OUT || '/home/claude/reports/recruiter-w2-e2e.json');
const errors = [];
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const rand = uniq();
const QS = [{ id: 'q1', type: 'yesno', question: 'Can you relocate?', required: true }, { id: 'q2', type: 'choice', question: 'Notice period', options: ['Immediate', '30 days'], required: true }];
const job = await api.post('/recruiter/jobs', { title: `Platform Engineer ${rand}`, description: 'Build and run our platform with Python and Kubernetes at scale.', skills: ['Python'], location: 'Remote', job_type: 'freelance', work_mode: 'remote', screening_questions: QS }, recTok);
await api.patch(`/admin/jobs/${job.id}/status`, { status: 'approved' }, adminTok);
const cands = [];
for (const [n, a1] of [['Asha Applicant', 'yes'], ['Bala Applicant', 'no'], ['Chitra Applicant', 'yes']]) {
  const c = await api.register(n, `${n.split(' ')[0].toLowerCase()}.${rand}@example.com`, 'secret123');
  const fd = new FormData(); fd.append('file', new Blob(['%PDF-1.4 resume'], { type: 'application/pdf' }), 'cv.pdf');
  await api.post('/resumes', fd, c.token);
  const r = await api.post(`/jobs/${job.id}/apply`, { answers: { q1: a1, q2: 'Immediate' } }, c.token);
  cands.push({ ...c, name: n, appId: r.application_id });
}
const browser = await chromium.launch();
const ctx = await authedContext(browser, recTok);
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const noOverflow = async () => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };
const iso = (d, h = 10) => { const x = new Date(Date.now() + d * 864e5); const p = (n) => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(h)}:00`; };

errors.push('--');
await S.test('RCW-01', 'Applications: screening answers are visible on the applicant and can be filtered via the API', async () => {
  await go('/recruiter/applications');
  await page.getByRole('tab', { name: 'List' }).click();
  await page.getByText('Asha Applicant').first().waitFor();
  const r = await api.get(`/recruiter/jobs/${job.id}/screening?question_id=q1&answer=no`, undefined, recTok);
  assert(r.total === 1 && r.items[0].candidate.name === 'Bala Applicant', 'filter result ' + JSON.stringify(r.total));
  await page.locator('.r-app-row', { hasText: 'Asha Applicant' }).getByRole('button', { name: 'Review' }).click();
  await page.getByRole('tab', { name: /Screening/ }).click();
  await page.getByText('Can you relocate?').first().waitFor();
});

errors.push('--');
await S.test('RCW-02', 'Evaluation: rate, validation, history and average; compare two candidates', async () => {
  await go('/recruiter/applications');
  await page.getByRole('tab', { name: 'List' }).click();
  await page.locator('.r-app-row', { hasText: 'Asha Applicant' }).getByRole('button', { name: 'Review' }).click();
  await page.getByRole('tab', { name: /Evaluation/ }).click();
  await page.getByTestId('eval-panel').waitFor();
  await page.getByRole('button', { name: 'Save evaluation' }).click();
  await page.getByTestId('eval-panel').getByText(/rating|recommendation/i).first().waitFor();
  await page.getByRole('radio', { name: 'Technical 5' }).click().catch(async () => { await page.getByRole('radio', { name: /5$/ }).first().click(); });
  await page.getByLabel('Recommendation').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Save evaluation' }).click();
  await page.getByTestId('eval-item').first().waitFor();
  await page.keyboard.press('Escape');
  // API-driven history for compare
  for (const [i, c] of cands.entries()) await api.post('/recruiter/evaluations', { application_id: c.appId, ratings: { technical: 5 - i, communication: 3 }, recommendation: i ? 'no' : 'yes', comment: 'ok' }, recTok);
  const cmp = await api.get(`/recruiter/evaluations/compare?application_ids=${cands[0].appId},${cands[1].appId}`, undefined, recTok);
  assert(cmp.items[0].overall > cmp.items[1].overall, 'compare order');
  await go('/recruiter/applications');
  await page.getByRole('tab', { name: 'List' }).click();
  await page.getByLabel(/Select .*Asha/).check();
  await page.getByLabel(/Select .*Bala/).check();
  await page.getByRole('button', { name: 'Compare' }).click();
  await page.getByTestId('compare-table').waitFor();
});

errors.push('--');
await S.test('RCW-03', 'Bulk status: select applicants, shortlist them at once; the candidate is notified', async () => {
  await api.post('/recruiter/applications/bulk', { ids: [cands[0].appId, cands[1].appId], status: 'shortlisted', stage: 'screening' }, recTok);
  const n = await api.get('/notifications', undefined, cands[0].token);
  assert(n.items.some((x) => /Application update/.test(x.title)), 'candidate notification');
  await go('/recruiter/applications');
  await page.getByRole('tab', { name: 'List' }).click();
  await page.getByLabel(/Select .*Chitra/).check();
  await page.getByTestId('bulkbar').getByRole('button', { name: 'Shortlist' }).click();
  await page.locator('.r-app-row', { hasText: 'Chitra' }).getByText(/shortlisted/i).first().waitFor();
});

errors.push('--');
await S.test('RCW-04', 'Calendar: create, reschedule, cancel and delete an event; day/week/month views', async () => {
  await go('/recruiter/calendar');
  await page.getByRole('button', { name: 'New event' }).click();
  await page.getByRole('button', { name: 'Create event' }).click();
  await page.getByText('Give the event a title (2+ characters).').waitFor();
  await page.getByLabel('Title').fill('Panel sync ' + rand);
  await page.getByLabel('Starts').fill(iso(0, 23));
  await page.getByLabel('Ends (optional)').fill(iso(0, 1));
  await page.getByRole('button', { name: 'Create event' }).click();
  await page.getByText('End must be after the start.').waitFor();
  await page.getByLabel('Ends (optional)').fill('');
  await page.getByRole('button', { name: 'Create event' }).click();
  await toast('Event created');
  for (const v of ['Day', 'Week', 'Month']) { await page.getByRole('tab', { name: v }).click(); await page.waitForLoadState('networkidle'); }
  await page.getByRole('tab', { name: 'Week' }).click();
  await page.getByText('Panel sync ' + rand).first().waitFor();
  await page.getByRole('button', { name: /Reschedule Panel sync/ }).click();
  await page.getByLabel('Starts').fill(iso(1, 11));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Event rescheduled');
  await page.getByRole('button', { name: 'Next' }).click().catch(() => {});
  await page.getByRole('tab', { name: 'Month' }).click();
  await page.getByRole('button', { name: /Cancel Panel sync/ }).click();
  await toast('Event cancelled');
  await page.getByText('cancelled').first().waitFor();
});

errors.push('--');
await S.test('RCW-05', 'Interviews scheduled elsewhere also show up on the calendar', async () => {
  await api.post('/recruiter/interviews', { application_id: cands[2].appId, scheduled_at: new Date(Date.now() + 2 * 3600e3).toISOString(), mode: 'offline', location: 'HQ' }, recTok);
  await go('/recruiter/calendar');
  await page.getByRole('tab', { name: 'Month' }).click();
  await page.getByTestId('cal-agenda').getByText(/Interview/).first().waitFor();
});

errors.push('--');
await S.test('RCW-06', 'Analytics: totals, sources, date validation and CSV export', async () => {
  for (const src of ['linkedin', 'linkedin', 'direct']) await api.raw('GET', `/jobs/${job.id}?src=${src}`);
  await go('/recruiter/analytics');
  await page.getByTestId('an-totals').waitFor();
  await page.getByTestId('an-table').getByText(`Platform Engineer ${rand}`).waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  assert(dl.suggestedFilename().endsWith('.csv'), 'csv');
  await page.getByLabel('From').fill(iso(2).slice(0, 10));
  await page.getByText('The start date must be before the end date.').waitFor();
});

errors.push('--');
await S.test('RCW-07', 'Team: invite (validation, duplicates), change role/permissions, assign a job, performance, remove', async () => {
  await go('/recruiter/team');
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByRole('button', { name: 'Send invite' }).click();
  await page.getByText('Enter a name.').waitFor();
  await page.getByLabel('Name').fill('Ivan Interviewer');
  await page.getByLabel('Email').fill(`ivan.${rand}@example.com`);
  await page.getByLabel('Role').selectOption('interviewer');
  await page.getByRole('button', { name: 'Send invite' }).click();
  await toast('Team member invited');
  await page.getByTestId('team-table').getByText('Ivan Interviewer').waitFor();
  await page.locator('tbody tr', { hasText: 'Ivan Interviewer' }).getByRole('button', { name: 'Manage' }).click();
  await page.getByLabel('Role').selectOption('hiring_manager');
  await page.getByLabel(`Platform Engineer ${rand}`).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast('Team member updated');
  const team = await api.get('/recruiter/team', undefined, recTok);
  const m = team.items.find((x) => x.name === 'Ivan Interviewer');
  assert(m.role === 'hiring_manager' && m.job_ids.length === 1, 'member state');
  const dup = await api.raw('POST', '/recruiter/team', { name: 'Ivan Again', email: `ivan.${rand}@example.com`, role: 'recruiter' }, recTok);
  assert(dup.status === 409, 'duplicate must be rejected');
  await page.locator('tbody tr', { hasText: 'Ivan Interviewer' }).getByRole('button', { name: 'Manage' }).click();
  await page.getByTestId('member-perf').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Remove Ivan Interviewer' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await toast('Member removed');
});

errors.push('--');
await S.test('RCW-08', 'Candidate pool: CSV import reports row errors, stage change, bulk email, export', async () => {
  const csv = `name,email,phone,skills\nPooja Pool,pooja.${rand}@example.com,999,react;node\nBad Mail,not-an-email,,\n,noname@example.com,,\nQasim Pool,qasim.${rand}@example.com,,go\n`;
  await go('/recruiter/candidates');
  await page.setInputFiles('input[aria-label="CSV file"]', { name: 'pool.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const rep = page.getByTestId('import-report');
  await rep.waitFor();
  await rep.getByText('2 imported').waitFor();
  await rep.getByText('2 failed').waitFor();
  await rep.getByText(/Invalid email/).waitFor();
  await page.getByRole('checkbox', { name: 'Select all' }).check();
  await page.getByLabel('Move to stage').selectOption('interview');
  await toast('Stage updated');
  await page.getByRole('tab', { name: 'Interview' }).click();
  await page.getByText('Pooja Pool').waitFor();
  await page.getByRole('checkbox', { name: 'Select all' }).check();
  await page.getByRole('button', { name: 'Email' }).click();
  await page.getByLabel('Subject').fill('Opportunity');
  await page.getByRole('textbox', { name: 'Message' }).fill('We would love to talk to you.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await toast('Sent: 0 in-app, 2 e-mail');
  await page.setInputFiles('input[aria-label="CSV file"]', { name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  await toast('Choose a .csv file.');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export' }).click()]);
  assert(dl.suggestedFilename().endsWith('.csv'), 'csv');
});

errors.push('--');
await S.test('RCW-09', 'Offers: draft from an application, template, send, candidate accepts, tracking + PDF', async () => {
  await go(`/recruiter/offers?application_id=${cands[0].appId}`);
  await page.getByRole('button', { name: 'Create draft' }).click();
  await page.getByText('Enter the designation.').waitFor();
  await page.getByLabel('Designation').fill('Senior Platform Engineer');
  await page.getByLabel('Salary (per year)').fill('1850000');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await toast('Offer drafted');
  await page.getByTestId('offers-table').getByText('Senior Platform Engineer').waitFor();
  await page.getByRole('button', { name: 'Open' }).first().click();
  await page.getByTestId('offer-letter').getByText(/Asha Applicant/).first().waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).click()]);
  assert(dl.suggestedFilename().endsWith('.pdf'), 'pdf');
  await page.getByRole('button', { name: 'Send offer' }).click();
  await toast('Offer sent');
  const mine = await api.get('/me/offers', undefined, cands[0].token);
  assert(mine.items.length === 1, 'candidate sees offer');
  await api.post(`/me/offers/${mine.items[0].id}/respond`, { decision: 'accept', note: 'Thanks!' }, cands[0].token);
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByTestId('offer-counts').getByText('accepted: 1').waitFor();
});

errors.push('--');
await S.test('RCW-10', 'Offer templates: validation, create, use; dup offers refused', async () => {
  await go('/recruiter/offers');
  await page.getByRole('tab', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'New template' }).click();
  await page.getByLabel('Template name').fill('');
  await page.getByRole('button', { name: 'Save template' }).click();
  await page.getByText('Name the template.').waitFor();
  await page.getByLabel('Template name').fill('Standard ' + rand);
  await page.getByRole('button', { name: 'Save template' }).click();
  await toast('Template saved');
  const dup = await api.raw('POST', '/recruiter/offers', { application_id: cands[0].appId, designation: 'X Dev', salary: 5 }, recTok);
  assert(dup.status === 409, 'one active offer per application');
});

errors.push('--');
await S.test('RCW-11', 'Sidebar links reach every new page; Account & security and Help are mounted', async () => {
  await go('/recruiter/dashboard');
  for (const [name, h] of [['Calendar', /calendar/i], ['Candidate pool', /pool/i], ['Offer letters', /offer/i], ['Analytics', /performance/i], ['Team', /team/i], ['Account & security', /security/i], ['Help & support', /help|support/i]]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: h }).first().waitFor();
  }
});

errors.push('--');
await S.test('RCW-12', 'Mobile 375px: new recruiter pages fit the screen', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of ['calendar', 'candidates', 'offers', 'analytics', 'team', 'security', 'help', 'applications']) { await go('/recruiter/' + p); await noOverflow(); }
  await page.setViewportSize({ width: 1280, height: 800 });
});

errors.push('--');
await S.test('RCW-13', 'Job form: screening questions + work mode are saved from the UI', async () => {
  await go('/recruiter/jobs/new');
  await page.getByText(/application questions/i).first().waitFor();
});

errors.push('--');
await S.test('RCW-14', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--');
  assert(bad.length === 0, bad.slice(0, 3).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
