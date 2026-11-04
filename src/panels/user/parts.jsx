import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { jobTypeLabel, salaryRange, timeAgo } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { Link } from '../../lib/router';
import { useToast } from '../../lib/toast';
import Icon from '../../components/Icon';
import { Avatar, Badge, Button, Modal, Select, SkillChips, Spinner, Textarea } from '../../components/ui';

/* ---------------------------------------------------------------- apply */

/**
 * The key flow. External job (apply_url): open a blank tab synchronously (so popup blockers allow it),
 * record the application, then send that tab to the company's link. Internal job: open ApplyModal.
 */
export function useApply({ onApplied } = {}) {
  const toast = useToast();
  const [modalJob, setModalJob] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [blocked, setBlocked] = useState(null);

  const apply = useCallback(
    async (job) => {
      if (job.apply_type !== 'external') {
        setModalJob(job);
        return;
      }
      const w = window.open('', '_blank');
      if (w) {
        try { w.opener = null; } catch { /* ignore */ }
      }
      setBusyId(job.id);
      try {
        const res = await api.post(`/jobs/${job.id}/apply`, {});
        if (res.redirect_url) {
          if (w) w.location.href = res.redirect_url;
          else setBlocked({ url: res.redirect_url, job });
        } else if (w) w.close();
        toast.success(res.already_applied ? 'Already applied - reopening the company site' : 'Application recorded — continue on the company site');
        onApplied?.(job, res);
      } catch (e) {
        if (w) w.close();
        toast.error(errorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [toast, onApplied],
  );

  const node = (
    <>
      {modalJob && (
        <ApplyModal
          job={modalJob}
          onClose={() => setModalJob(null)}
          onDone={(res) => {
            onApplied?.(modalJob, res);
            setModalJob(null);
          }}
        />
      )}
      {blocked && (
        <Modal title="Continue on the company site" onClose={() => setBlocked(null)} size="sm"
          footer={<Button variant="ghost" onClick={() => setBlocked(null)}>Close</Button>}>
          <p>Your application was recorded. Your browser blocked the new tab, so open the company site here:</p>
          <p style={{ marginTop: 12 }}>
            <a className="btn btn-primary" href={blocked.url} target="_blank" rel="noopener noreferrer" onClick={() => setBlocked(null)}>
              <Icon name="external" size={16} /> Open company site
            </a>
          </p>
        </Modal>
      )}
    </>
  );
  return { apply, busyId, node };
}

export function ApplyModal({ job, onClose, onDone }) {
  const toast = useToast();
  const resumes = useAsync(() => api.get('/resumes'), []);
  const list = resumes.data || [];
  const [resumeId, setResumeId] = useState('');
  const [cover, setCover] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resumeId && list.length) setResumeId((list.find((r) => r.is_default) || list[0]).id);
  }, [list, resumeId]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/jobs/${job.id}/apply`, { resume_id: resumeId || undefined, cover_letter: cover.trim() || undefined });
      toast.success(res.already_applied ? 'You have already applied for this job' : 'Application submitted');
      onDone(res);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Apply to ${job.title}`} description={job.company_name} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit} disabled={resumes.loading || !resumeId}>Submit application</Button></>}>
      {resumes.loading && <div className="u-center"><Spinner /></div>}
      {resumes.error && <p className="form-error">{resumes.error}</p>}
      {!resumes.loading && !resumes.error && list.length === 0 && (
        <p className="muted">You need a resume to apply. <Link to="/resume">Upload one first</Link>.</p>
      )}
      {list.length > 0 && (
        <div className="stack">
          <Select label="Resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} options={list.map((r) => ({ value: r.id, label: r.is_default ? `${r.name} (default)` : r.name }))} />
          <Textarea label="Cover letter (optional)" value={cover} onChange={(e) => setCover(e.target.value)} maxLength={5000} placeholder="Tell the recruiter why you are a great fit." />
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------ job card */

export function ApplyControl({ job, onApply, busy, compact }) {
  if (job.has_applied) {
    return (
      <div className="u-applied">
        <Badge tone="success" dot>Applied</Badge>
        {job.apply_type === 'external' && (
          <Button size="sm" variant="secondary" icon="external" loading={busy} onClick={() => onApply(job)} aria-label={`Reopen company site for ${job.title}`}>
            {compact ? 'Reopen' : 'Open company site'}
          </Button>
        )}
        <Link to="/applications" className="u-link-sm">View in history</Link>
      </div>
    );
  }
  if (job.is_expired) return <Badge tone="neutral">Closed</Badge>;
  return (
    <Button size={compact ? 'sm' : 'md'} loading={busy} icon={job.apply_type === 'external' ? 'external' : 'send'} onClick={() => onApply(job)} aria-label={`Apply to ${job.title}`}>
      Apply
    </Button>
  );
}

export function JobCard({ job, onApply, onToggleSave, busy }) {
  const salary = salaryRange(job.salary_min, job.salary_max);
  return (
    <article className="u-job" data-testid="job-card">
      <div className="u-job-top">
        <Avatar name={job.company_name || job.title} src={job.company_logo} size={48} className="u-logo" />
        <div className="grow">
          <h3 className="u-job-title"><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
          <p className="muted truncate">{job.company_name || 'Company'}</p>
        </div>
        <button type="button" className={`u-heart ${job.is_saved ? 'on' : ''}`} onClick={() => onToggleSave(job)} aria-pressed={!!job.is_saved} aria-label={job.is_saved ? `Unsave ${job.title}` : `Save ${job.title}`}>
          <Icon name="bookmark" size={20} />
        </button>
      </div>
      <ul className="u-meta">
        {job.location && <li><Icon name="mapPin" size={14} /> {job.location}</li>}
        <li><Icon name="briefcase" size={14} /> {jobTypeLabel(job.job_type)}</li>
        {salary && <li><Icon name="dollar" size={14} /> {salary}</li>}
        {job.is_featured && <li className="u-feat"><Icon name="star" size={14} /> Featured</li>}
      </ul>
      <SkillChips skills={job.skills} max={4} />
      <div className="u-job-foot">
        <span className="muted small">
          {job.apply_type === 'external' ? <><Icon name="link" size={13} /> Apply on company site</> : <>Posted {timeAgo(job.created_at)}</>}
        </span>
        <ApplyControl job={job} onApply={onApply} busy={busy === job.id} compact />
      </div>
    </article>
  );
}

/** Patch helpers used by list pages. */
export function usePatchJobs(setData, key = 'items') {
  return useMemo(
    () => (id, patch) => setData((d) => (d ? { ...d, [key]: d[key].map((j) => (j.id === id ? { ...j, ...patch } : j)) } : d)),
    [setData, key],
  );
}

export function useSaveToggle(patch) {
  const toast = useToast();
  return useCallback(
    async (job) => {
      const next = !job.is_saved;
      patch(job.id, { is_saved: next });
      try {
        if (next) await api.post(`/jobs/${job.id}/save`);
        else await api.delete(`/jobs/${job.id}/save`);
        toast.success(next ? 'Job saved' : 'Removed from saved jobs');
      } catch (e) {
        patch(job.id, { is_saved: !next });
        toast.error(errorMessage(e));
      }
    },
    [patch, toast],
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="u-section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
