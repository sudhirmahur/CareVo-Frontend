import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, StatCard, Switch } from '../../components/ui';

const ROLE_OPTS = ['hr_manager', 'recruiter', 'interviewer', 'hiring_manager'].map((v) => ({ value: v, label: v.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()) }));
const PERMS = ['jobs', 'candidates', 'interviews', 'evaluations', 'offers', 'team', 'analytics'];

function InviteModal({ jobs, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', role: 'recruiter', job_ids: [] });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) er.email = 'Enter a valid email address.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await api.post('/recruiter/team', { ...f, name: f.name.trim(), email: f.email.trim() }); toast.success('Team member invited'); onDone(); onClose(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Invite team member" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Send invite</Button></>}>
      <div className="stack">
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
        <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={ROLE_OPTS} />
        <JobPicker jobs={jobs} value={f.job_ids} onChange={(job_ids) => setF({ ...f, job_ids })} />
      </div>
    </Modal>
  );
}

function JobPicker({ jobs, value, onChange }) {
  if (!jobs.length) return <p className="muted small">Post a job to assign it to team members.</p>;
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0 }}><legend className="small strong">Assigned jobs</legend>
      {jobs.map((j) => <label key={j.id} className="row" style={{ gap: 8 }}><input type="checkbox" checked={value.includes(j.id)} onChange={(e) => onChange(e.target.checked ? [...value, j.id] : value.filter((x) => x !== j.id))} /> {j.title}</label>)}
    </fieldset>
  );
}

function MemberDrawer({ m, jobs, onClose, onDone }) {
  const toast = useToast();
  const [role, setRole] = useState(m.role);
  const [perms, setPerms] = useState(m.permissions);
  const [jobIds, setJobIds] = useState(m.job_ids);
  const [busy, setBusy] = useState(false);
  const perf = useAsync(() => api.get(`/recruiter/team/${m.id}/performance`), [m.id]);
  const act = useAsync(() => api.get(`/recruiter/team/${m.id}/activity`), [m.id]);
  const save = async () => {
    setBusy(true);
    try { await api.patch(`/recruiter/team/${m.id}`, { role, permissions: perms, job_ids: jobIds }); toast.success('Team member updated'); onDone(); onClose(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const p = perf.data;
  return (
    <Modal open size="lg" title={m.name} description={m.email} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button loading={busy} onClick={save}>Save changes</Button></>}>
      <div className="stack">
        <Select label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPerms(null); }} options={ROLE_OPTS} />
        <fieldset className="row wrap" style={{ border: 0, padding: 0, gap: 12 }}><legend className="small strong">Permissions {perms ? '(custom)' : '(role default)'}</legend>
          {PERMS.map((x) => { const on = (perms || m.permissions).includes(x); return <label key={x} className="row" style={{ gap: 6 }}><input type="checkbox" checked={on} onChange={(e) => { const base = perms || m.permissions; setPerms(e.target.checked ? [...base, x] : base.filter((y) => y !== x)); }} /> {x}</label>; })}
        </fieldset>
        <JobPicker jobs={jobs} value={jobIds} onChange={setJobIds} />
        {p && <div className="grid grid-4" data-testid="member-perf"><StatCard label="Assigned jobs" value={p.assigned_jobs} /><StatCard label="Applications" value={p.applications} /><StatCard label="Hired" value={p.hired} hint={`${p.hire_rate}% hire rate`} /><StatCard label="Evaluations" value={p.evaluations_given} /></div>}
        <Card title="Activity"><ul className="stack small">{(act.data?.items || []).map((a, i) => <li key={i}><strong>{a.action}</strong> <span className="muted">by {a.by}</span></li>)}</ul></Card>
      </div>
    </Modal>
  );
}

export default function Team() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/team'), []);
  const jobs = useAsync(() => api.get('/recruiter/jobs', { limit: 50 }), []);
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState(null);
  const [rm, setRm] = useState(null);
  const jlist = jobs.data?.items || [];
  const toggle = async (m, v) => { try { await api.patch(`/recruiter/team/${m.id}`, { is_active: v }); reload(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <>
      <PageHeader title="Hiring team" description="Roles, job assignment, activity and performance for your hiring team." actions={<Button icon="plus" onClick={() => setInvite(true)}>Invite member</Button>} />
      <p className="muted small" style={{ marginBottom: 12 }}>Team members are tracked for job assignment, evaluations and performance. Shared company logins are not part of this version.</p>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="table-wrap"><table className="table rtable" data-testid="team-table">
          <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Active</th><th /></tr></thead>
          <tbody>{(data?.items || []).map((m) => (
            <tr key={m.id}>
              <td data-label="Member"><strong>{m.name}</strong><div className="muted small">{m.email}</div></td>
              <td data-label="Role"><Badge tone={m.is_owner ? 'success' : 'neutral'}>{m.role.replace('_', ' ')}</Badge></td>
              <td data-label="Status">{m.status}</td>
              <td data-label="Active">{m.is_owner ? 'Yes' : <Switch checked={m.is_active} onChange={(v) => toggle(m, v)} label={m.is_active ? 'Active' : 'Inactive'} />}</td>
              <td className="cell-actions">{!m.is_owner && <div className="actions"><Button size="sm" variant="secondary" onClick={() => setOpen(m)}>Manage</Button><Button size="sm" variant="ghost" onClick={() => setRm(m)} aria-label={`Remove ${m.name}`}>Remove</Button></div>}</td>
            </tr>))}</tbody>
        </table></div>
      </DataState>
      {invite && <InviteModal jobs={jlist} onClose={() => setInvite(false)} onDone={reload} />}
      {open && <MemberDrawer m={open} jobs={jlist} onClose={() => setOpen(null)} onDone={reload} />}
      <ConfirmDialog open={!!rm} danger title="Remove team member?" message={`${rm?.name} will lose their role and job assignments.`} confirmLabel="Remove" onCancel={() => setRm(null)} onConfirm={async () => { try { await api.delete(`/recruiter/team/${rm.id}`); toast.success('Member removed'); setRm(null); reload(); } catch (e) { toast.error(errorMessage(e)); } }} />
    </>
  );
}
