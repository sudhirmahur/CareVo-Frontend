import { http, unwrap } from './axios';

export const profileApi = {
  get: () => http.get('/users/me/profile').then(unwrap),
  update: (payload) => http.put('/users/me/profile', payload).then(unwrap),
};
