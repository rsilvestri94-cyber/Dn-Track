import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const uid = useRef(0);

  const toast = useCallback((msg, type) => {
    const id = ++uid.current;
    setToasts((t) => [...t, { id, msg, type: type || '' }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3.5 z-300 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop rounded-field border bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-text shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${
              t.type === 'ok' ? 'border-ok/50' : t.type === 'err' ? 'border-err/50' : 'border-border'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve essere usato dentro ToastProvider');
  return ctx;
}
