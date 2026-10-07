import { RESUME_ACCEPTED_EXTENSIONS, RESUME_MAX_SIZE_MB } from './constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

export const rules = {
  name: { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } },
  email: {
    required: 'Email is required',
    pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
  },
  password: {
    required: 'Password is required',
    minLength: { value: 6, message: 'Password must be at least 6 characters' },
  },
  optionalUrl: {
    validate: (value) => !value || URL_PATTERN.test(value) || 'Enter a valid URL',
  },
};

export const matchesField = (getValues, field, message = 'Passwords do not match') => ({
  required: 'Please confirm your password',
  validate: (value) => value === getValues(field) || message,
});

/** Returns an error message or null. */
export const validateResumeFile = (file) => {
  if (!file) return 'Choose a file to upload';
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!RESUME_ACCEPTED_EXTENSIONS.includes(extension)) return 'Only PDF, DOC and DOCX files are supported';
  if (file.size > RESUME_MAX_SIZE_MB * 1024 * 1024) return `File must be smaller than ${RESUME_MAX_SIZE_MB} MB`;
  return null;
};
