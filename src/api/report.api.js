import { http, unwrap } from './axios';
import { compact } from '../utils/helpers';

// Planned backend module.
export const reportApi = {
  create: ({ contentType, contentId, reason, description }) =>
    http
      .post('/reports', compact({ content_type: contentType, content_id: contentId, reason, description }))
      .then(unwrap),
};
