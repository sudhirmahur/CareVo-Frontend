export function formatDate(value, withTime = false) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('en-IN', opts);
}

export function timeAgo(value, now = Date.now()) {
  if (!value) return '';
  const diff = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (diff < 45) return 'just now';
  const units = [
    [60, 'min'],
    [3600, 'hr'],
    [86400, 'day'],
    [604800, 'wk'],
    [2592000, 'mo'],
  ];
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) {
    const n = Math.floor(diff / 86400);
    return `${n} day${n > 1 ? 's' : ''} ago`;
  }
  if (diff < 2592000) {
    const n = Math.floor(diff / 604800);
    return `${n} wk ago`;
  }
  void units;
  return formatDate(value);
}

export function compactNumber(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

function money(n) {
  const v = Number(n);
  if (v >= 10000000) return `${+(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `${+(v / 100000).toFixed(2)} LPA`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(v);
}

export function salaryRange(min, max) {
  if (min == null && max == null) return '';
  if (min != null && max != null) return `₹${money(min)} - ₹${money(max)}`;
  return min != null ? `From ₹${money(min)}` : `Up to ₹${money(max)}`;
}

export const JOB_TYPES = [
  { value: 'fulltime', label: 'Full-time' },
  { value: 'parttime', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
];

export function jobTypeLabel(v) {
  return (JOB_TYPES.find((t) => t.value === v) || { label: titleCase(v || '') }).label;
}

export function titleCase(s = '') {
  return String(s)
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Value for <input type="datetime-local"> from ISO string (local time). */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
export const isHttpUrl = (v) => /^https?:\/\/[^\s]+$/i.test(String(v || '').trim());

export const STATUS_TONE = {
  applied: 'info',
  shortlisted: 'warning',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
  pending: 'warning',
  approved: 'success',
  scheduled: 'info',
  completed: 'success',
  cancelled: 'neutral',
  resolved: 'success',
};

/** Where a notification link should go for each role (links from the API are user-panel paths). */
export function resolveLink(role, link) {
  if (!link) return null;
  if (link.startsWith('/admin') || link.startsWith('/recruiter')) return link;
  if (role === 'recruiter') return `/recruiter${link === '/applications' ? '/applications' : link}`;
  if (role === 'admin') return `/admin${link}`;
  return link;
}
