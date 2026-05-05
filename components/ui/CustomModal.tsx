"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "danger" | "default";
}

export function CustomModal({ isOpen, onClose, title, description, children, footer, variant = "default" }: CustomModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                {description && (
                  <p className="text-sm text-muted-foreground mb-6">{description}</p>
                )}

                <div className="text-white">
                  {children}
                </div>
              </div>

              {footer && (
                <div className="bg-white/[0.02] border-t border-white/5 p-4 flex justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
