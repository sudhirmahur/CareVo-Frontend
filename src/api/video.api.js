import { http, unwrap } from './axios';

// Feed + detail are the first video endpoints; interactions are planned.
export const videoApi = {
  feed: (params = {}) => http.get('/videos/feed', { params }).then(unwrap),
  get: (videoId) => http.get(`/videos/${videoId}`).then(unwrap),

  // ---- Planned ----
  like: (videoId) => http.post(`/videos/${videoId}/like`).then(unwrap),
  unlike: (videoId) => http.delete(`/videos/${videoId}/like`).then(unwrap),
  listComments: (videoId) => http.get(`/videos/${videoId}/comments`).then(unwrap),
  addComment: (videoId, text) => http.post(`/videos/${videoId}/comments`, { text }).then(unwrap),
  save: (videoId) => http.post(`/videos/${videoId}/save`).then(unwrap),
  unsave: (videoId) => http.delete(`/videos/${videoId}/save`).then(unwrap),
  // TODO: follow creator/company endpoints once the backend defines them.
};
