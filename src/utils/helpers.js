export const cn = (...parts) => parts.filter(Boolean).join(' ');

/** MongoDB documents may expose `_id` or `id`. */
export const getId = (item) => item?.id ?? item?._id ?? null;

/** FastAPI list endpoints may return an array or a paginated envelope. */
export const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidate = data.items ?? data.results ?? data.data ?? data.jobs ?? data.applications;
  return Array.isArray(candidate) ? candidate : [];
};

export const getTotal = (data, fallback = 0) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const total = data.total ?? data.count ?? data.total_count;
    if (typeof total === 'number') return total;
  }
  return fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
};

export const formatTime = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';
};

export const timeAgo = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const units = [
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.345, 'w'],
    [12, 'mo'],
  ];
  let amount = seconds / 60;
  for (let i = 0; i < units.length; i += 1) {
    const [limit, label] = units[i];
    if (amount < limit || i === units.length - 1) return `${Math.floor(amount)}${label} ago`;
    amount /= limit;
  }
  return formatDate(value);
};

export const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'C';

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatSalary = ({ min, max, currency, text } = {}) => {
  if (text) return text;
  const fmt = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const prefix = currency ? `${currency} ` : '';
  if (min && max) return `${prefix}${fmt(min)} – ${fmt(max)}`;
  if (min) return `${prefix}${fmt(min)}+`;
  if (max) return `Up to ${prefix}${fmt(max)}`;
  return null;
};

/** Removes empty values so we never send blank query params / payload fields. */
export const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length)),
  );

export const toTitleCase = (value = '') =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const PROFILE_FIELDS = ['bio', 'experience', 'current_position', 'location', 'github', 'linkedin', 'portfolio'];

/**
 * Profile completion is derived only from real data we hold:
 * profile fields + phone + skills + at least one resume.
 */
export const calcProfileCompletion = ({ user, profile, skillsCount = 0, resumesCount = 0 }) => {
  const checks = [
    ...PROFILE_FIELDS.map((key) => Boolean(profile?.[key])),
    Boolean(user?.phone),
    Boolean(user?.profile_image),
    skillsCount > 0,
    resumesCount > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};
