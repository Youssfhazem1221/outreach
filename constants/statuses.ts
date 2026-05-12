import { LeadStatus } from "@/types/lead";

export interface StatusConfig {
  value: LeadStatus;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;        // Raw hex for inline styles (borders, glows, stripes)
  glowClass: string;  // CSS utility class
}

export const LEAD_STATUSES: StatusConfig[] = [
  { value: "New",            label: "New",            bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", borderClass: "border-emerald-500/20", hex: "#10b981", glowClass: "glow-emerald-sm" },
  { value: "Contacted",      label: "Contacted",      bgClass: "bg-blue-500/10",    textClass: "text-blue-400",    borderClass: "border-blue-500/20",    hex: "#3b82f6", glowClass: "glow-blue"        },
  { value: "Replied",        label: "Replied",        bgClass: "bg-purple-500/10",  textClass: "text-purple-400",  borderClass: "border-purple-500/20",  hex: "#8b5cf6", glowClass: "glow-violet"      },
  { value: "Call Booked",    label: "Call Booked",    bgClass: "bg-amber-500/10",   textClass: "text-amber-400",   borderClass: "border-amber-500/20",   hex: "#f59e0b", glowClass: "glow-amber"       },
  { value: "Closed",         label: "Closed",         bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", borderClass: "border-emerald-500/20", hex: "#10b981", glowClass: "glow-emerald-sm"  },
  { value: "Not Interested", label: "Not Interested", bgClass: "bg-red-500/10",     textClass: "text-red-400",     borderClass: "border-red-500/20",     hex: "#ef4444", glowClass: "glow-red"         },
];

/** Get status styling by value, with a fallback for unknown statuses */
export function getStatusStyle(status: string): StatusConfig {
  return LEAD_STATUSES.find(s => s.value === status) || {
    value: status as LeadStatus,
    label: status,
    bgClass: "bg-white/10",
    textClass: "text-white/50",
    borderClass: "border-white/10",
    hex: "#6b7280",
    glowClass: "",
  };
}
