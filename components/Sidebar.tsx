"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Zap, Settings, LogOut, BarChart2, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ViewType = "pipeline" | "table" | "engine" | "settings" | "dashboard";

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { signOut, role, user } = useAuth();

  const navItems = [
    { id: "pipeline",  label: "Pipeline",    icon: LayoutDashboard, description: "Kanban board" },
    { id: "table",     label: "All Leads",   icon: Users,           description: "Full inventory" },
    { id: "engine",    label: "Lead Engine", icon: Zap,             description: "Discover leads" },
    { id: "dashboard", label: "Analytics",   icon: BarChart2,       description: "Intelligence" },
  ];

  if (role === "admin") {
    navItems.push({ id: "settings", label: "Settings", icon: Settings, description: "System config" });
  }

  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="w-64 h-screen border-r border-white/[0.07] flex flex-col shrink-0 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Subtle left glow edge */}
      <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent pointer-events-none" />

      {/* ── Brand Header ───────────────────────────────── */}
      <div className="px-5 py-6 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          {/* Animated logo mark */}
          <div className="relative h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 pulse-emerald">
            <Zap size={18} className="text-emerald-400" fill="rgba(16,185,129,0.3)" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-base tracking-tight text-white">Outreach</span>
              <span className="font-black text-base tracking-tight text-emerald-400">CRM</span>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25 mt-0.5">
              AI-Powered Pipeline
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <div key={item.id} className="relative">
              {/* Animated active pill background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 100%)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    boxShadow: "0 0 16px rgba(16,185,129,0.08), inset 0 1px 0 rgba(16,185,129,0.1)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}

              <button
                onClick={() => setCurrentView(item.id as ViewType)}
                className="relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-left group"
              >
                {/* Left active bar */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-emerald-400"
                      style={{ boxShadow: "0 0 8px rgba(16,185,129,0.6)" }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.04] text-white/40 group-hover:bg-white/[0.08] group-hover:text-white/70"
                  }`}
                >
                  <Icon size={16} />
                </div>

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold transition-colors duration-200 ${
                    isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                  }`}>
                    {item.label}
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-emerald-400/60 font-medium mt-0.5"
                    >
                      {item.description}
                    </motion.div>
                  )}
                </div>

                {/* Active chevron */}
                {isActive && (
                  <ChevronRight size={12} className="text-emerald-400/50 shrink-0" />
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* ── User Profile Footer ─────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.07] space-y-1">
        {/* User info card */}
        {user && (
          <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[11px] font-black shrink-0">
                  {getInitials(user.displayName || user.email)}
                </div>
              )}

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white/90 truncate leading-tight">
                  {user.displayName || "User"}
                </div>
                <div className="text-[10px] text-white/30 truncate mt-0.5">
                  {user.email}
                </div>
              </div>

              {/* Role badge */}
              <span
                className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0 ${
                  role === "admin"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-white/5 text-white/30 border-white/10"
                }`}
              >
                {role || "user"}
              </span>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all w-full text-left text-white/35 hover:bg-red-500/10 hover:text-red-400 group"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.03] group-hover:bg-red-500/10 transition-colors">
            <LogOut size={14} />
          </div>
          <span className="text-xs font-semibold">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
