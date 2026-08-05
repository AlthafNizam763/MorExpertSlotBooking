'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ToastContextValue {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message: string, title?: string) => addToast('success', message, title || 'Success'),
    error: (message: string, title?: string) => addToast('error', message, title || 'Error'),
    warning: (message: string, title?: string) => addToast('warning', message, title || 'Warning'),
    info: (message: string, title?: string) => addToast('info', message, title || 'Notice'),
  };

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmResponse = (choice: boolean) => {
    if (confirmState) {
      confirmState.resolve(choice);
      setConfirmState(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* TOAST CONTAINER */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none font-sans px-4 sm:px-0">
        {toasts.map((t) => {
          const config = {
            success: {
              icon: CheckCircle,
              bg: 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10',
              iconColor: 'text-emerald-400 bg-emerald-500/10',
            },
            error: {
              icon: AlertCircle,
              bg: 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-500/10',
              iconColor: 'text-rose-400 bg-rose-500/10',
            },
            warning: {
              icon: AlertTriangle,
              bg: 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10',
              iconColor: 'text-amber-400 bg-amber-500/10',
            },
            info: {
              icon: Info,
              bg: 'bg-slate-900/95 border-sky-500/40 text-slate-100 shadow-sky-500/10',
              iconColor: 'text-sky-400 bg-sky-500/10',
            },
          }[t.type];

          const IconComponent = config.icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all animate-in slide-in-from-top-4 fade-in duration-200 overflow-hidden relative ${config.bg}`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${config.iconColor}`}>
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex-grow pr-2 pt-0.5 space-y-0.5">
                {t.title && <h4 className="text-xs font-bold uppercase tracking-wider text-white">{t.title}</h4>}
                <p className="text-xs text-slate-300 leading-relaxed">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : confirmState.options.variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {confirmState.options.variant === 'danger' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : confirmState.options.variant === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1 pt-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {confirmState.options.title || 'Confirm Action'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleConfirmResponse(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmResponse(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                    : confirmState.options.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                    : 'bg-primary hover:bg-blue-600 shadow-primary/25'
                }`}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within NotificationProvider');
  }
  return ctx.toast;
};

export const useConfirm = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within NotificationProvider');
  }
  return ctx.confirm;
};
