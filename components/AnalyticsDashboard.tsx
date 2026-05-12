"use client";

import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Users, Target, Activity, MapPin, Tag, Flame, Globe } from "lucide-react";
import { Lead, LabelRecord } from "@/types/lead";
import { getTimestamp } from "@/lib/dates";

interface AnalyticsDashboardProps {
  leads: Lead[];
}

const STATUS_COLORS: Record<string, string> = {
  New: "#6366f1",
  Contacted: "#f59e0b",
  Replied: "#3b82f6",
  "Call Booked": "#8b5cf6",
  Closed: "#10b981",
  "Not Interested": "#ef4444",
  Unknown: "#6b7280",
};

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: "#25D366",
  Email: "#3b82f6",
  LinkedIn: "#0A66C2",
  Instagram: "#E1306C",
  Facebook: "#1877F2",
  Twitter: "#1DA1F2",
  Tiktok: "#ff0050",
  Website: "#10b981",
  Other: "#6b7280",
};

const KPI_COLOR_MAP: Record<string, { card: string; accent: string }> = {
  emerald: {
    card: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    accent: "text-emerald-400",
  },
  violet: {
    card: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    accent: "text-violet-400",
  },
  blue: {
    card: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    accent: "text-blue-400",
  },
  amber: {
    card: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    accent: "text-amber-400",
  },
};

const STATUS_ORDER = ["New", "Contacted", "Replied", "Call Booked", "Closed", "Not Interested", "Unknown"];

function normalizeText(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
    return trimmed || fallback;
  }
  return fallback;
}

function toTitleCase(str: string) {
  if (!str || str === "Unknown") return str;
  return str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-4 py-2.5 shadow-2xl text-sm">
      {label && <p className="text-muted-foreground text-xs mb-1">{label}</p>}
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color || entry.fill }}>
          <span className="font-bold">{entry.value}</span>
          {entry.name !== "value" ? ` ${entry.name}` : null}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ leads }: AnalyticsDashboardProps) {
  const kpis = useMemo(() => {
    const total = leads.length;
    const closed = leads.filter((lead) => normalizeText(lead.status, "Unknown") === "Closed").length;
    const active = leads.filter((lead) => ["Contacted", "Replied", "Call Booked"].includes(normalizeText(lead.status, "Unknown"))).length;
    const totalActivity = leads.reduce((sum, lead) => sum + (lead.history?.length || 0), 0);
    const avgActivity = total > 0 ? (totalActivity / total).toFixed(1) : "0";

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentLeads = leads.filter((lead) => getTimestamp(lead.createdAt) > weekAgo).length;

    return {
      total,
      closed,
      active,
      avgActivity,
      recentLeads,
      convRate: total > 0 ? ((closed / total) * 100).toFixed(1) : "0",
    };
  }, [leads]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const status = normalizeText(lead.status, "Unknown");
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => STATUS_ORDER.indexOf(a.name) - STATUS_ORDER.indexOf(b.name));
  }, [leads]);

  const volumeData = useMemo(() => {
    const byDay: Record<string, { date: string; leads: number; ts: number }> = {};
    leads.forEach((lead) => {
      const ms = getTimestamp(lead.createdAt);
      if (!ms) return;
      const day = new Date(ms);
      const dateKey = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDay[dateKey]) {
        byDay[dateKey] = { date: dateKey, leads: 0, ts: day.setHours(0, 0, 0, 0) };
      }
      byDay[dateKey].leads++;
    });
    return Object.values(byDay).sort((a, b) => a.ts - b.ts).slice(-14);
  }, [leads]);

  const nicheData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      let niche = toTitleCase(normalizeText(lead.niche, "Unknown"));
      counts[niche] = (counts[niche] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([niche, count]) => ({ niche, count }));
  }, [leads]);

  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      let channel = normalizeText(lead.channel, "Website");
      if (channel.toLowerCase() === "x") channel = "Twitter";
      channel = toTitleCase(channel);
      counts[channel] = (counts[channel] || 0) + 1;
    });
    const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length > 5) {
      const top4 = sorted.slice(0, 4);
      const otherValue = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
      return [...top4, { name: "Other", value: otherValue }];
    }
    return sorted;
  }, [leads]);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      let city = toTitleCase(normalizeText(lead.city, "Unknown"));
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([city, count], index) => ({ city, count, rank: index + 1 }));
  }, [leads]);

  const labelData = useMemo(() => {
    const counts: Record<string, { name: string; count: number; color: string }> = {};
    leads.forEach((lead) => {
      (lead.labels || []).forEach((label) => {
        const id = typeof label === "string" ? label : label.id;
        const name = typeof label === "string" ? label : label.name;
        const color = typeof label === "string" ? "#6b7280" : label.color || "#6b7280";
        if (!counts[id]) counts[id] = { name, count: 0, color };
        counts[id].count++;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [leads]);

  const leaderboard = useMemo(() => {
    return [...leads]
      .sort((a, b) => (b.history?.length || 0) - (a.history?.length || 0))
      .slice(0, 5)
      .map((lead) => ({
        id: lead.id,
        name: normalizeText(lead.name, "Unknown"),
        niche: normalizeText(lead.niche, "-"),
        interactions: lead.history?.length || 0,
        lastContact: lead.history?.length ? new Date(getTimestamp(lead.history[lead.history.length-1].timestamp)).toLocaleDateString() : "Never",
      }));
  }, [leads]);

  if (leads.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
        <Activity className="h-16 w-16 text-emerald-500 opacity-20" />
        <h2 className="text-2xl font-bold tracking-tight">No Data Stream Available</h2>
        <p className="text-muted-foreground text-sm max-w-sm">Use the Lead Engine to populate your pipeline and unlock real-time business intelligence.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black mb-2 tracking-tighter">INTELLIGENCE DASHBOARD</h1>
        <p className="text-muted-foreground text-sm flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" /> Live pipeline metrics and market distribution.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard icon={<Users size={20} />} label="Total Leads" value={kpis.total} sub={`+${kpis.recentLeads} new this week`} color="emerald" />
        <KpiCard icon={<Target size={20} />} label="Success Rate" value={`${kpis.convRate}%`} sub={`${kpis.closed} closed deals`} color="violet" />
        <KpiCard icon={<TrendingUp size={20} />} label="Active Stream" value={kpis.active} sub="Engaged in pipeline" color="blue" />
        <KpiCard icon={<Activity size={20} />} label="Intensity" value={kpis.avgActivity} sub="Interactions / Lead" color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6">
          <header>
            <h2 className="text-lg font-bold">Pipeline Health</h2>
            <p className="text-xs text-muted-foreground">Functional stage distribution</p>
          </header>
          <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] items-center">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={4} stroke="none">
                    {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center justify-between text-xs group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: STATUS_COLORS[status.name] || "#6b7280" }} />
                    <span className="text-muted-foreground group-hover:text-white transition-colors">{status.name}</span>
                  </div>
                  <span className="font-black text-white">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6">
          <header>
            <h2 className="text-lg font-bold">Acquisition Velocity</h2>
            <p className="text-xs text-muted-foreground">New leads per day (14-day window)</p>
          </header>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#velocityGrad)"
                  dot={{ fill: "#10b981", r: 0, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#10b981", fill: "#000" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section className="glass border border-white/10 rounded-[2.5rem] p-8 lg:col-span-3 space-y-6">
          <h2 className="text-lg font-bold">Market Dominance</h2>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nicheData} layout="vertical" barSize={14}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="niche" tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: "bold" }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass border border-white/10 rounded-[2.5rem] p-8 lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold">Channel Diversity</h2>
          <div className="grid gap-8 md:grid-cols-1 items-center">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
                    {channelData.map((entry) => <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || "#6b7280"} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {channelData.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel.name] || "#6b7280" }} />
                    <span className="text-muted-foreground truncate">{channel.name}</span>
                  </div>
                  <span className="font-bold">{channel.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <StatPanel icon={<MapPin size={18} className="text-emerald-500" />} title="Geography" data={cityData} dataKey="city" color="#10b981" />
        <StatPanel icon={<Tag size={18} className="text-violet-400" />} title="Taxonomy" data={labelData} dataKey="name" color="#8b5cf6" />
        
        <section className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Flame size={18} className="text-orange-400" />
            <h2 className="text-lg font-bold">Top Prospects</h2>
          </div>
          <div className="space-y-4">
            {leaderboard.map((lead, index) => (
              <div key={lead.id} className="flex items-center gap-4 group cursor-default">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${index === 0 ? "bg-amber-500 text-black" : "bg-white/5 text-muted-foreground"}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">{lead.name}</span>
                    <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">{lead.interactions} PTS</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{lead.niche}</span>
                    <span>Last: {lead.lastContact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: ReactNode; label: string; value: string | number; sub: string; color: string }) {
  const styles = KPI_COLOR_MAP[color] || KPI_COLOR_MAP.emerald;
  const isNumber = typeof value === "number";
  const [displayed, setDisplayed] = useState(isNumber ? 0 : value);

  useEffect(() => {
    if (!isNumber) { setDisplayed(value); return; }
    const target = value as number;
    const duration = 900;
    const start = performance.now();
    const raf = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [value, isNumber]);

  return (
    <div className={`bg-gradient-to-br ${styles.card} border rounded-[2rem] p-6 flex flex-col gap-4 shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-default group hover:shadow-2xl`}>
      <div className={`flex items-center gap-3 ${styles.accent}`}>
        <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors border border-white/[0.06]">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <div>
        <p className="text-4xl font-black tracking-tighter tabular-nums" style={{ animation: "count-up 0.4s ease-out" }}>
          {displayed}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function StatPanel({ icon, title, data, dataKey, color }: { icon: ReactNode; title: string; data: any[]; dataKey: string; color: string }) {
  const maxVal = data[0]?.count || 1;
  return (
    <section className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item[dataKey]} className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white/80">{item[dataKey]}</span>
              <span className="font-black" style={{ color }}>{item.count}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(item.count / maxVal) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
