import { http, unwrap } from './axios';

// Planned backend module.
export const notificationApi = {
  list: () => http.get('/notifications').then(unwrap),
  markRead: (notificationId) => http.patch(`/notifications/${notificationId}/read`).then(unwrap),
  markAllRead: () => http.patch('/notifications/read-all').then(unwrap),
};
