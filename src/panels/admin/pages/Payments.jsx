import { useState } from 'react';
import { API_BASE, api, errorMessage, tokenStore } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import { Badge, BarChart, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, StatCard, Switch, Tabs, Textarea } from '../../../components/ui';
import { ActionBtn, ListShell, useDo, usePagedList, useSearch } from '../common';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const PAY_TONE = { paid: 'success', created: 'warning', failed: 'danger', refunded: 'neutral' };

function Overview() {
  const [days, setDays] = useState('30');
  const { data: s, loading, error, reload } = useAsync(() => api.get('/admin/payments/summary', { days }), [days]);
  const chart = (s?.series || []).filter((_, i, a) => (s.days <= 14 ? true : i % Math.ceil(a.length / 14) === 0)).map((d) => ({ label: d.date.slice(5), value: d.revenue }));
  return (
    <DataState loading={loading} error={error} onRetry={reload} hasData={!!s}>
      {s && (
        <div className="stack">
          <div className="grid grid-4 ad-stats" data-testid="pay-summary">
            <StatCard icon="dollar" tone="success" label="Revenue" value={inr(s.revenue)} hint={`${s.paid_count} paid orders`} />
            <StatCard icon="refresh" tone="warning" label="Refunded" value={inr(s.refunded)} hint={`${s.refund_count} refunds`} />
            <StatCard icon="crown" label="Active subscriptions" value={s.active_subscriptions} hint={`${s.expired_subscriptions} expired`} />
            <StatCard icon="alert" tone="danger" label="Failed / pending" value={`${s.failed_count} / ${s.pending_count}`} />
          </div>
          <Card title="Revenue" subtitle={`Last ${s.days} days (INR)`} actions={<Select aria-label="Range" value={days} onChange={(e) => setDays(e.target.value)} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />}>
            <BarChart data={chart} ariaLabel="Revenue per day" />
          </Card>
        </div>
      )}
    </DataState>
  );
}

function RefundModal({ pay, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [run, busy] = useDo();
  return (
    <Modal title="Refund payment" size="sm" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={async () => { if (await run(() => api.post(`/admin/payments/${pay.id}/refund`, { reason: reason.trim() || null }), 'Payment refunded')) { onDone(); onClose(); } }}>Refund {inr(pay.amount_rupees)}</Button></>}>
      <div className="stack">
        <p className="muted">{pay.user?.name} will get {inr(pay.amount_rupees)} back through Razorpay and Premium from this payment ends.</p>
        <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </div>
    </Modal>
  );
}

function PaymentsTab() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/payments', { status, q: dq });
  const [refund, setRefund] = useState(null);
  const exportCsv = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/payments/export`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      if (!r.ok) throw new Error('Export failed');
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: 'payments.csv' });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <>
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search order, payment id, name or email"
        tabs={[{ value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'created', label: 'Pending' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }]} tab={status} onTab={setStatus}
        filtersRight={<Button variant="secondary" icon="download" onClick={exportCsv}>Export CSV</Button>}
        empty={{ icon: 'dollar', title: 'No payments yet', description: 'Payments appear here after candidates buy a plan.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="payments-table">
            <thead><tr><th>Date</th><th>Candidate</th><th>Plan</th><th>Amount</th><th>Status</th><th>Order</th><th /></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id}>
                <td data-label="Date">{formatDate(p.created_at, true)}</td>
                <td data-label="Candidate"><span className="strong">{p.user?.name || '-'}</span><div className="muted small">{p.user?.email}</div></td>
                <td data-label="Plan">{p.plan_name}</td>
                <td data-label="Amount">{inr(p.amount_rupees)}</td>
                <td data-label="Status"><Badge tone={PAY_TONE[p.status]} dot>{p.status}</Badge></td>
                <td data-label="Order" className="small muted">{p.order_id}</td>
                <td className="cell-actions"><div className="actions">{p.status === 'paid' && <ActionBtn icon="refresh" tone="danger" label={`Refund ${p.order_id}`} onClick={() => setRefund(p)} />}</div></td>
              </tr>))}</tbody></table></div>
        )}
      </ListShell>
      {refund && <RefundModal pay={refund} onClose={() => setRefund(null)} onDone={res.reload} />}
    </>
  );
}

const BLANK_PLAN = { name: '', description: '', price: '', duration_days: '30', features: '', is_popular: false, is_active: true };
function PlanModal({ plan, onClose, onDone }) {
  const [f, setF] = useState(plan ? { ...BLANK_PLAN, ...plan, price: String(plan.price), duration_days: String(plan.duration_days), features: (plan.features || []).join('\n') } : BLANK_PLAN);
  const [err, setErr] = useState({});
  const [run, busy] = useDo();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a plan name.';
    if (!(Number(f.price) > 0)) er.price = 'Enter a price above 0.';
    const d = Number(f.duration_days);
    if (!Number.isInteger(d) || d < 1 || d > 3650) er.duration_days = 'Enter whole days (1 - 3650).';
    setErr(er);
    if (Object.keys(er).length) return;
    const body = { name: f.name.trim(), description: (f.description || '').trim() || null, price: Number(f.price), duration_days: d, features: f.features.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12), is_popular: f.is_popular, is_active: f.is_active };
    if (await run(() => (plan ? api.put(`/admin/plans/${plan.id}`, body) : api.post('/admin/plans', body)), plan ? 'Plan updated' : 'Plan created')) { onDone(); onClose(); }
  };
  return (
    <Modal title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{plan ? 'Save changes' : 'Create plan'}</Button></>}>
      <div className="stack">
        <Input label="Plan name" value={f.name} onChange={set('name')} error={err.name} maxLength={60} required />
        <Input label="Short description" value={f.description || ''} onChange={set('description')} maxLength={300} />
        <div className="grid grid-2">
          <Input label="Price (INR)" type="number" min="1" step="1" value={f.price} onChange={set('price')} error={err.price} required />
          <Input label="Duration (days)" type="number" min="1" value={f.duration_days} onChange={set('duration_days')} error={err.duration_days} required />
        </div>
        <Textarea label="Features (one per line)" rows={4} value={f.features} onChange={set('features')} />
        <Switch checked={f.is_popular} onChange={(v) => setF({ ...f, is_popular: v })} label="Mark as most popular" />
        <Switch checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} label="Available for purchase" />
      </div>
    </Modal>
  );
}

function PlansTab() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/plans'), []);
  const [run, busy] = useDo(reload);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const items = data?.items || [];
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}><span className="muted">Candidates buy these plans with Razorpay to get Premium.</span><Button icon="plus" onClick={() => setEdit({})}>New plan</Button></div>
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={!items.length} empty={{ icon: 'crown', title: 'No plans yet', description: 'Create a plan so candidates can upgrade.' }}>
          <div className="table-wrap"><table className="table rtable" data-testid="plans-table">
            <thead><tr><th>Plan</th><th>Price</th><th>Duration</th><th>Sales</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id}>
                <td data-label="Plan"><span className="strong">{p.name}</span>{p.is_popular && <Badge tone="warning" className="ad-prem">Popular</Badge>}</td>
                <td data-label="Price">{inr(p.price)}</td><td data-label="Duration">{p.duration_days} days</td><td data-label="Sales">{p.sales}</td>
                <td data-label="Status">{p.is_active ? <Badge tone="success" dot>On sale</Badge> : <Badge tone="neutral" dot>Off</Badge>}</td>
                <td className="cell-actions"><div className="actions"><ActionBtn icon="edit" label={`Edit plan ${p.name}`} onClick={() => setEdit(p)} /><ActionBtn icon="trash" tone="danger" label={`Delete plan ${p.name}`} onClick={() => setDel(p)} /></div></td>
              </tr>))}</tbody></table></div>
        </DataState>
      </Card>
      {edit && <PlanModal key={edit.id || 'new'} plan={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={reload} />}
      <ConfirmDialog open={!!del} danger title="Delete plan?" message={del && `"${del.name}" will be removed. Plans that already have payments are switched off instead.`} confirmLabel="Delete plan" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/plans/${del.id}`), (r) => r.message)) setDel(null); }} />
    </>
  );
}

function SubsTab() {
  const [state, setState] = useState('');
  const res = usePagedList('/admin/subscriptions', { state });
  return (
    <ListShell res={res} tabs={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }]} tab={state} onTab={setState} empty={{ icon: 'crown', title: 'No subscriptions', description: 'Paid memberships show up here.' }}>
      {(items) => (
        <div className="table-wrap"><table className="table rtable" data-testid="subs-table">
          <thead><tr><th>Candidate</th><th>Plan</th><th>Starts</th><th>Ends</th><th>State</th></tr></thead>
          <tbody>{items.map((s) => (
            <tr key={s.id}><td data-label="Candidate"><span className="strong">{s.user?.name}</span><div className="muted small">{s.user?.email}</div></td><td data-label="Plan">{s.plan_name}</td><td data-label="Starts">{formatDate(s.starts_at)}</td><td data-label="Ends">{formatDate(s.ends_at)}</td>
              <td data-label="State"><Badge tone={s.state === 'active' ? 'success' : 'neutral'} dot>{s.state}</Badge></td></tr>))}</tbody></table></div>
      )}
    </ListShell>
  );
}

export default function Payments() {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <PageHeader title="Subscriptions & payments" description="Plans, Razorpay payments, refunds and active memberships." />
      <Tabs tabs={[{ value: 'overview', label: 'Overview' }, { value: 'payments', label: 'Payments' }, { value: 'plans', label: 'Plans' }, { value: 'subs', label: 'Subscriptions' }]} value={tab} onChange={setTab} />
      {tab === 'overview' && <Overview />}{tab === 'payments' && <PaymentsTab />}{tab === 'plans' && <PlansTab />}{tab === 'subs' && <SubsTab />}
    </>
  );
}
