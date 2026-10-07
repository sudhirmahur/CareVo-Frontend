export const APP_NAME = 'Carevo';
export const APP_TAGLINE = 'Your Skills. Your Opportunities.';

// Roles are assigned by the backend and read from the authenticated user.
export const ROLES = Object.freeze({
  USER: 'user',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
});

export const ROLE_HOME = Object.freeze({
  [ROLES.USER]: '/dashboard',
  [ROLES.RECRUITER]: '/recruiter/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
});

export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'carevo.access_token',
  THEME: 'carevo.theme',
});

export const AUTH_EVENTS = Object.freeze({
  UNAUTHORIZED: 'carevo:unauthorized',
});

// HTTP statuses that mean "this backend module does not exist yet".
export const NOT_AVAILABLE_STATUSES = [404, 405, 501];

export const APPLICATION_STATUS = Object.freeze({
  applied: { label: 'Applied', tone: 'info' },
  shortlisted: { label: 'Shortlisted', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
  accepted: { label: 'Accepted', tone: 'success' },
});

export const INTERVIEW_STATUS = Object.freeze({
  scheduled: { label: 'Scheduled', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  rescheduled: { label: 'Rescheduled', tone: 'warning' },
});

export const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'remote', label: 'Remote' },
];

export const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const REPORT_CONTENT_TYPES = [
  { value: 'job', label: 'Job' },
  { value: 'user', label: 'User' },
  { value: 'video', label: 'Video' },
  { value: 'comment', label: 'Comment' },
];

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'fake', label: 'Fake or scam' },
  { value: 'other', label: 'Something else' },
];

export const RESUME_ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];
export const RESUME_MAX_SIZE_MB = 5;

export const PAGE_SIZE = 12;
