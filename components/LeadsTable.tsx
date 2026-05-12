"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Search, Filter, Tag, Trash2, Edit3, ChevronDown, Users, X, Plus } from "lucide-react";
import { CustomSelect } from "./ui/CustomSelect";
import { CustomModal } from "./ui/CustomModal";
import { Lead, LabelRecord } from "@/types/lead";
import { LEAD_STATUSES, getStatusStyle } from "@/constants/statuses";
import { formatRelativeTime } from "@/lib/utils";

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onBulkDelete: (leadIds: string[]) => void;
  onBulkStatusChange: (leadIds: string[], newStatus: string) => void;
  onBulkNicheChange: (leadIds: string[], newNiche: string) => void;
  onBulkLabelAdd: (leadIds: string[], labelId: string) => void;
  customLabels: LabelRecord[];
  isAdmin?: boolean;
  onAddLead?: () => void;
}

// ─── Sub-Component: Table Row ────────────────────────────────────────────────

interface LeadRowProps {
  lead: Lead;
  isSelected: boolean;
  isAdmin: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

const LeadRow = React.memo(({ lead, isSelected, isAdmin, onSelect, onClick, index }: LeadRowProps & { index: number }) => {
  const statusStyle = getStatusStyle(lead.status);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.6), ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={`relative transition-colors group cursor-pointer ${
        isSelected ? 'bg-emerald-500/[0.06]' : 'hover:bg-white/[0.025]'
      }`}
    >
      {/* Left glow on hover */}
      <td
        className="px-4 py-3 relative"
        onClick={(e) => onSelect(lead.id, e)}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-r"
          style={{ background: `linear-gradient(180deg, ${statusStyle.hex}cc, ${statusStyle.hex}44)` }}
        />
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <div className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">{lead.name}</div>
        {lead.decisionMaker && <div className="text-[10px] text-white/35 mt-0.5">{lead.decisionMaker}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-white/70">{lead.phone || "—"}</div>
        {lead.email && <div className="text-[10px] text-white/30 mt-0.5">{lead.email}</div>}
      </td>
      <td className="px-4 py-3 text-xs text-white/60">
        <div>{lead.city || "—"}</div>
        {lead.country && <div className="text-[10px] text-white/30">{lead.country}</div>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 bg-white/[0.04] rounded-md border border-white/[0.06] text-white/60">{lead.niche}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] text-white/30 whitespace-nowrap">
          {lead.createdAt && typeof lead.createdAt === "object" && "toMillis" in lead.createdAt
            ? formatRelativeTime(lead.createdAt.toMillis())
            : "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        {lead.labels && lead.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {lead.labels.map((label: LabelRecord) => (
              <span
                key={label.id}
                className="text-[9px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1.5"
                style={{ backgroundColor: `${label.color}12`, color: label.color, borderColor: `${label.color}30` }}
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-white/20 text-[10px]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider flex items-center gap-1.5 w-fit ${statusStyle.bgClass} ${statusStyle.textClass} ${statusStyle.borderClass}`}
        >
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusStyle.hex }} />
          {lead.status}
        </span>
      </td>
      {isAdmin && (
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/80">{lead.userName || "Unknown"}</span>
            <span className="text-[9px] text-white/30 truncate max-w-[100px]">{lead.userEmail}</span>
          </div>
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <button className="text-emerald-400 hover:text-white font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-lg">
          Manage
        </button>
      </td>
    </motion.tr>
  );
});

LeadRow.displayName = "LeadRow";

// ─── Main Component ──────────────────────────────────────────────────────────

export function LeadsTable({ 
  leads, 
  onLeadClick, 
  onBulkDelete, 
  onBulkStatusChange,
  onBulkNicheChange,
  onBulkLabelAdd,
  customLabels,
  isAdmin,
  onAddLead,
}: LeadsTableProps) {
  // Filter States
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    niche: "All",
    label: "All",
    owner: "All"
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal States
  const [modals, setModals] = useState({
    delete: false,
    niche: false,
    dedup: false
  });
  
  const [newNicheValue, setNewNicheValue] = useState("");
  const [dedupIds, setDedupIds] = useState<string[]>([]);

  // Clear selection on filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [filters]);

  // ─── Memoized Data ─────────────────────────────────────────────────────────

  const uniqueNiches = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.niche?.toLowerCase()).filter(Boolean)))
      .map(n => leads.find(l => l.niche?.toLowerCase() === n)?.niche)
      .sort();
  }, [leads]);

  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.userEmail).filter(Boolean))).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !filters.search || 
        lead.name?.toLowerCase().includes(filters.search.toLowerCase()) || 
        lead.niche?.toLowerCase().includes(filters.search.toLowerCase()) ||
        lead.phone?.includes(filters.search);
        
      const matchesStatus = filters.status === "All" || lead.status === filters.status;
      const matchesNiche = filters.niche === "All" || lead.niche?.toLowerCase() === filters.niche.toLowerCase();
      const matchesLabel = filters.label === "All" || (lead.labels && lead.labels.some((l: LabelRecord) => l.id === filters.label));
      const matchesOwner = filters.owner === "All" || lead.userEmail === filters.owner;
      
      return matchesSearch && matchesStatus && matchesNiche && matchesLabel && matchesOwner;
    });
  }, [leads, filters]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredLeads.length ? [] : filteredLeads.map(l => l.id));
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const executeBulkAction = (action: () => void) => {
    action();
    setSelectedIds([]);
  };

  const handleDedupScan = () => {
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const duplicates: string[] = [];
    
    // Oldest first to keep the original
    const sorted = [...leads].sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

    sorted.forEach(l => {
      const p = l.phone?.replace(/\D/g, "");
      const e = l.email?.toLowerCase().trim();
      let isDup = false;
      if (p && p.length > 6) {
        if (seenPhones.has(p)) isDup = true;
        else seenPhones.add(p);
      }
      if (e) {
        if (seenEmails.has(e)) isDup = true;
        else seenEmails.add(e);
      }
      if (isDup) duplicates.push(l.id);
    });

    setDedupIds(duplicates);
    setModals(prev => ({ ...prev, dedup: true }));
  };

  const exportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ["name", "phone", "email", "website", "address", "city", "country", "niche", "decisionMaker", "status", "source", "userEmail"];
    const csv = [
      headers.join(","),
      ...filteredLeads.map(l => headers.map(h => `"${(l as any)[h]?.toString().replace(/"/g, '""').replace(/\n/g, ' ') || ""}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const colCount = isAdmin ? 10 : 9;

  return (
    <div className="p-8 h-full flex flex-col max-w-[1600px] mx-auto w-full space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Lead Inventory
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase font-mono tracking-widest">v2.5 Stable</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Unified view of your global business pipeline.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onAddLead && (
            <button
              onClick={onAddLead}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-5 py-2.5 rounded-2xl transition-all text-xs font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={16} /> Add Lead
            </button>
          )}

          <button 
            onClick={handleDedupScan}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-5 py-2.5 rounded-2xl transition-all text-xs font-bold text-red-400 active:scale-95"
          >
            <Trash2 size={16} /> Cleanup Duplicates
          </button>

          <button 
            onClick={exportCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-2xl transition-all text-xs font-bold text-white active:scale-95"
          >
            <Download size={16} /> Export Dataset
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass p-4 rounded-3xl border border-white/10 flex flex-wrap items-center gap-4 shadow-xl relative z-30">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search names, niches, or numbers..." 
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-emerald-500 text-sm transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <CustomSelect 
            value={filters.status}
            onChange={(val) => setFilters({ ...filters, status: val })}
            options={[{ value: "All", label: "All Statuses" }, ...LEAD_STATUSES.map(s => ({ value: s.value, label: s.label }))]}
            className="w-44"
            icon={<Filter size={14} />}
          />

          <CustomSelect 
            value={filters.niche}
            onChange={(val) => setFilters({ ...filters, niche: val })}
            options={[{ value: "All", label: "All Categories" }, ...uniqueNiches.map(n => ({ value: n as string, label: n as string }))]}
            className="w-44"
          />

          <CustomSelect 
            value={filters.label}
            onChange={(val) => setFilters({ ...filters, label: val })}
            options={[{ value: "All", label: "All Labels" }, ...customLabels.map(l => ({ value: l.id, label: l.name }))]}
            className="w-44"
            icon={<Tag size={14} />}
          />

          {isAdmin && (
            <CustomSelect 
              value={filters.owner}
              onChange={(val) => setFilters({ ...filters, owner: val })}
              options={[{ value: "All", label: "All Owners" }, ...uniqueOwners.map(o => ({ value: o as string, label: o as string }))]}
              className="w-52"
              icon={<Users size={14} />}
            />
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden glass rounded-3xl border border-white/10 shadow-2xl flex flex-col">
        <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-white/10">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl">
              <tr className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                <th className="px-4 py-5 w-12 border-b border-white/5">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-5 border-b border-white/5">Company</th>
                <th className="px-4 py-5 border-b border-white/5">Contact Details</th>
                <th className="px-4 py-5 border-b border-white/5">Location</th>
                <th className="px-4 py-5 border-b border-white/5">Category</th>
                <th className="px-4 py-5 border-b border-white/5">Ingested</th>
                <th className="px-4 py-5 border-b border-white/5">Labels</th>
                <th className="px-4 py-5 border-b border-white/5">Status</th>
                {isAdmin && <th className="px-4 py-5 border-b border-white/5">Assigned To</th>}
                <th className="px-4 py-5 border-b border-white/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredLeads.map((lead, index) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  index={index}
                  isAdmin={!!isAdmin}
                  isSelected={selectedIds.includes(lead.id)}
                  onSelect={toggleSelectLead}
                  onClick={() => onLeadClick(lead)}
                />
              ))}
              
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Search size={48} className="mb-4" />
                      <p className="text-xl font-bold italic">No matches found</p>
                      <p className="text-sm">Try broadening your filters or clearing the search box.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 px-4">
        <div className="flex items-center gap-4">
          <span>Inventory Size: {filteredLeads.length} Leads</span>
          {selectedIds.length > 0 && <span className="text-emerald-500">Selected: {selectedIds.length}</span>}
        </div>
        <span>Real-time Sync Active</span>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 glass border border-emerald-500/40 px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.2)] z-[100] flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/30">
              {selectedIds.length}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-tighter text-white">Leads Ready</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Bulk Control Active</span>
            </div>
          </div>
          
          <div className="h-10 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase mr-2">Status</span>
            <div className="flex gap-1.5">
              {LEAD_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => executeBulkAction(() => onBulkStatusChange(selectedIds, s.value))}
                  className="px-4 py-2 bg-white/5 hover:bg-emerald-500 text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase transition-all active:scale-90"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-10 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModals({ ...modals, niche: true })}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2"
            >
              <Edit3 size={14} /> Category
            </button>

            {customLabels.length > 0 && (
              <div className="relative group">
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2">
                  <Tag size={14} /> Label
                </button>
                <div className="absolute bottom-full mb-4 left-0 hidden group-hover:block w-56 bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                  {customLabels.map(l => (
                    <button
                      key={l.id}
                      onClick={() => executeBulkAction(() => onBulkLabelAdd(selectedIds, l.id))}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-3 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-10 w-px bg-white/10" />

          <button
            onClick={() => setModals({ ...modals, delete: true })}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-white border border-red-500/20 rounded-xl text-[10px] font-bold uppercase transition-all active:scale-90"
          >
            Discard
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="p-2 text-muted-foreground hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Modals */}
      <CustomModal 
        isOpen={modals.delete} 
        onClose={() => setModals({ ...modals, delete: false })}
        title="Wipe Selected Data"
        description={`You are about to permanently delete ${selectedIds.length} leads. This action is destructive and cannot be reversed.`}
        variant="danger"
        footer={(
          <div className="flex gap-3">
            <button onClick={() => setModals({ ...modals, delete: false })} className="px-5 py-2.5 text-xs font-bold uppercase bg-white/5 hover:bg-white/10 rounded-xl transition-all">Abort</button>
            <button onClick={() => executeBulkAction(() => { onBulkDelete(selectedIds); setModals({ ...modals, delete: false }); })} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase transition-all">Confirm Wipe</button>
          </div>
        )}
      />

      <CustomModal 
        isOpen={modals.niche} 
        onClose={() => setModals({ ...modals, niche: false })}
        title="Batch Categorization"
        description="Assign a new niche or industry tag to all selected records."
        footer={(
          <div className="flex gap-3">
            <button onClick={() => setModals({ ...modals, niche: false })} className="px-5 py-2.5 text-xs font-bold uppercase bg-white/5 hover:bg-white/10 rounded-xl transition-all">Cancel</button>
            <button onClick={() => executeBulkAction(() => { onBulkNicheChange(selectedIds, newNicheValue); setModals({ ...modals, niche: false }); setNewNicheValue(""); })} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase transition-all">Apply to Batch</button>
          </div>
        )}
      >
        <input 
          type="text"
          placeholder="New Category Name..."
          value={newNicheValue}
          onChange={(e) => setNewNicheValue(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 text-sm transition-all"
          autoFocus
        />
      </CustomModal>

      <CustomModal
        isOpen={modals.dedup}
        onClose={() => { setModals({ ...modals, dedup: false }); setDedupIds([]); }}
        title="Deduplication Engine"
        description={
          dedupIds.length > 0
            ? `Our engine identified ${dedupIds.length} redundant leads sharing the same contact vectors. Should we purge them?`
            : "System clean. No duplicates found in active inventory."
        }
        variant={dedupIds.length > 0 ? "danger" : undefined}
        footer={(
          <div className="flex gap-3">
            <button onClick={() => { setModals({ ...modals, dedup: false }); setDedupIds([]); }} className="px-5 py-2.5 text-xs font-bold uppercase bg-white/5 hover:bg-white/10 rounded-xl transition-all">
              {dedupIds.length > 0 ? "Keep All" : "Close"}
            </button>
            {dedupIds.length > 0 && (
              <button onClick={() => executeBulkAction(() => { onBulkDelete(dedupIds); setModals({ ...modals, dedup: false }); setDedupIds([]); })} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase transition-all">
                Purge {dedupIds.length} Records
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
