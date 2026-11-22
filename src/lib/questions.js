// Pure helpers for the application-question form (shared by the Apply form and the recruiter preview).
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim());

/** Client-side check that mirrors the server rules. Returns {questionId: message}. */
export function validateAnswers(questions, answers) {
  const out = {};
  (questions || []).forEach((q) => {
    const v = answers[q.id];
    if (isEmpty(v)) { if (q.required !== false) out[q.id] = 'This question is required'; return; }
    if (q.type === 'number' && (Number.isNaN(Number(v)) || !Number.isFinite(Number(v)))) out[q.id] = 'Enter a valid number';
    else if (q.type === 'email' && !EMAIL.test(String(v).trim())) out[q.id] = 'Enter a valid e-mail address';
  });
  return out;
}

/** Answers ready for the API: drops empty values. */
export function cleanAnswers(answers) {
  return Object.fromEntries(Object.entries(answers).filter(([, v]) => !isEmpty(v)));
}

