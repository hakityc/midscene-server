import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 触发进入动画
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`
        relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300
        ${getTypeStyles()}
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      <div className="flex-shrink-0 text-lg font-bold">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm opacity-90 mt-1">{toast.message}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 全局 toast 函数
  useEffect(() => {
    const showToast = (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);
    };

    // 将 toast 函数挂载到 window 对象上
    (window as any).toast = {
      success: (title: string, message?: string, duration?: number) =>
        showToast({ type: 'success', title, message, duration }),
      error: (title: string, message?: string, duration?: number) =>
        showToast({ type: 'error', title, message, duration }),
      info: (title: string, message?: string, duration?: number) =>
        showToast({ type: 'info', title, message, duration }),
      warning: (title: string, message?: string, duration?: number) =>
        showToast({ type: 'warning', title, message, duration }),
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

// 便捷函数
export const toast = {
  success: (title: string, message?: string, duration = 3000) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(title, message, duration);
    }
  },
  error: (title: string, message?: string, duration = 5000) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error(title, message, duration);
    }
  },
  info: (title: string, message?: string, duration = 3000) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.info(title, message, duration);
    }
  },
  warning: (title: string, message?: string, duration = 4000) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.warning(title, message, duration);
    }
  },
};
