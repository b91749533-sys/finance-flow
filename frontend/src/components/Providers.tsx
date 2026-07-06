'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { Bell, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Toast notification context definitions
interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (title: string, message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToasts must be used inside ToastProvider');
  return context;
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated } = useAuthStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const showToast = (title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Socket listener for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected to backend.');
    });

    newSocket.on('notification', (data: { type: string; title: string; message: string }) => {
      console.log('Realtime notification received:', data);
      
      let toastType: Toast['type'] = 'info';
      if (data.type === 'budget_alert') toastType = 'warning';
      if (data.type === 'milestone') toastType = 'success';
      if (data.type === 'security') toastType = 'error';

      showToast(data.title, data.message, toastType);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
        {children}
        
        {/* Toast rendering overlay */}
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full">
          <AnimatePresence>
            {toasts.map((toast) => {
              const bgClass =
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300'
                  : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
                  : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300';

              const Icon =
                toast.type === 'success'
                  ? CheckCircle
                  : toast.type === 'warning'
                  ? AlertTriangle
                  : toast.type === 'error'
                  ? AlertTriangle
                  : Info;

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                  className={`flex gap-3 p-4 rounded-xl border card-shadow ${bgClass}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm leading-tight">{toast.title}</h4>
                    <p className="text-xs mt-1 leading-normal opacity-90">{toast.message}</p>
                  </div>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="h-fit text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
};
