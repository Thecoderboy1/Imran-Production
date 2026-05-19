import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToasterProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export function Toaster({ toasts, removeToast }: ToasterProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto min-w-[300px] max-w-md bg-slate-900 border p-4 rounded-2xl shadow-2xl flex items-start gap-3",
              toast.type === 'success' ? "border-emerald-500/50" :
              toast.type === 'error' ? "border-red-500/50" :
              toast.type === 'warning' ? "border-amber-500/50" : "border-brand-500/50"
            )}
          >
            <div className={cn(
              "shrink-0 mt-0.5",
              toast.type === 'success' ? "text-emerald-500" :
              toast.type === 'error' ? "text-red-500" :
              toast.type === 'warning' ? "text-amber-500" : "text-brand-500"
            )}>
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'warning' && <AlertTriangle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-tight text-white">{toast.type}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium italic">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const NotificationContext = React.createContext<{
  addToast: (type: ToastMessage['type'], message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'info' | 'danger') => void;
} | null>(null);

export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const [modal, setModal] = React.useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'info' });

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'info' | 'danger' = 'info') => {
    setModal({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setModal((m: any) => ({ ...m, isOpen: false })); }, type });
  };

  return (
    <NotificationContext.Provider value={{ addToast, showConfirm }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
      <CustomModal {...modal} onClose={() => setModal((m: any) => ({ ...m, isOpen: false }))} />
    </NotificationContext.Provider>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  type?: 'danger' | 'info';
  input?: {
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
  };
}

export function CustomModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm,
  type = 'info',
  input
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full relative z-10 shadow-2xl"
          >
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">{title}</h3>
            <p className="text-slate-400 font-medium italic mb-8 leading-relaxed">{message}</p>
            
            {input && (
              <input 
                autoFocus
                type="text"
                placeholder={input.placeholder}
                value={input.value}
                onChange={(e) => input.onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white mb-8 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onConfirm}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98]",
                  type === 'danger' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                )}
              >
                {confirmText}
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:text-white"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
