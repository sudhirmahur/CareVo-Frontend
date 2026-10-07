import { http, unwrap } from './axios';
import { compact } from '../utils/helpers';

export const skillApi = {
  /** Catalogue of all skills. `search` is forwarded as a query param. */
  list: (params = {}) => http.get('/skills', { params: compact(params) }).then(unwrap),
  listMine: () => http.get('/users/me/skills').then(unwrap),
  add: ({ skillId, proficiency }) =>
    http.post('/users/me/skills', { skill_id: skillId, proficiency }).then(unwrap),
  remove: (skillId) => http.delete(`/users/me/skills/${skillId}`).then(unwrap),
};
