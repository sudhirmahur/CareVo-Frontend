import { NOT_AVAILABLE_STATUSES } from '../utils/constants';

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, isNetwork = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.isNetwork = isNetwork;
  }
}

const DEFAULT_MESSAGES = {
  400: 'The request could not be processed. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: 'We could not find what you were looking for.',
  409: 'This conflicts with existing data.',
  422: 'Please check the highlighted fields and try again.',
  500: 'Something went wrong on our side. Please try again shortly.',
};

/** FastAPI 422 -> { fieldName: 'message' } */
const parseValidationDetail = (detail) => {
  const fieldErrors = {};
  const messages = [];
  detail.forEach((item) => {
    const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== 'body' && p !== 'query').join('.') : '';
    const msg = item.msg || 'Invalid value';
    if (field) fieldErrors[field] = msg;
    messages.push(field ? `${field}: ${msg}` : msg);
  });
  return { fieldErrors, message: messages.join('. ') };
};

export const normalizeApiError = (error) => {
  if (error instanceof ApiError) return error;

  if (!error.response) {
    return new ApiError('Unable to reach the Carevo server. Check your connection and try again.', {
      isNetwork: true,
    });
  }

  const { status, data } = error.response;
  const detail = data?.detail ?? data?.message;

  // Never surface server internals for 5xx responses.
  if (status >= 500) return new ApiError(DEFAULT_MESSAGES[500], { status });

  if (status === 422 && Array.isArray(detail)) {
    const { fieldErrors, message } = parseValidationDetail(detail);
    return new ApiError(message || DEFAULT_MESSAGES[422], { status, fieldErrors });
  }

  if (typeof detail === 'string' && detail.trim()) return new ApiError(detail, { status });

  return new ApiError(DEFAULT_MESSAGES[status] || 'Unexpected error. Please try again.', { status });
};

export const getErrorMessage = (error, fallback = 'Something went wrong') => error?.message || fallback;

/** True when a backend module is planned but not implemented yet. */
export const isNotAvailable = (error) => NOT_AVAILABLE_STATUSES.includes(error?.status);
