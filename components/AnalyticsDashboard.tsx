"use client";

import { useMemo, type ReactNode } from "react";
import {
  LineChart,
  Line,
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
} from "recharts";
import { TrendingUp, Users, Target, Activity, MapPin, Tag, Flame, Globe } from "lucide-react";

interface AnalyticsDashboardProps {
  leads: LeadRecord[];
}

type TimestampLike =
  | { toMillis?: () => number; toDate?: () => Date; seconds?: number; nanoseconds?: number }
  | Date
  | number
  | string
  | null
  | undefined;

type LabelRecord = { id: string; name: string; color: string };

type LeadRecord = {
  id?: string;
  name?: unknown;
  status?: unknown;
  createdAt?: TimestampLike;
  history?: Array<{ timestamp?: TimestampLike }>;
  niche?: unknown;
  channel?: unknown;
  city?: unknown;
  labels?: Array<string | LabelRecord>;
  hasWebsite?: boolean;
  website?: string;
};

type TooltipEntry = {
  name?: string;
  value?: string | number;
  color?: string;
  fill?: string;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
};

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
  Other: "#6b7280",
};

const STATUS_ORDER = ["New", "Contacted", "Replied", "Call Booked", "Closed", "Not Interested", "Unknown"];

function normalizeText(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return fallback;
}

function getTimestamp(value: TimestampLike) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.seconds === "number") {
      return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
    }
    return 0;
  }
  if (typeof value === "number") return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDate(value: TimestampLike, fallback = "Never") {
  const timestamp = getTimestamp(value);
  if (!timestamp) return fallback;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DarkTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-black/90 border border-white/10 rounded-xl px-4 py-2.5 shadow-2xl text-sm">
      {label && <p className="text-muted-foreground text-xs mb-1">{label}</p>}
      {payload.map((entry) => (
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

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const recentLeads = leads.filter((lead) => getTimestamp(lead.createdAt) > weekAgo.getTime()).length;

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

    return Object.values(byDay)
      .sort((a, b) => a.ts - b.ts)
      .slice(-14);
  }, [leads]);

  const nicheData = useMemo(() => {
    const counts: Record<string, number> = {};

    leads.forEach((lead) => {
      const niche = normalizeText(lead.niche, "Unknown");
      counts[niche] = (counts[niche] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([niche, count]) => ({ niche, count }));
  }, [leads]);

  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};

    leads.forEach((lead) => {
      const channel = normalizeText(lead.channel, "Other");
      counts[channel] = (counts[channel] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};

    leads.forEach((lead) => {
      const city = normalizeText(lead.city, "Unknown");
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city, count], index) => ({ city, count, rank: index + 1 }));
  }, [leads]);

  const labelData = useMemo(() => {
    const counts: Record<string, { name: string; count: number; color: string }> = {};

    leads.forEach((lead) => {
      (lead.labels || []).forEach((label) => {
        if (typeof label === "string") {
          if (!counts[label]) {
            counts[label] = {
              name: label,
              count: 0,
              color: "#6b7280",
            };
          }
          counts[label].count++;
          return;
        }

        const key = label.id;
        if (!counts[key]) {
          counts[key] = {
            name: normalizeText(label.name, "Label"),
            count: 0,
            color: label.color || "#6b7280",
          };
        }
        counts[key].count++;
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
        lastContact: lead.history?.length ? formatDate(lead.history[lead.history.length - 1].timestamp) : "Never",
      }));
  }, [leads]);

  if (leads.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="space-y-4">
          <Activity className="mx-auto h-12 w-12 text-emerald-500 opacity-40" />
          <h2 className="text-xl font-semibold">No Data Yet</h2>
          <p className="text-muted-foreground text-sm">
            Generate some leads with the Lead Engine to see analytics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">Real-time insights across your entire lead pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={18} />} label="Total Leads" value={kpis.total} sub={`+${kpis.recentLeads} this week`} color="emerald" />
        <KpiCard icon={<Target size={18} />} label="Conversion Rate" value={`${kpis.convRate}%`} sub={`${kpis.closed} closed deals`} color="violet" />
        <KpiCard icon={<TrendingUp size={18} />} label="Active Pipeline" value={kpis.active} sub="Contacted + Replied + Booked" color="blue" />
        <KpiCard icon={<Activity size={18} />} label="Avg. Interactions" value={kpis.avgActivity} sub="per lead" color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Pipeline Status</h2>
          <p className="text-xs text-muted-foreground mb-4">Lead distribution by stage</p>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] items-center">
            <div className="h-[220px] w-full">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={statusData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={55} 
                      outerRadius={85}
                      dataKey="value" 
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground rounded-2xl border border-dashed border-white/10 bg-black/20">
                  No status data yet.
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center justify-between text-sm gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[status.name] || "#6b7280" }}
                    />
                    <span className="text-muted-foreground truncate">{status.name}</span>
                  </div>
                  <span className="font-bold shrink-0">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Lead Volume Over Time</h2>
          <p className="text-xs text-muted-foreground mb-4">New leads generated per day (last 14 days)</p>
          <div className="h-[220px] w-full">
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} cursor={false} />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground rounded-2xl border border-dashed border-white/10 bg-black/20">
                No lead volume data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="glass border border-white/10 rounded-2xl p-6 lg:col-span-3">
          <h2 className="font-semibold mb-1">Top Industries</h2>
          <p className="text-xs text-muted-foreground mb-4">Lead count by niche/vertical</p>
          <div className="h-[240px] w-full">
            {nicheData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nicheData} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="niche" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<DarkTooltip />} cursor={false} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} stroke="none" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground rounded-2xl border border-dashed border-white/10 bg-black/20">
                No industry data yet.
              </div>
            )}
          </div>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold mb-1">Outreach Channel Mix</h2>
          <p className="text-xs text-muted-foreground mb-4">Recommended channel distribution</p>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(160px,220px)] items-center">
            <div className="h-[180px] w-full">
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={channelData} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={70}
                      dataKey="value" 
                      paddingAngle={3}
                      stroke="none"
                    >
                      {channelData.map((entry) => (
                        <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground rounded-2xl border border-dashed border-white/10 bg-black/20">
                  No channel data yet.
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {channelData.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[channel.name] || "#6b7280" }} />
                    <span className="text-muted-foreground truncate">{channel.name}</span>
                  </div>
                  <span className="font-bold shrink-0">{channel.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-emerald-500" />
            <h2 className="font-semibold">Top Cities</h2>
          </div>
          <div className="space-y-3">
            {cityData.length === 0 && <p className="text-sm text-muted-foreground italic">No city data yet.</p>}
            {cityData.map((city) => (
              <div key={city.city} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{city.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">{city.city}</span>
                    <span className="text-xs text-emerald-400 font-bold ml-2">{city.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(city.count / (cityData[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={15} className="text-violet-400" />
            <h2 className="font-semibold">Label Usage</h2>
          </div>
          <div className="space-y-3">
            {labelData.length === 0 && <p className="text-sm text-muted-foreground italic">No labels applied yet.</p>}
            {labelData.map((label) => (
              <div key={label.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">{label.name}</span>
                    <span className="text-xs font-bold ml-2" style={{ color: label.color }}>
                      {label.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(label.count / (labelData[0]?.count || 1)) * 100}%`,
                        backgroundColor: label.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="text-orange-400" />
            <h2 className="font-semibold">Hottest Leads</h2>
          </div>
          <div className="space-y-3">
            {leaderboard.map((lead, index) => (
              <div key={lead.id || `${lead.name}-${index}`} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate">{lead.name}</span>
                    <span className="text-xs text-orange-400 font-bold ml-1">{lead.interactions} notes</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground truncate">{lead.niche}</span>
                    <span className="text-[10px] text-muted-foreground">-</span>
                    <span className="text-[10px] text-muted-foreground">{lead.lastContact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={15} className="text-blue-400" />
          <h2 className="font-semibold">Website Ownership</h2>
          <span className="text-xs text-muted-foreground ml-1">- quick gauge of digital maturity across your pipeline</span>
        </div>
        <WebsiteOwnershipBar leads={leads} />
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, { card: string; accent: string }> = {
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

  const styles = colorMap[color] || colorMap.emerald;

  return (
    <div className={`bg-gradient-to-br ${styles.card} border rounded-2xl p-5 flex flex-col gap-3`}>
      <div className={`flex items-center gap-2 ${styles.accent}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  );
}

function WebsiteOwnershipBar({ leads }: { leads: LeadRecord[] }) {
  const withSite = leads.filter((lead) => lead.hasWebsite === true || lead.website).length;
  const withoutSite = leads.length - withSite;
  const pct = leads.length > 0 ? Math.round((withSite / leads.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-blue-400 font-medium">Has website - {withSite} leads ({pct}%)</span>
        <span className="text-muted-foreground">No website - {withoutSite} leads ({100 - pct}%)</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        <div className="h-full bg-red-500/40 transition-all" style={{ width: `${100 - pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct >= 70
          ? "Most leads have an online presence. Ideal for web audit outreach."
          : pct >= 40
          ? "Mixed coverage. Leads without websites are prime targets for web-building pitches."
          : "Most leads have no website. Strong opportunity for digital services positioning."}
      </p>
    </div>
  );
}
