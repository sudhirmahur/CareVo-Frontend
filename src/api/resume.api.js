import { http, unwrap } from './axios';

export const resumeApi = {
  /** Multipart upload. The backend field name is `file`. */
  upload: (file, { name, onProgress } = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return http
      .post('/resumes/', form, {
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
        },
      })
      .then(unwrap);
  },
  list: () => http.get('/resumes/').then(unwrap),
  get: (resumeId) => http.get(`/resumes/${resumeId}`).then(unwrap),
  remove: (resumeId) => http.delete(`/resumes/${resumeId}`).then(unwrap),
  setDefault: (resumeId) => http.patch(`/resumes/${resumeId}/default`).then(unwrap),

  // TODO: AI resume analysis - POST /resumes/{id}/analyze (backend not available yet)
};
