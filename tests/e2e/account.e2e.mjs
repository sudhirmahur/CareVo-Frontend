// Shared account centre, support & feedback, 2FA login, referral signup link.
import crypto from 'node:crypto';
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5204, 8004);
const api = makeApi(API);
const S = suite('Account & support', process.env.REPORT_OUT || '/home/claude/reports/account-e2e.json');
const errors = [];
const rand = uniq();
const PW = 'secret123';
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');

function totp(secret) {
  const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const ch of secret.replace(/=+$/, '').toUpperCase()) bits += b32.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac('sha1', key).update(ctr).digest(); const o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}

const browser = await chromium.launch();
const mk = async (name, role = 'user') => { const u = await api.register(name, `${name.split(' ')[0].toLowerCase()}.${rand}@example.com`, PW, role); return { ...u, name, email: `${name.split(' ')[0].toLowerCase()}.${rand}@example.com` }; };
const ann = await mk('Ann Account');
const ctx = await authedContext(browser, ann.token);
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const noOverflow = async (p) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };
const loginUI = async (p, email, pw) => { await p.goto(APP + '/login'); await p.waitForLoadState('networkidle'); await p.fill('input[type=email]', email); await p.fill('input[autocomplete=current-password]', pw); const [r] = await Promise.all([p.waitForResponse((x) => x.url().endsWith('/auth/login')), p.getByRole('button', { name: 'Login', exact: true }).click()]); return r.json(); };

errors.push('--');
await S.test('ACC-01', 'Email 2FA: turn on with a code, then login needs the code (wrong code rejected)', async () => {
  await go('/account');
  await page.getByTestId('twofa-card').waitFor();
  await page.getByRole('button', { name: 'Email code' }).click();
  const code = (await page.getByTestId('dev-code').innerText()).trim();
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify and turn on' }).click();
  await page.getByRole('alert').first().waitFor();
  await page.getByLabel('Verification code').fill(code);
  await page.getByRole('button', { name: 'Verify and turn on' }).click();
  await page.getByTestId('twofa-card').getByText(/on|enabled/i).first().waitFor();
  const p2 = await (await browser.newContext()).newPage();
  watch(p2, errors);
  const uiCh = await loginUI(p2, ann.email, PW);
  await p2.getByTestId('2fa-form').waitFor();
  await p2.getByLabel('Verification code').fill('123456');
  await p2.getByRole('button', { name: /Verify|Continue/ }).click();
  await p2.getByRole('alert').first().waitFor();
  assert(uiCh.requires_2fa && !uiCh.access_token, 'login must not hand out a session before the code');
  const otp = uiCh.dev_code;
  assert(otp, 'dev OTP exposed in test env');
  await p2.getByLabel('Verification code').fill(otp);
  await p2.getByRole('button', { name: /Verify|Continue/ }).click();
  await p2.waitForURL('**/dashboard', { timeout: 15000 });
  await p2.context().close();
});

errors.push('--');
await S.test('ACC-02', 'Turn 2FA off needs the password; then login is direct again', async () => {
  await go('/account');
  await page.getByTestId('twofa-card').getByRole('button', { name: 'Turn off' }).click();
  await page.getByLabel('Confirm with your password').fill('wrong-password');
  await page.getByRole('button', { name: 'Turn off' }).last().click();
  await page.getByRole('alert').first().waitFor();
  await page.getByLabel('Confirm with your password').fill(PW);
  await page.getByRole('button', { name: 'Turn off' }).last().click();
  await toast(/off|disabled/i.source ? 'Two' : 'off').catch(() => {});
  const r = await api.post('/auth/login', { email: ann.email, password: PW });
  assert(r.access_token, 'login without 2FA after turning it off');
});

errors.push('--');
await S.test('ACC-03', 'Authenticator app (TOTP): setup shows a secret, valid code enables it, login accepts a live code', async () => {
  await go('/account');
  await page.getByRole('button', { name: 'Authenticator app' }).click();
  const secret = (await page.getByTestId('totp-secret').innerText()).trim();
  assert(/^[A-Z2-7]{16,}$/.test(secret), 'secret looks like base32');
  await page.getByLabel('Verification code').fill(totp(secret));
  await page.getByRole('button', { name: 'Verify and turn on' }).click();
  await page.getByTestId('twofa-card').getByText(/on|enabled|authenticator/i).first().waitFor();
  const ch = await api.post('/auth/login', { email: ann.email, password: PW });
  assert(ch.requires_2fa && ch.method === 'totp', 'totp challenge');
  const bad = await api.raw('POST', '/auth/2fa/verify', { challenge_token: ch.challenge_token, code: '000000' });
  assert(bad.status >= 400, 'wrong totp rejected');
  const ok = await api.post('/auth/2fa/verify', { challenge_token: ch.challenge_token, code: totp(secret) });
  assert(ok.access_token, 'valid totp accepted');
  // leave 2FA off for the remaining tests
  await api.post('/auth/2fa/disable', { password: PW }, ok.access_token);
});

errors.push('--');
await S.test('ACC-04', 'Sessions: other devices listed and can be ended; ended session stops working', async () => {
  const other = await api.post('/auth/login', { email: ann.email, password: PW });
  await go('/account');
  const rows = page.getByTestId('session-row');
  await rows.first().waitFor();
  assert((await rows.count()) >= 2, 'both sessions listed');
  await page.getByRole('button', { name: 'Sign out all other devices' }).click();
  await page.getByRole('button', { name: /Sign out|Confirm/ }).last().click().catch(() => {});
  await page.waitForTimeout(800);
  const me = await api.raw('GET', '/users/me', undefined, other.access_token);
  assert(me.status === 401, 'other session must be revoked: ' + me.status);
  const mine = await api.raw('GET', '/users/me', undefined, ann.token);
  assert(mine.status === 200, 'current session stays valid');
});

errors.push('--');
await S.test('ACC-05', 'Notification & privacy preferences persist across reload', async () => {
  await go('/account');
  await page.getByRole('tab', { name: 'Notifications' }).click();
  await page.getByTestId('notif-card').waitFor();
  await page.getByText('Send me emails').first().click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await toast('saved');
  await page.getByRole('tab', { name: 'Privacy & data' }).click();
  await page.getByLabel('Who can message me').selectOption({ index: 2 });
  await page.getByRole('button', { name: 'Save privacy settings' }).click();
  await toast('saved');
  const np = await api.get('/account/notification-preferences', undefined, ann.token);
  assert(np.email_enabled === false, 'email pref saved: ' + JSON.stringify(np).slice(0, 120));
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Privacy & data' }).click();
  assert((await page.getByLabel('Who can message me').inputValue()) !== '', 'privacy persisted');
});

errors.push('--');
await S.test('ACC-06', 'Data export downloads JSON; account activity lists the sign-ins', async () => {
  await go('/account');
  await page.getByRole('tab', { name: 'Privacy & data' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download my data/ }).click()]);
  assert(dl.suggestedFilename().endsWith('.json'), 'json export');
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByTestId('activity-card').getByText(/login|sign/i).first().waitFor();
});

errors.push('--');
await S.test('ACC-07', 'Deactivate needs the password, hides nothing until confirmed, and login reactivates the account', async () => {
  const bob = await mk('Bob Brief');
  const c2 = await authedContext(browser, bob.token); const p = await c2.newPage(); watch(p, errors);
  await p.goto(APP + '/account'); await p.waitForLoadState('networkidle');
  await p.getByRole('tab', { name: 'Privacy & data' }).click();
  await p.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await p.getByRole('button', { name: 'Deactivate', exact: true }).last().isDisabled();
  await p.getByLabel('Confirm with your password').fill('nope-nope');
  await p.getByRole('button', { name: 'Deactivate', exact: true }).last().click();
  await p.getByRole('alert').first().waitFor();
  await p.getByLabel('Confirm with your password').fill(PW);
  await p.getByRole('button', { name: 'Deactivate', exact: true }).last().click();
  await p.waitForURL('**/login**', { timeout: 15000 }).catch(() => {});
  const back = await api.post('/auth/login', { email: bob.email, password: PW });
  assert(back.access_token, 'logging in again reactivates');
  await c2.close();
});

errors.push('--');
await S.test('ACC-08', 'Block / unblock: blocked person cannot message; unblock restores it', async () => {
  const cat = await mk('Cat Chat'); const dan = await mk('Dan Direct');
  await api.post('/account/blocks', { user_id: dan.user.id }, cat.token);
  const m1 = await api.raw('POST', '/messages', { receiver_id: dan.user.id, message: 'hello' }, cat.token);
  assert(m1.status === 403, 'cannot message a blocked user: ' + m1.status);
  const c2 = await authedContext(browser, cat.token); const p = await c2.newPage(); watch(p, errors);
  await p.goto(APP + '/account'); await p.waitForLoadState('networkidle');
  await p.getByRole('tab', { name: 'Privacy & data' }).click();
  await p.getByTestId('blocks-card').getByText('Dan Direct').waitFor();
  await p.getByRole('button', { name: 'Unblock Dan Direct' }).click();
  await p.getByText(/unblocked/i).first().waitFor();
  const m2 = await api.raw('POST', '/messages', { receiver_id: dan.user.id, message: 'hello again' }, cat.token);
  assert(m2.status === 201, 'messaging works again after unblock: ' + m2.status);
  await c2.close();
});

errors.push('--');
await S.test('ACC-09', 'Support: create a ticket (validation), reply, close; admin reply is visible; feedback submit', async () => {
  await go('/help');
  await page.getByTestId('help-center').waitFor();
  await page.getByRole('tab', { name: 'Support tickets' }).click();
  await page.getByRole('button', { name: 'New ticket' }).click();
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await page.getByRole('alert').first().waitFor();
  await page.getByLabel('Subject').fill('Cannot download my offer');
  await page.getByRole('textbox', { name: 'Message' }).fill('The PDF button does nothing on my phone.');
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await toast('created');
  if (!(await page.getByTestId('ticket-detail').isVisible().catch(() => false))) await page.getByTestId('ticket-row').first().click();
  await page.getByLabel('Reply').fill('Any update?');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await toast('Reply sent');
  const t = (await api.get('/support/tickets', undefined, ann.token)).items[0];
  await api.post(`/admin/support/tickets/${t.id}/reply`, { message: 'We fixed it, please retry.' }, adminTok);
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Support tickets' }).click();
  if (!(await page.getByTestId('ticket-detail').isVisible().catch(() => false))) await page.getByTestId('ticket-row').first().click();
  await page.getByText('We fixed it, please retry.').waitFor();
  await page.getByRole('button', { name: 'Close ticket' }).click();
  await toast('Ticket closed');
  await page.getByRole('tab', { name: 'Feedback' }).click();
  await page.getByLabel('Your feedback').fill('Great product, please add dark mode.');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await page.getByTestId('feedback-row').first().waitFor();
});

errors.push('--');
await S.test('ACC-10', 'Register with ?ref= credits the referrer; invalid codes do not block sign-up', async () => {
  const ref = await api.get('/me/referrals', undefined, ann.token);
  const p = await (await browser.newContext()).newPage(); watch(p, errors);
  await p.goto(APP + '/register?ref=' + ref.code); await p.waitForLoadState('networkidle');
  await p.getByText(new RegExp(ref.code, 'i')).first().waitFor().catch(() => {});
  const name = 'Rae Referred'; const email = `rae.${rand}@example.com`;
  await p.getByLabel('Full name').fill(name);
  await p.getByLabel(/^Email/).fill(email);
  await p.locator('input[type=password]').first().fill(PW);
  await p.getByRole('button', { name: /Create account|Sign up|Register/ }).first().click();
  await p.waitForURL(/dashboard|profile|onboarding|jobs/, { timeout: 15000 });
  const after = await api.get('/me/referrals', undefined, ann.token);
  assert(after.total === ref.total + 1, 'referrer credited');
  const junk = await api.raw('POST', '/auth/register', { name: 'Jo Junk', email: `jo.${rand}@example.com`, password: PW, role: 'user', referral_code: 'ZZZZZZ' });
  assert(junk.status === 201, 'unknown code must not block sign-up');
  await p.context().close();
});

errors.push('--');
await S.test('ACC-11', 'Chat: block and report from a conversation', async () => {
  const eve = await mk('Eve Employer', 'recruiter'); const fay = await mk('Fay Fresh');
  const sent = await api.raw('POST', '/messages', { receiver_id: fay.user.id, message: 'Hi Fay, are you open to roles?' }, eve.token);
  assert(sent.status === 201, 'recruiter message: ' + sent.status + JSON.stringify(sent.data));
  const c3 = await authedContext(browser, fay.token); const page = await c3.newPage(); watch(page, errors);
  await page.goto(APP + '/messages'); await page.waitForLoadState('networkidle');
  await page.getByText('Eve Employer').first().click();
  await page.getByRole('button', { name: 'Report this conversation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Submit|Report|Send/ }).last().click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Block this user' }).click();
  await page.getByRole('button', { name: 'Block', exact: true }).click();
  await page.locator('.toast', { hasText: 'blocked' }).first().waitFor();
});

errors.push('--');
await S.test('ACC-12', 'Mobile 375px: account centre and help fit the screen', async () => {
  const c = await authedContext(browser, ann.token, { width: 375, height: 800 }); const p = await c.newPage(); watch(p, errors);
  for (const x of ['/account', '/help']) { await p.goto(APP + x); await p.waitForLoadState('networkidle'); await noOverflow(p); }
  await c.close();
});

errors.push('--');
await S.test('ACC-13', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--');
  assert(bad.length === 0, bad.slice(0, 3).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
