import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Modal, Textarea } from '../ui';

export default function ReportModal({ open, onClose, contentType, contentId, label }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (reason.trim().length < 3) return setError('Please describe the problem (at least 3 characters).');
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/reports', { content_type: contentType, content_id: contentId, reason: reason.trim() });
      toast.success(r.message || 'Report submitted.');
      setReason('');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Report ${label || contentType}`} description="Tell our team what is wrong. Reports are reviewed by an admin."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={submit}>Submit report</Button></>}>
      {error && <p className="form-error" role="alert" style={{ marginBottom: 10 }}>{error}</p>}
      <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fake job, asks for money, offensive content…" maxLength={1000} />
    </Modal>
  );
}
