/* Single fetch-based API client. Every network call in the UI goes through here. */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
export const API_BASE = RAW_BASE.replace(/\/+$/, '');
export const API_ORIGIN = API_BASE.replace(/\/api$/, '');

const TOKEN_KEY = 'carevo_token';

export const tokenStore = {
  get() {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) || memoryToken;
    } catch {
      return memoryToken;
    }
  },
  /** remember=true keeps the session across browser restarts (localStorage); false = until the tab closes. */
  set(token, remember = true) {
    memoryToken = token;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked - keep in memory */
    }
  },
  /** Replace the token in whichever storage currently holds it (e.g. after a password change). */
  refresh(token) {
    let inSession = false;
    try { inSession = Boolean(window.sessionStorage.getItem(TOKEN_KEY)); } catch { /* ignore */ }
    this.set(token, !inSession);
  },
  clear() {
    memoryToken = null;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
let memoryToken = null;

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

/** Turn FastAPI error bodies (string or list of validation errors) into one readable message. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err instanceof ApiError) return err.message || fallback;
  return err.message || fallback;
}

function detailToMessage(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === 'object' ? (d.msg ? d.msg : JSON.stringify(d)) : String(d)))
      .join('; ');
  }
  return String(detail);
}

export function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === false) return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request(method, path, { params, body, form, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form; // browser sets multipart boundary
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(params)}`, { method, headers, body: payload, signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const message = detailToMessage(data && data.detail) || `Request failed (${res.status})`;
    const blocked = res.status === 403 && /blocked|inactive/i.test(message);
    if (auth && token && (res.status === 401 || blocked) && onUnauthorized) onUnauthorized(message);
    throw new ApiError(message, res.status, data);
  }
  return data;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body, opts) => request('POST', path, { body: body ?? {}, ...opts }),
  put: (path, body, opts) => request('PUT', path, { body: body ?? {}, ...opts }),
  patch: (path, body, opts) => request('PATCH', path, { body: body ?? {}, ...opts }),
  delete: (path, opts) => request('DELETE', path, opts),
  upload: (path, file, field = 'file') => {
    const form = new FormData();
    form.append(field, file);
    return request('POST', path, { form });
  },
};

/**
 * Uploaded files live on the API origin (/uploads/...). Other root-relative paths (/landing/..., /logo.png)
 * are static files of the frontend itself and stay on the page origin.
 */
export function assetUrl(url) {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  if (url.startsWith('/')) return url;
  return `${API_ORIGIN}/${url}`;
}

/** Upload an image / audio / video through the backend (Cloudinary when configured, local disk otherwise). */
export function uploadMedia(file, purpose) {
  const form = new FormData();
  form.append('file', file);
  form.append('purpose', purpose);
  return request('POST', '/media/upload', { form });
}

/** Only allow http(s)/mailto/tel/relative links coming from user or admin supplied data. */
export function safeHref(url) {
  const v = String(url || '').trim();
  if (!v) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
  if ((v.startsWith('/') && !v.startsWith('//')) || v.startsWith('#')) return v;
  return '';
}

/** Resumes are private: ask the API for a short-lived signed link, then open it. */
export async function openResume(resumeId) {
  const w = window.open('', '_blank'); // opened synchronously so popup blockers allow it
  try {
    if (w) w.opener = null;
    const { url } = await request('GET', `/resumes/${resumeId}/link`);
    const full = `${API_ORIGIN}${url}`;
    if (w) w.location.href = full;
    else window.location.href = full;
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}
