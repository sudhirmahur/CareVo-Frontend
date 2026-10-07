import { http, unwrap } from './axios';

// Planned backend module.
export const interviewApi = {
  list: () => http.get('/interviews').then(unwrap),
  get: (interviewId) => http.get(`/interviews/${interviewId}`).then(unwrap),
};
