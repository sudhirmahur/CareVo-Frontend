import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { RESUME_ACCEPTED_EXTENSIONS, RESUME_MAX_SIZE_MB } from '../../utils/constants';
import { validateResumeFile } from '../../utils/validators';

/** Drag-and-drop + click-to-browse. Validates type/size before calling `onUpload(file)`. */
export default function ResumeUploader({ onUpload, uploading = false, progress = 0 }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    const message = validateResumeFile(file);
    setError(message);
    if (!message) onUpload(file);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        aria-disabled={uploading}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && !uploading && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!uploading) handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50 hover:bg-surface-2/50',
          uploading && 'cursor-progress opacity-80',
        )}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <UploadCloud className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm font-medium">{uploading ? `Uploading… ${progress}%` : 'Click to upload or drag and drop'}</p>
        <p className="mt-1 text-xs text-muted">
          {RESUME_ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ')} · up to {RESUME_MAX_SIZE_MB} MB
        </p>
        {uploading && (
          <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
