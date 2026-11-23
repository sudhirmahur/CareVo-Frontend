// Browser -> Cloudinary video upload with progress. Pure: every outside effect is injected, so it is unit-testable.
//   getTicket()  -> { direct, upload_url, fields } | { direct: false }
//   complete(url)-> registers the finished file with our API
//   send(url, formData, onProgress) -> Promise<{ secure_url }>   (a real XMLHttpRequest in the app)
export async function directUpload({ file, getTicket, complete, send, onProgress }) {
  const ticket = await getTicket();
  if (!ticket || !ticket.direct) return null; // caller falls back to the normal upload through our API
  const form = new FormData();
  Object.entries(ticket.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file); // the file must come last
  const res = await send(ticket.upload_url, form, onProgress);
  if (!res || !/^https:\/\//.test(res.secure_url || '')) throw new Error('The video host returned an unexpected answer. Please try again.');
  return complete(res.secure_url);
}

export function xhrSend(url, form, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      let body = {};
      try { body = JSON.parse(x.responseText || '{}'); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300) resolve(body);
      else reject(new Error(body?.error?.message || `Upload failed (${x.status}). Please try again.`));
    };
    x.onerror = () => reject(new Error('Network problem while uploading. Check your connection and try again.'));
    x.ontimeout = () => reject(new Error('The upload took too long. Please try again.'));
    x.send(form);
  });
}
