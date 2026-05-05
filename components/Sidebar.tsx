"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Users, Zap, Settings, LogOut, BarChart2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ViewType = "pipeline" | "table" | "engine" | "settings" | "dashboard";

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { signOut, role } = useAuth();

  const navItems = [
    { id: "pipeline", label: "Pipeline", icon: LayoutDashboard },
    { id: "table", label: "All Leads", icon: Users },
    { id: "engine", label: "Lead Engine", icon: Zap },
    { id: "dashboard", label: "Analytics", icon: BarChart2 },
  ];

  if (role === "admin") {
    navItems.push({ id: "settings", label: "Settings", icon: Settings });
  }

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-64 h-screen border-r border-white/10 glass flex flex-col shrink-0"
    >
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
          <Zap size={20} />
        </div>
        <span className="font-semibold text-lg tracking-tight">Outreach CRM</span>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left ${
                isActive 
                  ? "bg-white/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={20} className={isActive ? "text-emerald-400" : ""} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full text-left text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
}
