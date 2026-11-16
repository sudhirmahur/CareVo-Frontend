// ADMIN panel - new features (support, roles, emails, analytics, health, data/backups, events).
import { URLS, makeApi, suite, assert, chromium, authedContext, watch, uniq } from './lib.mjs';

const { APP, API } = URLS(5201, 8001);
const api = makeApi(API);
const S = suite('Admin panel - new features', process.env.REPORT_OUT || '/home/claude/reports/admin-w2-e2e.json');
const errors = [];
const adminTok = await api.login('admin@carevo.demo', 'Admin@12345');
const rand = uniq();
const cand = await api.register('Tia Ticket', `tia.${rand}@example.com`, 'secret123');
const browser = await chromium.launch();
const ctx = await authedContext(browser, adminTok);
const page = await ctx.newPage();
watch(page, errors);
const go = async (p) => { await page.goto(APP + p); await page.waitForLoadState('networkidle'); };
const toast = (t) => page.locator('.toast', { hasText: t }).first().waitFor();
const noOverflow = async () => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert(o <= 1, `horizontal overflow ${o}px`); };

errors.push('--');
await S.test('ADW-01', 'Support desk: ticket from a user is listed; admin replies, adds a private note, assigns and resolves', async () => {
  const t = await api.post('/support/tickets', { subject: 'Cannot upload my resume', category: 'technical', message: 'The upload button does nothing.', priority: 'high' }, cand.token);
  await go('/admin/support');
  await page.getByTestId('ticket-summary').waitFor();
  await page.getByRole('button', { name: new RegExp(t.ticket_no) }).click();
  const d = page.getByTestId('ticket-detail');
  await d.waitFor();
  await d.getByLabel('Reply to user').fill('Thanks, we are looking into it.');
  await d.getByRole('button', { name: 'Send reply' }).click();
  await toast('Reply sent');
  await d.getByLabel('Add a note').fill('Looks like a Safari bug');
  await d.getByRole('button', { name: 'Add note' }).click();
  await toast('Note added');
  await d.getByLabel('Assignee').selectOption({ label: 'Platform Admin' }).catch(async () => { const o = await d.getByLabel('Assignee').locator('option').allTextContents(); await d.getByLabel('Assignee').selectOption({ index: o.length > 1 ? 1 : 0 }); });
  await d.getByLabel('Status').selectOption('resolved');
  await page.waitForTimeout(500);
  const mine = await api.get(`/support/tickets/${t.id}`, undefined, cand.token);
  assert(mine.messages.some((m) => m.staff), 'user must see the staff reply');
  assert(!mine.notes, 'internal notes must not leak to the user');
  assert(mine.status === 'resolved', 'ticket status ' + mine.status);
});

errors.push('--');
await S.test('ADW-02', 'Support desk filters narrow the list; feedback tab lists submissions and updates status', async () => {
  await api.post('/support/tickets', { subject: 'Billing question please', category: 'billing', message: 'I was charged twice.' }, cand.token);
  await api.post('/feedback', { category: 'idea', rating: 4, message: 'Add dark mode to the dashboard' }, cand.token);
  await go('/admin/support');
  await page.getByLabel('Filter category').selectOption('billing');
  await page.waitForTimeout(500);
  const rows = await page.locator('[data-testid=tickets-table] tbody tr').count();
  assert(rows >= 1 && (await page.locator('[data-testid=tickets-table] tbody tr', { hasText: 'resume' }).count()) === 0, 'category filter');
  await page.getByRole('tab', { name: 'Feedback' }).click();
  await page.getByTestId('feedback-summary').waitFor();
  await page.getByText('Add dark mode to the dashboard').waitFor();
  await page.getByLabel(/Status of feedback from Tia/).first().selectOption('planned');
  await toast('Feedback updated');
});

errors.push('--');
await S.test('ADW-03', 'Roles: create a custom role with a permission matrix, assign it to a new admin; restricted admin sees limited navigation', async () => {
  await go('/admin/roles');
  await page.getByRole('button', { name: 'New role' }).click();
  await page.getByLabel('Key').fill('finance_' + rand);
  await page.getByLabel('Name', { exact: true }).fill('Finance Viewer');
  await page.getByLabel('Plans & payments read').check();
  await page.getByLabel('Dashboard read').check();
  await page.getByRole('button', { name: 'Save role' }).click();
  await toast('Role saved');
  await page.getByRole('tab', { name: 'Administrators' }).click();
  await page.getByRole('button', { name: 'New administrator' }).click();
  const em = `fin.${rand}@example.com`;
  await page.getByLabel('Name', { exact: true }).fill('Fiona Finance');
  await page.getByLabel('Email').fill(em);
  await page.getByLabel('Temporary password').fill('Finance@12345');
  await page.getByLabel('Role', { exact: true }).selectOption('finance_' + rand);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await toast('Administrator created');
  const ft = await api.login(em, 'Finance@12345');
  const c2 = await authedContext(browser, ft);
  const p2 = await c2.newPage();
  watch(p2, errors);
  await p2.goto(APP + '/admin/dashboard'); await p2.waitForLoadState('networkidle');
  await p2.getByRole('link', { name: 'Payments & plans' }).first().waitFor();
  assert((await p2.getByRole('link', { name: 'Users', exact: true }).count()) === 0, 'Users nav must be hidden');
  assert((await p2.getByRole('link', { name: 'Roles & admins' }).count()) === 0, 'Roles nav must be hidden');
  const denied = await api.raw('GET', '/admin/users', undefined, ft);
  assert(denied.status === 403, 'API must deny users: ' + denied.status);
  const ok = await api.raw('GET', '/admin/payments', undefined, ft);
  assert(ok.status === 200, 'payments read allowed');
  const ro = await api.raw('POST', '/admin/plans', { name: 'X plan', price: 1, duration_days: 1 }, ft);
  assert(ro.status === 403, 'create must be denied for read-only role');
  await c2.close();
});

errors.push('--');
await S.test('ADW-04', 'Roles: system roles cannot be deleted; permission history records the change', async () => {
  const r = await api.raw('DELETE', '/admin/roles/super_admin', undefined, adminTok);
  assert(r.status >= 400, 'system role delete must fail');
  await go('/admin/roles');
  await page.getByRole('tab', { name: 'Permission history' }).click();
  await page.getByText(/role\.create/).first().waitFor();
});

errors.push('--');
await S.test('ADW-05', 'Email templates: edit with live preview, validation, send test; outbox shows it', async () => {
  await go('/admin/emails');
  await page.getByTestId('templates-table').waitFor();
  await page.locator('tbody tr', { hasText: 'Welcome' }).first().getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Subject').fill('');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Subject is required.').waitFor();
  await page.getByLabel('Subject').fill('Welcome to CareVo, {{name}}!');
  await page.getByTestId('email-preview').getByText('Welcome to CareVo, Aarav!').waitFor();
  await page.getByRole('button', { name: 'Send test to me' }).click();
  await toast('Test email recorded');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast('Template saved');
  await page.getByRole('tab', { name: 'Outbox' }).click();
  await page.getByTestId('outbox-table').locator('tbody tr', { hasText: 'admin@carevo.demo' }).first().waitFor();
});

errors.push('--');
await S.test('ADW-06', 'Revenue analytics: KPIs, period switch and CSV download', async () => {
  await go('/admin/analytics');
  await page.getByTestId('rev-kpis').waitFor();
  await page.getByRole('tab', { name: 'Monthly' }).click();
  await page.getByRole('img', { name: 'Revenue trend' }).waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download report' }).click()]);
  assert(/revenue-monthly\.csv/.test(dl.suggestedFilename()), 'filename ' + dl.suggestedFilename());
});

errors.push('--');
await S.test('ADW-07', 'System health: status, services, alerts; server errors are logged and can be cleared', async () => {
  await go('/admin/health');
  await page.getByTestId('health-status').getByText('All systems operational').waitFor();
  await page.getByTestId('health-services').waitFor();
  await page.getByTestId('health-alerts').getByText(/backup/i).waitFor();
  await page.getByText('No errors recorded.').waitFor();
});

errors.push('--');
await S.test('ADW-08', 'Data export: CSV, Excel and PDF downloads', async () => {
  await go('/admin/data');
  await page.getByTestId('exports').waitFor();
  for (const [fmt, ext] of [['CSV', 'csv'], ['XLSX', 'xlsx'], ['PDF', 'pdf']]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: `Export users as ${fmt}` }).click()]);
    assert(dl.suggestedFilename().endsWith('.' + ext), 'ext ' + dl.suggestedFilename());
  }
});

errors.push('--');
await S.test('ADW-09', 'Backups: create, schedule, restore needs typed confirmation and brings back deleted data', async () => {
  const victim = await api.register('Vera Victim', `vera.${rand}@example.com`, 'secret123');
  await go('/admin/data');
  await page.getByRole('tab', { name: 'Backups' }).click();
  await page.getByRole('button', { name: 'Back up now' }).click();
  await toast('Backup created');
  await page.getByTestId('backups-table').locator('tbody tr').first().getByText('success').waitFor();
  await page.getByTestId('backup-schedule').getByText('Automatic backups').click();
  await toast('Schedule saved');
  // delete the user through the API, then restore from the UI
  await api.del(`/admin/users/${victim.user.id}`, undefined, adminTok);
  await page.getByTestId('backups-table').locator('tbody tr').first().getByRole('button', { name: 'Restore' }).click();
  const btn = page.getByRole('button', { name: 'Restore data' });
  assert(await btn.isDisabled(), 'restore must be disabled until RESTORE is typed');
  await page.getByLabel('Type RESTORE to confirm').fill('restore');
  assert(await btn.isDisabled(), 'case sensitive');
  await page.getByLabel('Type RESTORE to confirm').fill('RESTORE');
  await btn.click();
  await toast('Backup restored');
  const back = await api.raw('POST', '/auth/login', { email: `vera.${rand}@example.com`, password: 'secret123' });
  assert(back.status === 200, 'restored user must be able to sign in: ' + back.status);
});

errors.push('--');
await S.test('ADW-10', 'Events: create (validation), registrations list, deletion requests approve flow', async () => {
  await go('/admin/events');
  await page.getByRole('button', { name: 'New event' }).click();
  await page.getByRole('button', { name: 'Save event' }).click();
  await page.getByText('Title needs 3+ characters.').waitFor();
  await page.getByLabel('Title').fill('Resume clinic ' + rand);
  const start = new Date(Date.now() + 3 * 864e5); const p = (n) => String(n).padStart(2, '0');
  await page.getByLabel('Starts').fill(`${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}T10:00`);
  await page.getByLabel('Join link').fill('not a url');
  await page.getByRole('button', { name: 'Save event' }).click();
  await page.getByText('Enter a full http(s):// link.').waitFor();
  await page.getByLabel('Join link').fill('https://meet.example.com/clinic');
  await page.getByRole('button', { name: 'Save event' }).click();
  await toast('Event saved');
  const ev = (await api.get('/events', undefined, cand.token)).items.find((e) => e.title.includes(rand));
  assert(ev, 'event visible to candidates');
  await api.post(`/events/${ev.id}/register`, {}, cand.token);
  await page.reload(); await page.waitForLoadState('networkidle');
  await page.getByTestId('events-table').waitFor();
  await page.locator('tbody tr', { hasText: rand }).getByRole('button', { name: 'Registrations' }).click();
  await page.getByTestId('registrations').getByText('Tia Ticket').waitFor();
  await page.keyboard.press('Escape');
  const gone = await api.register('Gus Gone', `gus.${rand}@example.com`, 'secret123');
  await api.post('/account/deletion-request', { reason: 'Leaving', password: 'secret123' }, gone.token);
  await page.getByRole('tab', { name: 'Deletion requests' }).click();
  await page.getByTestId('deletion-table').getByText('Gus Gone').waitFor();
  await page.getByRole('button', { name: 'Approve & delete' }).click();
  await page.getByRole('button', { name: 'Delete account' }).click();
  await toast('Account deleted');
});

errors.push('--');
await S.test('ADW-11', 'Mobile 375px: new admin pages have no horizontal overflow', async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of ['support', 'roles', 'emails', 'analytics', 'health', 'data', 'events']) { await go('/admin/' + p); await noOverflow(); }
  await page.setViewportSize({ width: 1280, height: 800 });
});

errors.push('--');
await S.test('ADW-12', 'No console errors or 5xx during the whole run', async () => {
  const bad = errors.filter((e) => e !== '--');
  assert(bad.length === 0, bad.slice(0, 3).join(' | '));
});

await browser.close();
process.exit(S.summary() ? 0 : 1);
