import { http, unwrap } from './axios';

// Planned backend module. REST for history; a WebSocket transport can later be
// added in src/api/socket.js without changing the components that use this file.
export const messageApi = {
  listConversations: () => http.get('/messages').then(unwrap),
  getThread: (userId) => http.get(`/messages/${userId}`).then(unwrap),
  send: ({ recipientId, text }) => http.post('/messages', { recipient_id: recipientId, text }).then(unwrap),
};
