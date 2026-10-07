import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ui/Toast';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message, duration = 4500) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list, { id, tone, message }]);
      if (duration) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('danger', message, 6500),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
