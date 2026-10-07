import { http, unwrap } from './axios';
import { compact } from '../utils/helpers';

// Status is owned by recruiters/backend. The job seeker can only read it.
export const applicationApi = {
  apply: (jobId, payload = {}) => http.post(`/jobs/${jobId}/apply`, compact(payload)).then(unwrap),
  list: (params = {}) => http.get('/applications', { params: compact(params) }).then(unwrap),
  get: (applicationId) => http.get(`/applications/${applicationId}`).then(unwrap),
};
