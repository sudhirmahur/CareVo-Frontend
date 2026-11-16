import { API_BASE, API_ORIGIN, tokenStore } from '../../../lib/api';

/** Fetch an authenticated binary endpoint and save it (used for offer PDFs). */
export async function downloadAuthed(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
  if (!res.ok) throw new Error('Download failed. Please try again.');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Signed API link (relative, from the backend) -> absolute URL. */
export const signedUrl = (rel) => `${API_ORIGIN}${rel}`;

export const DOC_EXT = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
export const MAX_DOC_MB = 8;
/** Mirrors the backend rules so people get feedback before uploading. */
export function checkDocFile(file) {
  if (!file) return 'Choose a file';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!DOC_EXT.includes(ext)) return 'Allowed files: PDF, DOC, DOCX, PNG, JPG';
  if (file.size === 0) return 'The file is empty';
  if (file.size > MAX_DOC_MB * 1024 * 1024) return `File is too large (max ${MAX_DOC_MB} MB)`;
  return '';
}
