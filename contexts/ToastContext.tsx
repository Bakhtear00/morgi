import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message, type } = customEvent.detail;
      if (message && type) {
        addToast(message, type);
      }
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm space-y-3">
        {toasts.map(toast => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ICONS: { [key in ToastType]: React.ReactNode } = {
  success: <CheckCircle className="w-6 h-6 text-green-500" />,
  error: <AlertTriangle className="w-6 h-6 text-red-500" />,
  info: <Info className="w-6 h-6 text-blue-500" />,
};

const BG_COLORS: { [key in ToastType]: string } = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

const ToastMessage: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300); // Match animation duration
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  const handleDismiss = () => {
      setExiting(true);
      setTimeout(onDismiss, 300);
  }

  return (
    <div
      className={`relative w-full p-4 rounded-2xl shadow-lg border flex items-start gap-4 transition-all duration-300 transform ${BG_COLORS[toast.type]} ${
        exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex-shrink-0">{ICONS[toast.type]}</div>
      <p className="flex-1 text-sm font-bold text-gray-800 break-words whitespace-pre-wrap">{toast.message}</p>
      <button onClick={handleDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};