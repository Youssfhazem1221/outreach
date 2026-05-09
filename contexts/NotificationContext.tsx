"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = "success") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        {notifications.map(n => (
          <div 
            key={n.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300 min-w-[300px] ${
              n.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" :
              n.type === "error" ? "bg-red-500/90 border-red-400 text-white" :
              "bg-blue-500/90 border-blue-400 text-white"
            }`}
          >
            {n.type === "success" && <CheckCircle2 size={18} />}
            {n.type === "error" && <AlertCircle size={18} />}
            {n.type === "info" && <Info size={18} />}
            <span className="text-sm font-semibold flex-1">{n.message}</span>
            <button onClick={() => removeNotification(n.id)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
}
