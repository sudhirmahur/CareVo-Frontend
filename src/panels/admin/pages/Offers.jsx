import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Modal, PageHeader, Select } from '../../../components/ui';
import OfferPreview from '../../../components/shared/OfferPreview';
import { downloadFile } from '../../recruiter/util';
import { ListShell, useSearch, usePagedList } from '../common';

const TONE = { draft: 'neutral', sent: 'warning', accepted: 'success', declined: 'danger', withdrawn: 'neutral', expired: 'neutral' };

function OfferModal({ id, onClose }) {
  const toast = useToast();
  const { data: o, error: err } = useAsync(() => api.get(`/recruiter/offers/${id}`), [id]);
  return (
    <Modal open size="lg" title={o ? `${o.designation} - ${o.candidate_name}` : 'Offer letter'} description={o && <Badge tone={TONE[o.status]} dot>{o.status}</Badge>} onClose={onClose}
      footer={o && <Button variant="secondary" icon="download" onClick={() => downloadFile(`/admin/offers/${id}/pdf`, `offer-${id.slice(-6)}.pdf`).catch((e) => toast.error(errorMessage(e)))}>Download PDF</Button>}>
      {err && <p className="form-error" role="alert">{String(err)}</p>}
      {o && <OfferPreview d={{ ...o, date: o.sent_at || o.created_at, ref: `OFR-${String(o.id).slice(-8).toUpperCase()}` }} />}
    </Modal>
  );
}

export default function Offers() {
  const [status, setStatus] = useState('');
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/offers', { status, q: dq });
  const [open, setOpen] = useState(null);
  const counts = res.data?.counts || {};
  return (
    <>
      <PageHeader title="Offer letters" description="Every offer sent on the platform. Read-only: recruiters create, send and withdraw offers." />
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search candidate, company or role…"
        extraFilters={<Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: `All statuses (${Object.values(counts).reduce((a, b) => a + b, 0)})` }, ...['draft', 'sent', 'accepted', 'declined', 'withdrawn', 'expired'].map((s) => ({ value: s, label: `${s} (${counts[s] || 0})` }))]} />}
        empty={{ icon: 'award', title: 'No offers yet', description: 'Offers sent by recruiters will be listed here.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="admin-offers">
            <thead><tr><th>Candidate</th><th>Role</th><th>Company</th><th>Salary</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>{items.map((o) => (
              <tr key={o.id}>
                <td data-label="Candidate" className="strong">{o.candidate_name}</td><td data-label="Role">{o.designation}</td><td data-label="Company">{o.company_name}</td><td data-label="Salary">{o.salary_text}</td>
                <td data-label="Status"><Badge tone={TONE[o.status]} dot>{o.status}</Badge></td><td data-label="Created">{formatDate(o.created_at)}</td>
                <td><Button size="sm" variant="secondary" onClick={() => setOpen(o.id)} aria-label={`View offer for ${o.candidate_name}`}>View</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </ListShell>
      {open && <OfferModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
