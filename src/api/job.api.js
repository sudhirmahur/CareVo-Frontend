import { http, unwrap } from './axios';
import { compact } from '../utils/helpers';

export const jobApi = {
  list: (filters = {}) => http.get('/jobs', { params: compact(filters) }).then(unwrap),
  get: (jobId) => http.get(`/jobs/${jobId}`).then(unwrap),

  // ---- Saved jobs (backend planned) ----
  save: (jobId) => http.post(`/jobs/${jobId}/save`).then(unwrap),
  unsave: (jobId) => http.delete(`/jobs/${jobId}/save`).then(unwrap),
  listSaved: () => http.get('/users/me/saved-jobs').then(unwrap),
};
