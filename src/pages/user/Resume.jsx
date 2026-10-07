import { useCallback, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { resumeApi } from '../../api/resume.api';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import ResumeCard from '../../components/resume/ResumeCard';
import ResumeUploader from '../../components/resume/ResumeUploader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useApi from '../../hooks/useApi';
import useToast from '../../hooks/useToast';
import { unwrapList } from '../../utils/helpers';
import { normalizeResume } from '../../utils/normalizers';

export default function Resume() {
  const toast = useToast();
  const request = useCallback(() => resumeApi.list(), []);
  const { data, loading, error, reload } = useApi(request);
  const resumes = useMemo(() => unwrapList(data).map(normalizeResume), [data]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [defaultingId, setDefaultingId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async (file) => {
    setUploading(true);
    setProgress(0);
    try {
      await resumeApi.upload(file, { onProgress: setProgress });
      toast.success('Resume uploaded');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (resume) => {
    setDefaultingId(resume.id);
    try {
      await resumeApi.setDefault(resume.id);
      toast.success(`${resume.name} is now your default resume`);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDefaultingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await resumeApi.remove(toDelete.id);
      toast.success('Resume deleted');
      setToDelete(null);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Resume" description="Upload your resumes and choose which one to apply with by default." />
      <div className="space-y-6">
        <ResumeUploader onUpload={handleUpload} uploading={uploading} progress={progress} />

        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={resumes.length === 0}
          empty={{ icon: FileText, title: 'No resumes yet', description: 'Upload a PDF, DOC or DOCX to start applying to jobs.' }}
        >
          <div className="grid gap-4">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                settingDefault={defaultingId === resume.id}
                onSetDefault={handleSetDefault}
                onDelete={setToDelete}
              />
            ))}
          </div>
        </DataState>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete resume?"
        message={`"${toDelete?.name ?? ''}" will be permanently removed. Applications you already sent are not affected.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
