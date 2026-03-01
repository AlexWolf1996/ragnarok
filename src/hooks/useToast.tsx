'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const toastIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={18} className="text-[#4ade80]" />,
  error: <AlertCircle size={18} className="text-[#f87171]" />,
  warning: <AlertTriangle size={18} className="text-[#fbbf24]" />,
  info: <Info size={18} className="text-[#4fc3f7]" />,
};

const toastColors: Record<ToastType, string> = {
  success: 'border-[#4ade80]/30',
  error: 'border-[#f87171]/30',
  warning: 'border-[#fbbf24]/30',
  info: 'border-[#4fc3f7]/30',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        relative flex items-start gap-3 p-4
        bg-[#111118] border ${toastColors[toast.type]}
        rounded-sm shadow-lg max-w-sm w-full
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {toastIcons[toast.type]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-[#e8e8e8] tracking-wide">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-xs text-[#666670]">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 text-[#666670] hover:text-[#e8e8e8] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duration = toast.duration ?? 5000;

    setToasts((prev) => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 }); // Errors stay longer
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem
                toast={toast}
                onRemove={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default useToast;
