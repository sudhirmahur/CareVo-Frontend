import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, DataState, PageHeader } from '../../../components/ui';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
const TONE = { paid: 'success', created: 'warning', failed: 'danger', refunded: 'neutral' };

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: SCRIPT, async: true });
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}

export default function PremiumPlans() {
  const toast = useToast();
  const plans = useAsync(() => api.get('/plans'), []);
  const mine = useAsync(() => api.get('/payments/me'), []);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState(null);
  const items = plans.data?.items || [];
  const enabled = plans.data?.payments_enabled;

  const buy = async (plan) => {
    setBusy(plan.id);
    try {
      const o = await api.post('/payments/order', { plan_id: plan.id });
      await loadCheckout();
      await new Promise((resolve) => {
        const rz = new window.Razorpay({
          key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id, name: 'CareVo', description: `${plan.name} - ${plan.duration_days} days`,
          prefill: { name: o.name, email: o.email }, theme: { color: '#2563eb' },
          handler: async (resp) => {
            try {
              const r = await api.post('/payments/verify', { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature });
              setDone(r);
              toast.success('Payment successful. Premium is active!');
              mine.reload();
            } catch (e) { toast.error(errorMessage(e)); }
            resolve();
          },
          modal: { ondismiss: () => { toast.info?.('Payment cancelled'); resolve(); } },
        });
        rz.on?.('payment.failed', (r) => toast.error(r?.error?.description || 'Payment failed. Please try again.'));
        rz.open();
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const m = mine.data;
  const active = (done?.is_premium ?? m?.is_premium) && true;
  const until = done?.premium_until || m?.premium_until;
  return (
    <>
      <PageHeader title="Premium plans" description="Apply from Job Reels and view recruiter profiles with Premium." />
      {active && <div className="u-prem-active" role="status" data-testid="premium-active"><Icon name="crown" size={20} /><span>Premium is active{until ? ` until ${formatDate(until)}` : ''}.</span></div>}
      <DataState loading={plans.loading} error={plans.error} onRetry={plans.reload} hasData={!!plans.data} isEmpty={!items.length} empty={{ icon: 'crown', title: 'No plans available yet', description: 'Plans will appear here soon.' }}>
        {!enabled && <p className="form-error" role="alert">Online payments are not switched on yet. Please contact support to activate Premium.</p>}
        <div className="u-plans" data-testid="plans">
          {items.map((p) => (
            <Card key={p.id} className={`u-plan ${p.is_popular ? 'popular' : ''}`}>
              {p.is_popular && <Badge tone="warning">Most popular</Badge>}
              <h3>{p.name}</h3>
              <p className="u-plan-price"><strong>{inr(p.price)}</strong><span className="muted"> / {p.duration_days} days</span></p>
              {p.description && <p className="muted">{p.description}</p>}
              <ul className="u-lock-list">{(p.features || []).map((f) => <li key={f}><Icon name="check" size={15} /> {f}</li>)}</ul>
              <Button icon="crown" loading={busy === p.id} disabled={!enabled || !!busy} onClick={() => buy(p)} className="btn-block">{active ? 'Renew' : 'Buy'} {p.name}</Button>
            </Card>
          ))}
        </div>
      </DataState>
      <Card title="Payment history" className="u-hist">
        <DataState loading={mine.loading} error={mine.error} onRetry={mine.reload} hasData={!!m} isEmpty={!(m?.items || []).length} empty={{ icon: 'dollar', title: 'No payments yet', description: 'Your receipts will show here.' }}>
          <div className="table-wrap"><table className="table rtable" data-testid="my-payments">
            <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{(m?.items || []).map((p) => <tr key={p.id}><td data-label="Date">{formatDate(p.created_at, true)}</td><td data-label="Plan">{p.plan_name}</td><td data-label="Amount">{inr(p.amount_rupees)}</td><td data-label="Status"><Badge tone={TONE[p.status]} dot>{p.status}</Badge></td></tr>)}</tbody></table></div>
        </DataState>
      </Card>
    </>
  );
}
