import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import Icon from '../../components/Icon';
import { Button, Modal } from '../../components/ui';
import { Link } from '../../lib/router';

const Ctx = createContext(null);

const COPY = {
  apply: {
    title: 'Apply Access Restricted',
    text: 'Applying to jobs directly from Job Reels is a Premium feature. Upgrade to apply in one tap and get noticed faster.',
  },
  recruiter: {
    title: 'Recruiter Profile is Restricted',
    text: 'Viewing recruiter profiles is available to Premium members. Upgrade to see who is hiring and connect with them.',
  },
  generic: { title: 'Premium feature', text: 'This feature is available to Premium members.' },
};

/** Premium status + the two "restricted" dialogs used by Job Reels. Provide once around the user panel pages that need it. */
export function PremiumProvider({ children }) {
  const toast = useToast();
  const status = useAsync(() => api.get('/users/me/premium'), []);
  const plans = useAsync(() => api.get('/plans'), []);
  const canBuy = Boolean(plans.data?.payments_enabled && plans.data?.items?.length);
  const [open, setOpen] = useState(null); // 'apply' | 'recruiter' | 'generic' | null
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const d = status.data;
  const locked = Boolean(d && d.gating_enabled && !d.is_premium);

  const request = async () => {
    setBusy(true);
    try {
      const r = await api.post('/users/me/premium/request');
      toast.success(r.message);
      setSent(true);
      status.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const close = useCallback(() => setOpen(null), []);
  const show = useCallback((kind = 'generic') => { setSent(false); setOpen(kind); }, []);
  const value = useMemo(() => ({ locked, status: d, reload: status.reload, show, request, busy }), [locked, d, status.reload, show, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = open ? COPY[open] : null;
  const pending = sent || d?.request_pending;
  return (
    <Ctx.Provider value={value}>
      {children}
      {open && (
        <Modal size="sm" title={copy.title} onClose={close}>
          <div className="u-lock" role="alertdialog" aria-label={copy.title}>
            <span className="u-lock-ico"><Icon name="lock" size={30} /></span>
            <p className="muted">{copy.text}</p>
            <ul className="u-lock-list">
              <li><Icon name="check" size={15} /> Apply directly from Job Reels</li>
              <li><Icon name="check" size={15} /> View recruiter profiles</li>
            </ul>
            {pending ? (
              <p className="form-ok" role="status">Request received. Our team will activate Premium for you soon.</p>
            ) : canBuy ? (
              <Link to="/premium" className="btn btn-primary btn-lg btn-block" onClick={close}><Icon name="crown" size={18} /> View Premium plans</Link>
            ) : (
              <Button size="lg" icon="crown" loading={busy} onClick={request} className="btn-block">Upgrade to Premium</Button>
            )}
            <Button variant="ghost" onClick={close} className="btn-block">{pending ? 'Close' : 'Maybe Later'}</Button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function usePremium() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePremium must be used inside <PremiumProvider>');
  return v;
}
