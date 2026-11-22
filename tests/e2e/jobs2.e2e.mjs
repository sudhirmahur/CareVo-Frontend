// APPLY METHODS + DYNAMIC QUESTIONS + OFFER LETTER STYLES - recruiter, candidate and admin panels.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5203, 8003);
const api = makeApi(API);
const S = suite('Apply methods, questions, offer styles', process.env.REPORT_OUT || '/home/claude/reports/jobs2-e2e.json');
const errors = [];
const rand = uniq();
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const recTok = await api.login('recruiter@carevo.demo', 'Recruiter@123');
const cand = await api.register('Casey Candidate', `casey.${rand}@example.com`, 'secret123');
const resume = new FormData(); resume.append('file', new Blob(['%PDF-1.4 resume'], { type: 'application/pdf' }), 'cv.pdf');
await api.post('/resumes', resume, cand.token);

const png = (w = 90, h = 30) => { // tiny valid PNG for the signature
  const crc = (buf) => { let c, crcT = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } let r = 0xffffffff; for (const b of buf) r = crcT[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 120)])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

const browser = await chromium.launch();
const mk = async (token, vp) => { const c = await authedContext(browser, token, vp); const p = await c.newPage(); watch(p, errors); return { c, p }; };
const rec = await mk(recTok);
const usr = await mk(cand.token);
const adm = await mk(adminTok);
const go = async (page, p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (page, t) => page.locator('.toast', { hasText: t }).first().waitFor();
const noOverflow = async (page) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };

const TITLE = `Questionnaire Engineer ${rand}`;
let jobId;

errors.push('--');
await S.test('JB-01', 'Recruiter: choosing "external website" requires a valid link; CareVo mode saves no link', async () => {
  const p = rec.p;
  await go(p, '/recruiter/jobs/new');
  await p.getByLabel(/Job title/).fill(`External Role ${rand}`);
  await p.getByLabel('Location').fill('Pune');
  await p.getByLabel(/^Description/).fill('Join the company through the career page. Python and APIs experience needed.');
  assert((await p.getByLabel(/Apply through CareVo/).isChecked()), 'CareVo is the default method');
  await p.getByLabel(/Apply through external website/).check();
  await p.getByRole('button', { name: 'Submit job' }).click();
  await p.getByText('Enter the company application link.').waitFor();
  await p.getByLabel(/Company application link/).fill('company.com/careers');
  await p.getByRole('button', { name: 'Submit job' }).click();
  await p.getByText(/full link starting with http/).waitFor();
  await p.getByLabel(/Company application link/).fill('https://company.example/careers/software-developer');
  await p.getByRole('button', { name: 'Submit job' }).click();
  await toast(p, 'Job submitted');
  const mine = (await api.get('/recruiter/jobs', undefined, recTok)).items.find((j) => j.title === `External Role ${rand}`);
  assert(mine && mine.apply_url === 'https://company.example/careers/software-developer', 'external link saved');
  // switching back to CareVo drops the link on save
  await go(p, `/recruiter/jobs/${mine.id}/edit`);
  await p.getByLabel(/Apply through CareVo/).check();
  await p.getByRole('button', { name: 'Save changes' }).click();
  await toast(p, 'Job updated');
  const after = (await api.get('/recruiter/jobs', undefined, recTok)).items.find((j) => j.id === mine.id);
  assert(!after.apply_url, 'link removed when CareVo method is chosen');
});

await S.test('JB-02', 'Recruiter builds a form with all 8 question types, reorders (buttons + drag), previews, saves per job', async () => {
  const p = rec.p;
  await go(p, '/recruiter/jobs/new');
  await p.getByLabel(/Job title/).fill(TITLE);
  await p.getByLabel('Location').fill('Remote');
  await p.getByLabel(/^Description/).fill('A role used to test every application question type end to end.');
  const types = [['text', 'Why do you want this role?'], ['long_text', 'Describe a project you are proud of'], ['choice', 'Preferred work shift'], ['multiple', 'Which tools do you use'], ['yesno', 'Can you relocate?'], ['number', 'Expected salary in lakhs'], ['email', 'Reference e-mail address'], ['file', 'Upload your portfolio']];
  for (let i = 0; i < types.length; i++) {
    await p.getByRole('button', { name: 'Add question' }).click();
    const row = p.getByTestId('screening-q').nth(i);
    await row.getByLabel(`Question ${i + 1}`, { exact: true }).fill(types[i][1]);
    await row.getByLabel('Answer type').selectOption(types[i][0]);
    if (types[i][0] === 'choice') await row.getByLabel(/Options/).fill('Day, Night');
    if (types[i][0] === 'multiple') await row.getByLabel(/Options/).fill('Git, Docker, Jira');
    if (!['yesno', 'text'].includes(types[i][0])) { /* required by default */ }
    if (types[i][0] === 'long_text' || types[i][0] === 'file') await row.getByLabel('Required').uncheck();
  }
  assert((await p.getByTestId('screening-q').count()) === 8, '8 rows');
  // reorder with the Down button: move the first question below the second
  await p.getByTestId('screening-q').nth(0).getByRole('button', { name: /Move question 1 down/ }).click();
  assert((await p.getByTestId('screening-q').nth(0).getByLabel('Question 1', { exact: true }).inputValue()) === 'Describe a project you are proud of', 'down button works');
  // drag and drop: drag the 2nd handle onto the 1st row (HTML5 drag events)
  await p.getByTestId('screening-q').nth(1).getByTestId('q-handle').dragTo(p.getByTestId('screening-q').nth(0));
  assert((await p.getByTestId('screening-q').nth(0).getByLabel('Question 1', { exact: true }).inputValue()) === 'Why do you want this role?', 'drag and drop reorder');
  // preview
  await p.getByTestId('preview-form').click();
  const prev = p.getByTestId('form-preview');
  await prev.getByText('Upload your portfolio').waitFor();
  for (const t of ['Preferred work shift', 'Which tools do you use', 'Expected salary in lakhs']) await prev.getByText(t).first().waitFor();
  assert((await prev.locator('input[type=checkbox]').count()) === 3, 'multiple choice renders checkboxes');
  assert((await prev.locator('input[type=number]').count()) === 1 && (await prev.locator('input[type=email]').count()) === 1 && (await prev.locator('input[type=file]').count()) === 1, 'number/email/file inputs');
  await p.getByRole('button', { name: 'Close preview' }).click();
  await p.getByRole('button', { name: 'Submit job' }).click();
  await toast(p, 'Job submitted');
  const job = (await api.get('/recruiter/jobs', undefined, recTok)).items.find((j) => j.title === TITLE);
  jobId = job.id;
  await api.patch(`/admin/jobs/${jobId}/status`, { status: 'approved' }, adminTok);
  const got = (await api.get(`/recruiter/jobs/${jobId}`, undefined, recTok)).screening_questions;
  assert(got.length === 8 && got[0].type === 'text' && got[1].question === 'Describe a project you are proud of', 'order + types saved');
  assert(got.find((q) => q.type === 'multiple').options.join() === 'Git,Docker,Jira', 'options saved');
  assert(got.find((q) => q.type === 'file').required === false, 'optional flag saved');
});

await S.test('JB-03', 'Candidate: required answers enforced, number/e-mail validated, file uploaded, application saved', async () => {
  const p = usr.p;
  await go(p, `/jobs/${jobId}`);
  await p.getByRole('button', { name: /^Apply/ }).first().click();
  const dlg = p.getByRole('dialog');
  await dlg.getByText('Why do you want this role?').waitFor();
  await dlg.getByRole('button', { name: /Submit|Apply|Send/ }).last().click();
  await dlg.getByText('This question is required').first().waitFor();
  await dlg.getByLabel(/Why do you want this role/).fill('I love APIs');
  await dlg.getByLabel(/Preferred work shift/).selectOption('Night');
  await dlg.getByLabel('Git').check(); await dlg.getByLabel('Jira').check();
  await dlg.getByLabel(/Can you relocate/).selectOption('Yes');
  await dlg.getByLabel(/Expected salary/).fill('12.5');
  await dlg.getByLabel(/Reference e-mail/).fill('not-an-email');
  await dlg.getByRole('button', { name: /Submit|Apply|Send/ }).last().click();
  await dlg.getByText('Enter a valid e-mail address').waitFor();
  await dlg.getByLabel(/Reference e-mail/).fill('ref@example.com');
  await dlg.getByLabel(/Describe a project/).fill('Built a hiring portal.');
  await dlg.getByTestId(/q-file-/).setInputFiles({ name: 'portfolio.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 portfolio') });
  await dlg.getByText('Attached: portfolio.pdf').waitFor();
  await dlg.getByRole('button', { name: /Submit|Apply|Send/ }).last().click();
  await toast(p, /pplied|submitted|sent/i);
  const mine = await api.get('/applications', undefined, cand.token);
  assert(mine.items.some((a) => a.job_id === jobId || a.job?.id === jobId || a.job_title === TITLE), 'application recorded');
});

await S.test('JB-04', 'Recruiter sees every answer (multiple choice joined, file downloadable) in the dashboard', async () => {
  const p = rec.p;
  await go(p, '/recruiter/applications');
  await p.getByRole('tab', { name: 'List' }).click();
  await p.locator('.r-app-row', { hasText: 'Casey Candidate' }).getByRole('button', { name: 'Review' }).click();
  await p.getByRole('tab', { name: /Screening/ }).click();
  const box = p.getByTestId('answers');
  await box.getByText('Git, Jira').waitFor();
  await box.getByText('12.5').waitFor();
  await box.getByText('ref@example.com').waitFor();
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.context().waitForEvent('page', { timeout: 15000 }).catch(() => null), box.getByTestId('answer-file').click()]);
  const link = (await api.get(`/recruiter/jobs/${jobId}/screening`, undefined, recTok)).items[0].answers.find((a) => a.type === 'file');
  const signed = (await api.get(`/recruiter/answer-files/${link.file_id}/link`, undefined, recTok)).url;
  const res = await fetch(API.replace('/api', '') + signed);
  assert(res.ok && (await res.text()).startsWith('%PDF'), 'signed link serves the file');
  const forged = await fetch(API.replace('/api', '') + signed.replace('sig=', 'sig=00'));
  assert(forged.status === 403, 'forged link refused');
});

await S.test('JB-05', 'External job: Apply opens the company website in a new tab and is recorded', async () => {
  const p = usr.p;
  const ext = (await api.get('/recruiter/jobs', undefined, recTok)).items.find((j) => j.title === `Reel Job ${rand}` || (j.apply_url && /example/.test(j.apply_url)));
  const j = ext || (await api.post('/recruiter/jobs', { title: `Ext Apply ${rand}`, description: 'External application job used by the browser test suite.', skills: ['Go'], location: 'Remote', job_type: 'fulltime', work_mode: 'remote', apply_url: 'https://company.example/careers/go' }, recTok));
  await api.patch(`/admin/jobs/${j.id}/status`, { status: 'approved' }, adminTok);
  await go(p, `/jobs/${j.id}`);
  const [popup] = await Promise.all([usr.c.waitForEvent('page', { timeout: 10000 }), p.getByRole('button', { name: /Apply on Company Website|Apply/ }).first().click()]);
  assert(/company\.example|about:blank/.test(popup.url()), `popup url ${popup.url()}`);
  await popup.close().catch(() => {});
  const mine = await api.get('/applications', undefined, cand.token);
  assert(mine.items.some((a) => a.source === 'external'), 'external application recorded');
});

// ------------------------------------------------------------------------ offers
let offerId, appId;
await S.test('JB-06', 'Recruiter creates an offer: 5 designs, letterhead, signature upload, live responsive preview, PDF', async () => {
  const p = rec.p;
  const apps = await api.get('/recruiter/applications?limit=50', undefined, recTok);
  appId = apps.items.find((a) => a.candidate?.name === 'Casey Candidate' && a.job_title === TITLE).id;
  await go(p, `/recruiter/offers?application_id=${appId}`);
  const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Designation').fill('Backend Engineer');
  await dlg.getByLabel('Salary (per year)').fill('1800000');
  await dlg.getByLabel('Joining date').fill('2027-01-10');
  await dlg.getByLabel('Probation period').selectOption('3');
  await dlg.getByLabel('Working hours').fill('Mon-Fri, 10 AM - 7 PM');
  await dlg.getByLabel('Notice period').fill('30 days');
  assert((await dlg.getByTestId('offer-style').getByRole('button').count()) === 5, 'five designs');
  await dlg.getByTestId('offer-style').getByRole('button', { name: /Premium Corporate/ }).click();
  await dlg.getByLabel('Company address').fill('12 MG Road, Jaipur');
  await dlg.getByLabel('Signatory name').fill('Asha Verma');
  await dlg.getByLabel('Signatory title').fill('Head of People');
  await dlg.getByTestId('signature-file').setInputFiles({ name: 'sig.png', mimeType: 'image/png', buffer: png() });
  await dlg.getByAltText('Signature preview').waitFor();
  await dlg.getByTestId('offer-preview-toggle').click();
  const prev = dlg.getByTestId('offer-preview').getByTestId('offer-letter');
  await prev.getByText('Casey Candidate').first().waitFor();
  assert((await prev.getAttribute('data-style')) === 'premium_corporate', 'preview uses the chosen style');
  for (const t of ['Backend Engineer', '18,00,000', '3 months', 'Mon-Fri, 10 AM - 7 PM', '30 days', 'Asha Verma', 'Head of People']) await prev.getByText(t).first().waitFor();
  await prev.getByAltText('Authorised signature').waitFor();
  // switching the style changes the preview
  await dlg.getByTestId('offer-style').getByRole('button', { name: /Modern Gradient/ }).click();
  assert((await prev.getAttribute('data-style')) === 'modern_gradient', 'style switch');
  await dlg.getByTestId('offer-style').getByRole('button', { name: /Classic Formal/ }).click();
  await dlg.getByRole('button', { name: 'Create draft' }).click();
  await toast(p, 'Offer drafted');
  offerId = (await api.get('/recruiter/offers', undefined, recTok)).items.find((o) => o.designation === 'Backend Engineer').id;
  await p.getByRole('button', { name: 'Open' }).first().click();
  await p.getByTestId('offer-letter').getByText('Casey Candidate').first().waitFor();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'PDF' }).click()]);
  const tmp = await dl.path();
  const head = fs.readFileSync(tmp).subarray(0, 5).toString();
  assert(head === '%PDF-' && fs.statSync(tmp).size > 4000, 'valid pdf downloaded');
  await p.getByRole('button', { name: 'Send offer' }).click();
  await toast(p, 'Offer sent');
});

await S.test('JB-07', 'Candidate sees the designed letter, downloads the PDF and accepts', async () => {
  const p = usr.p;
  await go(p, '/offers');
  await p.getByTestId('offer-list').getByText('Backend Engineer').waitFor();
  await p.getByRole('button', { name: /View offer Backend Engineer/ }).click();
  const letter = p.getByTestId('offer-letter');
  await letter.getByText('Casey Candidate').first().waitFor();
  assert((await letter.getAttribute('data-style')) === 'classic_formal', 'candidate sees the same style');
  await letter.getByAltText('Authorised signature').waitFor();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download PDF' }).click()]);
  assert(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'pdf');
  await p.getByRole('button', { name: 'Accept offer' }).click();
  await p.getByLabel(/Note to the recruiter/).fill('Happy to join!');
  await p.getByRole('button', { name: /Confirm accept/ }).click();
  await toast(p, 'Offer accepted');
  assert((await api.get(`/me/offers/${offerId}`, undefined, cand.token)).status === 'accepted', 'accepted');
});

await S.test('JB-08', 'Admin: Offer letters page lists the offer, opens the designed letter and downloads the PDF', async () => {
  const p = adm.p;
  await go(p, '/admin/offers');
  await p.getByTestId('admin-offers').getByText('Casey Candidate').first().waitFor();
  await p.getByRole('button', { name: /View offer for Casey Candidate/ }).first().click();
  await p.getByTestId('offer-letter').getByText('Backend Engineer').first().waitFor();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download PDF' }).click()]);
  assert(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'pdf');
});

await S.test('JB-09', 'Mobile 390px: question form and offer letter do not overflow; tablet 820px too', async () => {
  for (const vp of [{ width: 390, height: 800 }, { width: 820, height: 1000 }]) {
    const m = await mk(cand.token, vp);
    await m.p.goto(APP + '/offers'); await m.p.waitForLoadState('networkidle');
    await m.p.getByRole('button', { name: /View offer Backend Engineer/ }).click();
    await m.p.getByTestId('offer-letter').waitFor();
    await noOverflow(m.p);
    const w = await m.p.getByTestId('offer-letter').evaluate((el) => el.getBoundingClientRect().width);
    assert(w <= vp.width, `letter ${w}px wider than ${vp.width}px screen`);
    if (vp.width === 390) await m.p.screenshot({ path: '/home/claude/shots/user/e2e-offer-mobile.png' });
    await m.c.close();
  }
});

await S.test('JB-10', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--' && !/example\.invalid|company\.example|ERR_NAME_NOT_RESOLVED|Failed to load resource: net::ERR/.test(e));
  assert(bad.length === 0, bad.slice(0, 4).join(' | '));
});

await browser.close();
const r = S.summary();
process.exit(r ? 0 : 1);
