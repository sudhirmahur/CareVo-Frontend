import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => setItems((cur) => cur.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (type, message, ms = 4200) => {
      idRef.current += 1;
      const id = idRef.current;
      setItems((cur) => [...cur.slice(-3), { id, type, message }]);
      if (ms) setTimeout(() => remove(id), ms);
    },
    [remove],
  );

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m, 6000),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'alert' : 'info'} size={18} />
            <span>{t.message}</span>
            <button type="button" className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
