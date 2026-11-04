import { useState } from 'react';
import { api } from '../../../lib/api';
import Icon from '../../../components/Icon';
import { useAuth } from '../../../lib/auth';
import { useAsync } from '../../../lib/hooks';
import { formatDate, isEmail } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, Input, Modal, PageHeader, Select, Skeleton } from '../../../components/ui';
import { ActionBtn, ListShell, PersonCell, RoleBadge, useDo, usePagedList, useSearch } from '../common';

const ROLE_OPTS = [{ value: 'user', label: 'Candidate' }, { value: 'recruiter', label: 'Recruiter' }, { value: 'admin', label: 'Admin' }];

function CreateUser({ onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'user' });
  const [err, setErr] = useState({});
  const [run, busy] = useDo();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter a name (min 2 characters).';
    if (!isEmail(f.email)) er.email = 'Enter a valid email.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = 'At least 8 characters with a letter and a number.';
    setErr(er);
    if (Object.keys(er).length) return;
    const ok = await run(() => api.post('/admin/users', { ...f, name: f.name.trim(), email: f.email.trim() }), 'User created');
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal title="Create user" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Create user</Button></>}>
      <div className="stack">
        <Input label="Full name" value={f.name} onChange={set('name')} error={err.name} />
        <Input label="Email" type="email" value={f.email} onChange={set('email')} error={err.email} />
        <Input label="Temporary password" type="text" value={f.password} onChange={set('password')} error={err.password} />
        <Select label="Role" value={f.role} onChange={set('role')} options={ROLE_OPTS} />
      </div>
    </Modal>
  );
}

function UserDetail({ id, onClose }) {
  const { data: u, loading, error } = useAsync(() => api.get(`/admin/users/${id}`), [id]);
  const p = u?.profile || {};
  return (
    <Modal title="User details" onClose={onClose} size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {loading && <Skeleton lines={5} />}
      {error && <p className="form-error">{error}</p>}
      {u && (
        <div className="stack" data-testid="user-detail">
          <PersonCell name={u.name} email={u.email} image={u.profile_image} />
          <dl className="ad-dl">
            <dt>Role</dt><dd><RoleBadge role={u.role} /></dd>
            <dt>Status</dt><dd>{u.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="danger" dot>Blocked</Badge>}</dd>
            <dt>Phone</dt><dd>{u.phone || '-'}</dd>
            <dt>Joined</dt><dd>{formatDate(u.created_at)}</dd>
            <dt>Applications</dt><dd>{u.applications_count}</dd>
            <dt>Resumes</dt><dd>{u.resumes_count}</dd>
            {u.company && (<><dt>Company</dt><dd>{u.company.name} ({u.company.status})</dd></>)}
            <dt>Position</dt><dd>{p.current_position || '-'}</dd>
            <dt>Location</dt><dd>{p.location || '-'}</dd>
            <dt>Experience</dt><dd>{p.experience_years ?? 0} yrs</dd>
            <dt>Skills</dt><dd>{(p.skills || []).join(', ') || '-'}</dd>
          </dl>
        </div>
      )}
    </Modal>
  );
}

function PremiumModal({ user, onClose, onDone }) {
  const [days, setDays] = useState('');
  const [run, busy] = useDo();
  const on = !!user.is_premium;
  const grant = async (value) => {
    const body = { is_premium: value };
    if (value && days) body.days = Number(days);
    const ok = await run(() => api.patch(`/admin/users/${user.id}/premium`, body), value ? 'Premium activated' : 'Premium removed');
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal title={`Premium · ${user.name}`} size="sm" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>{on && <Button variant="secondary" loading={busy} onClick={() => grant(false)}>Remove Premium</Button>}<Button loading={busy} onClick={() => grant(true)}>{on ? 'Update' : 'Activate Premium'}</Button></>}>
      <div className="stack">
        <p className="muted">{on ? `Currently Premium${user.premium_until ? ` until ${formatDate(user.premium_until)}` : ' (no expiry)'}.` : 'Premium lets this candidate apply from Job Reels and view recruiter profiles.'}</p>
        <Input label="Duration in days (leave empty for no expiry)" type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 30" />
      </div>
    </Modal>
  );
}

function PremiumRequests({ onGrant }) {
  const { data, reload } = useAsync(() => api.get('/admin/premium-requests'), []);
  const items = data?.items || [];
  if (!items.length) return null;
  return (
    <div className="ad-banner" role="status" data-testid="premium-requests">
      <strong><Icon name="crown" size={16} /> {items.length} Premium request{items.length > 1 ? 's' : ''}</strong>
      <ul>{items.map((r) => <li key={r.id}><span>{r.user.name} <span className="muted small">({r.user.email})</span></span><Button size="sm" onClick={() => onGrant(r.user, reload)}>Review</Button></li>)}</ul>
    </div>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('');
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/users', { role: tab, search: dq });
  const [run, busy] = useDo(res.reload);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [roleFor, setRoleFor] = useState(null);
  const [newRole, setNewRole] = useState('user');
  const [del, setDel] = useState(null);
  const [block, setBlock] = useState(null);
  const [prem, setPrem] = useState(null);

  const tabs = [{ value: '', label: 'All' }, { value: 'user', label: 'Candidates' }, { value: 'recruiter', label: 'Recruiters' }, { value: 'admin', label: 'Admins' }];
  return (
    <>
      <PageHeader title="Users" description="Every account on the platform." actions={<Button icon="plus" onClick={() => setCreating(true)}>Create user</Button>} />
      <PremiumRequests onGrant={(u, done) => setPrem({ ...u, _done: done })} />
      <ListShell res={res} tabs={tabs} tab={tab} onTab={setTab} search={q} onSearch={setQ} searchPlaceholder="Search by name or email" empty={{ icon: 'users', title: 'No users found', description: 'Try a different search or filter.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="users-table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {items.map((u) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td data-label="User"><PersonCell name={u.name} email={u.email} image={u.profile_image} /></td>
                      <td data-label="Role"><RoleBadge role={u.role} />{u.role === 'user' && u.is_premium && <Badge tone="warning" className="ad-prem">Premium</Badge>}</td>
                      <td data-label="Status">{u.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="danger" dot>Blocked</Badge>}</td>
                      <td data-label="Joined">{formatDate(u.created_at)}</td>
                      <td className="cell-actions"><div className="actions">
                        <ActionBtn icon="eye" label={`View ${u.name}`} onClick={() => setDetail(u.id)} />
                        {u.role === 'user' && <ActionBtn icon="crown" label={`Premium for ${u.name}`} onClick={() => setPrem(u)} />}
                        <ActionBtn icon="shield" label={`Change role of ${u.name}`} disabled={self} onClick={() => { setRoleFor(u); setNewRole(u.role); }} />
                        {u.is_active
                          ? <ActionBtn icon="ban" label={`Block ${u.name}`} disabled={self} onClick={() => setBlock(u)} />
                          : <ActionBtn icon="unlock" label={`Unblock ${u.name}`} onClick={() => run(() => api.patch(`/admin/users/${u.id}`, { is_active: true }), `${u.name} unblocked`)} />}
                        <ActionBtn icon="trash" tone="danger" label={`Delete ${u.name}`} disabled={self} onClick={() => setDel(u)} />
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>

      {creating && <CreateUser onClose={() => setCreating(false)} onDone={res.reload} />}
      {prem && <PremiumModal user={prem} onClose={() => setPrem(null)} onDone={() => { res.reload(); prem._done?.(); }} />}
      {detail && <UserDetail id={detail} onClose={() => setDetail(null)} />}
      {roleFor && (
        <Modal title={`Change role · ${roleFor.name}`} size="sm" onClose={() => setRoleFor(null)}
          footer={<><Button variant="ghost" onClick={() => setRoleFor(null)}>Cancel</Button><Button loading={busy} onClick={async () => { if (await run(() => api.patch(`/admin/users/${roleFor.id}`, { role: newRole }), 'Role updated')) setRoleFor(null); }}>Save role</Button></>}>
          <Select label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)} options={ROLE_OPTS} />
        </Modal>
      )}
      <ConfirmDialog open={!!block} danger title="Block this user?" message={block && `${block.name} will be signed out and unable to log in. Their jobs (if any) are paused.`} confirmLabel="Block user" loading={busy}
        onCancel={() => setBlock(null)} onConfirm={async () => { if (await run(() => api.patch(`/admin/users/${block.id}`, { is_active: false }), `${block.name} blocked`)) setBlock(null); }} />
      <ConfirmDialog open={!!del} danger title="Delete user permanently?" message={del && `This removes ${del.name} and all their applications, resumes, jobs, videos and messages. This cannot be undone.`} confirmLabel="Delete user" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/users/${del.id}`), 'User deleted')) setDel(null); }} />
    </>
  );
}
