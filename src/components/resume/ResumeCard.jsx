import { Download, FileText, Star, Trash2 } from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/helpers';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';

/** `resume` is a normalized resume (see utils/normalizers.js). */
export default function ResumeCard({ resume, onSetDefault, onDelete, settingDefault = false }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <FileText className="h-6 w-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold">{resume.name}</p>
          {resume.isDefault && (
            <Badge tone="success" icon={Star}>
              Default resume
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Uploaded {formatDate(resume.uploadedAt)}
          {resume.size ? ` · ${formatBytes(resume.size)}` : ''}
        </p>
        <p className="mt-1 text-sm text-muted">
          AI score:{' '}
          {resume.aiScore !== null ? (
            <span className="font-semibold text-fg">{resume.aiScore}/100</span>
          ) : (
            <span>Not analysed yet</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {resume.url && (
          <Button as="a" href={resume.url} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" leftIcon={Download}>
            View
          </Button>
        )}
        {!resume.isDefault && (
          <Button variant="outline" size="sm" leftIcon={Star} loading={settingDefault} onClick={() => onSetDefault(resume)}>
            Make default
          </Button>
        )}
        <Button variant="danger" size="sm" leftIcon={Trash2} onClick={() => onDelete(resume)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
