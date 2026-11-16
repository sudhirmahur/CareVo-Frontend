import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Switch, Tabs } from '../../../components/ui';
import { ListShell, useDo, usePagedList } from '../common';

function Matrix({ modules, actions, value, onChange, readOnly }) {
  return (
    <div className="table-wrap"><table className="table" data-testid="perm-matrix">
      <thead><tr><th>Module</th>{actions.map((a) => <th key={a}>{a}</th>)}</tr></thead>
      <tbody>{Object.entries(modules).map(([m, label]) => (
        <tr key={m}><td>{label}</td>{actions.map((a) => (
          <td key={a}><input type="checkbox" aria-label={`${label} ${a}`} disabled={readOnly} checked={!!value?.[m]?.[a]} onChange={(e) => onChange({ ...value, [m]: { ...(value?.[m] || {}), [a]: e.target.checked } })} /></td>
        ))}</tr>))}</tbody>
    </table></div>
  );
}

function RoleModal({ role, meta, onClose, onDone }) {
  const [f, setF] = useState({ key: role?.key || '', name: role?.name || '', description: role?.description || '', permissions: role?.permissions || {} });
  const [run, busy] = useDo(onDone);
  const [err, setErr] = useState('');
  const save = async () => {
    if (f.name.trim().length < 2) return setErr('Give the role a name.');
    if (!role && !/^[a-z][a-z0-9_]{1,39}$/.test(f.key)) return setErr('Key: lowercase letters, numbers and underscores, starting with a letter.');
    setErr('');
    const ok = await run(() => (role ? api.put(`/admin/roles/${role.key}`, { name: f.name.trim(), description: f.description, permissions: f.permissions }) : api.post('/admin/roles', { key: f.key, name: f.name.trim(), description: f.description, permissions: f.permissions })), 'Role saved');
    if (ok) onClose();
  };
  return (
    <Modal open size="lg" title={role ? `Edit role: ${role.name}` : 'New role'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save role</Button></>}>
      <div className="stack">
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="grid grid-2">{!role && <Input label="Key" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} hint="e.g. finance_manager" />}<Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <Input label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Matrix modules={meta.modules} actions={meta.actions} value={f.permissions} onChange={(permissions) => setF({ ...f, permissions })} />
      </div>
    </Modal>
  );
}

function AdminModal({ roles, onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '', password: '', admin_role: 'admin' });
  const [run, busy] = useDo(onDone);
  const [err, setErr] = useState('');
  const save = async () => {
    if (f.name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) || f.password.length < 8) return setErr('Enter a name, a valid email and a password of at least 8 characters.');
    setErr('');
    if (await run(() => api.post('/admin/admins', { ...f, name: f.name.trim() }), 'Administrator created')) onClose();
  };
  return (
    <Modal open size="sm" title="New administrator" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Create</Button></>}>
      <div className="stack">
        {err && <p className="form-error" role="alert">{err}</p>}
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input label="Temporary password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Select label="Role" value={f.admin_role} onChange={(e) => setF({ ...f, admin_role: e.target.value })} options={roles.map((r) => ({ value: r.key, label: r.name }))} />
      </div>
    </Modal>
  );
}

export default function Roles() {
  const [tab, setTab] = useState('roles');
  const roles = useAsync(() => api.get('/admin/roles'), []);
  const admins = useAsync(() => api.get('/admin/admins'), []);
  const history = usePagedList('/admin/roles/history');
  const [run] = useDo(() => { roles.reload(); admins.reload(); });
  const [edit, setEdit] = useState(null);
  const [newAdmin, setNewAdmin] = useState(false);
  const [del, setDel] = useState(null);
  const list = roles.data?.items || [];
  return (
    <>
      <PageHeader title="Roles & administrators" description="Control what each admin can read, create, update and delete." actions={tab === 'roles' ? <Button icon="plus" onClick={() => setEdit({})}>New role</Button> : tab === 'admins' ? <Button icon="plus" onClick={() => setNewAdmin(true)}>New administrator</Button> : null} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'roles', label: 'Roles' }, { value: 'admins', label: 'Administrators' }, { value: 'history', label: 'Permission history' }]} />
      {tab === 'roles' && (
        <DataState loading={roles.loading} error={roles.error} onRetry={roles.reload} hasData={!!roles.data}>
          <div className="grid grid-2" data-testid="roles-list">{list.map((r) => (
            <Card key={r.key} title={r.name} subtitle={r.description} actions={r.system && <Badge>system</Badge>}>
              <p className="muted small">{r.admins} administrator(s)</p>
              <div className="row" style={{ gap: 6 }}><Button size="sm" variant="secondary" onClick={() => setEdit(r)}>Edit permissions</Button>{!r.system && <Button size="sm" variant="ghost" onClick={() => setDel(r)}>Delete</Button>}</div>
            </Card>))}</div>
        </DataState>
      )}
      {tab === 'admins' && (
        <DataState loading={admins.loading} error={admins.error} onRetry={admins.reload} hasData={!!admins.data}>
          <div className="table-wrap"><table className="table rtable" data-testid="admins-table">
            <thead><tr><th>Administrator</th><th>Role</th><th>Active</th></tr></thead>
            <tbody>{(admins.data?.items || []).map((a) => (
              <tr key={a.id}><td data-label="Administrator"><strong>{a.name}</strong><div className="muted small">{a.email}</div></td>
                <td data-label="Role"><Select aria-label={`Role of ${a.name}`} value={a.admin_role} onChange={(e) => run(() => api.patch(`/admin/admins/${a.id}`, { admin_role: e.target.value }), 'Role changed')} options={list.map((r) => ({ value: r.key, label: r.name }))} /></td>
                <td data-label="Active"><Switch checked={a.is_active} onChange={(v) => run(() => api.patch(`/admin/admins/${a.id}`, { is_active: v }), v ? 'Administrator activated' : 'Administrator deactivated')} label={a.is_active ? 'Active' : 'Inactive'} /></td></tr>))}</tbody>
          </table></div>
        </DataState>
      )}
      {tab === 'history' && (
        <ListShell res={history} empty={{ icon: 'shield', title: 'No changes yet', description: 'Role and permission changes are recorded here.' }}>
          {(items) => <div className="table-wrap"><table className="table rtable"><thead><tr><th>When</th><th>By</th><th>Change</th></tr></thead><tbody>{items.map((h) => <tr key={h.id}><td data-label="When">{formatDate(h.created_at, true)}</td><td data-label="By">{h.admin_email || "-"}</td><td data-label="Change">{h.action} {h.target} {h.detail}</td></tr>)}</tbody></table></div>}
        </ListShell>
      )}
      {edit && roles.data && <RoleModal role={edit.key ? edit : null} meta={roles.data} onClose={() => setEdit(null)} onDone={() => { roles.reload(); history.reload(); }} />}
      {newAdmin && <AdminModal roles={list} onClose={() => setNewAdmin(false)} onDone={admins.reload} />}
      <ConfirmDialog open={!!del} danger title="Delete role?" message={`Delete "${del?.name}"? Roles that still have administrators cannot be deleted.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const r = del; setDel(null); await run(() => api.delete(`/admin/roles/${r.key}`), 'Role deleted'); }} />
    </>
  );
}
