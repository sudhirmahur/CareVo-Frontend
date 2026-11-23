import { useId, useRef, useState } from 'react';
import { assetUrl, errorMessage, uploadMedia } from '../../lib/api';
import { useToast } from '../../lib/toast';
import Icon from '../Icon';
import { Button } from '../ui';

const ACCEPT = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/quicktime,video/webm',
  audio: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac',
  any: 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac',
};
const MAX_MB = { image: 8, video: 50, audio: 15 };

export function kindOf(file) {
  const t = (file.type || '').split('/')[0];
  return t === 'image' || t === 'video' || t === 'audio' ? t : 'image';
}

/**
 * Upload one file to the backend (Cloudinary when configured). Calls onChange(url, meta) on success.
 * `kind` limits the file picker: image | video | audio | any.
 */
export default function MediaUpload({ purpose, kind = 'image', value, onChange, label = 'Upload', hint, preview = true, className = '', round = false, size = 72 }) {
  const toast = useToast();
  const id = useId();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pct, setPct] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const k = kindOf(file);
    const allowed = kind === 'any' ? ['image', 'video', 'audio'] : [kind];
    if (!allowed.includes(k)) return setError(`Please choose ${kind === 'any' ? 'an image, video or audio' : `a ${kind}`} file.`);
    if (file.size > MAX_MB[k] * 1024 * 1024) return setError(`${k[0].toUpperCase()}${k.slice(1)} must be ${MAX_MB[k]} MB or smaller.`);
    setError('');
    setBusy(true);
    try {
      setPct(null);
      const res = await uploadMedia(file, purpose, { onProgress: setPct });
      onChange(res.url, res);
    } catch (err) {
      const m = errorMessage(err);
      setError(m);
      toast.error(m);
    } finally {
      setBusy(false);
      setPct(null);
    }
  };

  const showImg = preview && value && kind === 'image';
  return (
    <div className={`media-up ${className}`}>
      <div className="media-up-row">
        {showImg && <img className={`media-up-prev ${round ? 'round' : ''}`} src={assetUrl(value)} alt="" style={{ width: size, height: size }} />}
        {preview && value && kind === 'video' && <video className="media-up-vid" src={assetUrl(value)} muted preload="metadata" />}
        {preview && value && kind === 'audio' && <audio src={assetUrl(value)} controls preload="none" />}
        <div className="media-up-actions">
          <input ref={input} id={id} type="file" className="sr-only" accept={ACCEPT[kind]} onChange={pick} disabled={busy} />
          <Button type="button" size="sm" variant="secondary" icon="upload" loading={busy} onClick={() => input.current?.click()}>{busy && pct != null ? `Uploading ${pct}%` : value ? 'Replace' : label}</Button>
          {value && <Button type="button" size="sm" variant="ghost" icon="x" onClick={() => onChange('', null)} aria-label="Remove file">Remove</Button>}
        </div>
      </div>
      {busy && pct != null && <div className="up-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert"><Icon name="alert" size={13} /> {error}</p>}
    </div>
  );
}
