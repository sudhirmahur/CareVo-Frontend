import { http, unwrap } from './axios';

export const userApi = {
  getMe: () => http.get('/users/me').then(unwrap),
  updateMe: (payload) => http.put('/users/me', payload).then(unwrap),

  // Planned: GET /users/me/saved-jobs lives in job.api.js (saved jobs module).
};
