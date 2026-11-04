import { useState } from 'react';
import { api } from '../../../lib/api';
import { Button, Card, Input, PageHeader, Select, Textarea } from '../../../components/ui';
import { useDo } from '../common';

export default function Broadcast() {
  const [f, setF] = useState({ title: '', message: '', audience: 'all' });
  const [err, setErr] = useState({});
  const [run, busy] = useDo();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.title.trim().length < 2) er.title = 'Enter a title.';
    if (f.message.trim().length < 2) er.message = 'Enter a message.';
    setErr(er);
    if (Object.keys(er).length) return;
    const ok = await run(() => api.post('/admin/notifications', { title: f.title.trim(), message: f.message.trim(), audience: f.audience }), (r) => r.message);
    if (ok) setF({ title: '', message: '', audience: f.audience });
  };
  return (
    <>
      <PageHeader title="Broadcast" description="Send an in-app notification to a group of users." />
      <Card className="ad-narrow">
        <form className="stack" onSubmit={send} noValidate>
          <Select label="Audience" value={f.audience} onChange={set('audience')} options={[{ value: 'all', label: 'Everyone' }, { value: 'user', label: 'Candidates only' }, { value: 'recruiter', label: 'Recruiters only' }]} />
          <Input label="Title" value={f.title} onChange={set('title')} error={err.title} maxLength={150} />
          <Textarea label="Message" value={f.message} onChange={set('message')} error={err.message} maxLength={1000} rows={5} />
          <div><Button type="submit" icon="send" loading={busy}>Send notification</Button></div>
        </form>
      </Card>
    </>
  );
}
