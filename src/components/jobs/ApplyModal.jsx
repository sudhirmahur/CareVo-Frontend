import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationApi } from '../../api/application.api';
import { getErrorMessage } from '../../api/errors';
import { resumeApi } from '../../api/resume.api';
import useApi from '../../hooks/useApi';
import useToast from '../../hooks/useToast';
import { unwrapList } from '../../utils/helpers';
import { normalizeResume } from '../../utils/normalizers';
import Button from '../ui/Button';
import Loader from '../ui/Loader';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

/** Mount this only while applying (`{job && <ApplyModal job={job} ... />}`) so resumes load on open. */
export default function ApplyModal({ job, onClose, onApplied }) {
  const toast = useToast();
  const request = useCallback(() => resumeApi.list(), []);
  const { data, loading, error } = useApi(request);
  const resumes = useMemo(() => unwrapList(data).map(normalizeResume), [data]);

  const [resumeId, setResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!resumeId && resumes.length) setResumeId((resumes.find((r) => r.isDefault) ?? resumes[0]).id);
  }, [resumes, resumeId]);

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await applicationApi.apply(job.id, { resume_id: resumeId, cover_letter: coverLetter.trim() });
      toast.success(`Application sent to ${job.companyName || 'the employer'}.`);
      onApplied?.(job);
      onClose();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const noResume = !loading && !error && resumes.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Apply to ${job.title}`}
      description={job.companyName}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={loading || noResume || !resumeId}>
            Submit application
          </Button>
        </>
      }
    >
      {loading && (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      )}
      {error && <p className="text-sm text-danger">{getErrorMessage(error)}</p>}
      {noResume && (
        <p className="text-sm text-muted">
          You need a resume to apply.{' '}
          <Link to="/resume" className="font-medium text-brand hover:underline">
            Upload one first
          </Link>
          .
        </p>
      )}
      {resumes.length > 0 && (
        <div className="space-y-4">
          <Select
            label="Resume"
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
            options={resumes.map((resume) => ({ value: resume.id, label: resume.isDefault ? `${resume.name} (default)` : resume.name }))}
          />
          <Textarea
            label="Cover letter (optional)"
            rows={5}
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            placeholder="Tell the recruiter why you are a great fit."
          />
          {submitError && (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
