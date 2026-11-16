import { API_BASE, buildQuery, tokenStore } from '../../lib/api';
export const shortDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
};
export const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export const inr = (n, cur = 'INR') => {
  const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[cur] || `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 })}`;
};

/** Authenticated download (CSV / PDF) -> browser save. */
export async function downloadFile(path, filename, params = {}) {
  const res = await fetch(`${API_BASE}${path}${buildQuery(params)}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
  if (!res.ok) {
    let msg = 'Download failed';
    try { msg = (await res.json()).detail || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export const STAGE_OPTIONS = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));
export const REC_LABEL = { strong_yes: 'Strong yes', yes: 'Yes', no: 'No', strong_no: 'Strong no' };
export const REC_TONE = { strong_yes: 'success', yes: 'success', no: 'danger', strong_no: 'danger' };
export const CRITERIA = [['technical', 'Technical'], ['communication', 'Communication'], ['problem_solving', 'Problem solving'], ['culture_fit', 'Culture fit'], ['experience', 'Experience']];
