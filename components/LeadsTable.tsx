"use client";

import React, { useState } from "react";
import { Download, Search, Filter, ChevronDown, Tag, Trash2, Edit3, MoreHorizontal } from "lucide-react";
import { CustomSelect } from "./ui/CustomSelect";
import { CustomModal } from "./ui/CustomModal";

interface LeadsTableProps {
  leads: any[];
  onLeadClick: (lead: any) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onBulkDelete: (leadIds: string[]) => void;
  onBulkStatusChange: (leadIds: string[], newStatus: string) => void;
  onBulkNicheChange: (leadIds: string[], newNiche: string) => void;
  onBulkLabelAdd: (leadIds: string[], labelId: string) => void;
  customLabels: any[];
  isAdmin?: boolean;
}

export function LeadsTable({ 
  leads, 
  onLeadClick, 
  onStatusChange, 
  onBulkDelete, 
  onBulkStatusChange,
  onBulkNicheChange,
  onBulkLabelAdd,
  customLabels,
  isAdmin
}: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [nicheFilter, setNicheFilter] = useState("All");
  const [labelFilter, setLabelFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [newNicheValue, setNewNicheValue] = useState("");

  const uniqueNiches = Array.from(new Set(leads.map(l => l.niche?.toLowerCase()).filter(Boolean)))
    .map(n => leads.find(l => l.niche?.toLowerCase() === n)?.niche)
    .sort();
  const uniqueOwners = Array.from(new Set(leads.map(l => l.userEmail).filter(Boolean))).sort();
  
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.niche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    const matchesNiche = nicheFilter === "All" || lead.niche?.toLowerCase() === nicheFilter.toLowerCase();
    const matchesLabel = labelFilter === "All" || (lead.labels && lead.labels.some((l: any) => l.id === labelFilter));
    const matchesOwner = ownerFilter === "All" || lead.userEmail === ownerFilter;
    
    return matchesSearch && matchesStatus && matchesNiche && matchesLabel && matchesOwner;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = (status: string) => {
    onBulkStatusChange(selectedIds, status);
    setSelectedIds([]);
  };

  const handleBulkDeleteAction = () => {
    onBulkDelete(selectedIds);
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleBulkNicheAction = () => {
    if (newNicheValue) {
      onBulkNicheChange(selectedIds, newNicheValue);
      setSelectedIds([]);
      setIsNicheModalOpen(false);
      setNewNicheValue("");
    }
  };

  const handleBulkLabelAction = (labelId: string) => {
    onBulkLabelAdd(selectedIds, labelId);
    setSelectedIds([]);
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    
    // Get all unique keys from all leads to form headers
    const headers = ["name", "phone", "email", "website", "address", "city", "country", "niche", "decisionMaker", "status", "source", "userEmail"];
    
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map(lead => 
        headers.map(header => `"${(lead[header] || "").toString().replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col h-full mx-auto">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-emerald-400">All Leads <span className="text-[10px] text-muted-foreground ml-2 px-2 py-0.5 bg-white/5 rounded-full font-mono border border-white/10 uppercase tracking-widest">Premium Build v2.1</span></h1>
          <p className="text-muted-foreground text-xs">Manage and export your complete lead database.</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in slide-in-from-right-4 duration-300">
              <span className="text-xs font-medium text-emerald-400">{selectedIds.length} Selected</span>
              <div className="h-4 w-px bg-white/10 mx-1" />
              
              <button 
                onClick={() => setIsNicheModalOpen(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors"
                title="Change Niche"
              >
                <Edit3 size={16} />
              </button>
              
              <div className="relative group">
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors">
                  <Tag size={16} />
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-[#0A0A0A] border border-white/10 rounded-xl p-1.5 shadow-2xl min-w-[150px]">
                  {customLabels.map(label => (
                    <button
                      key={label.id}
                      onClick={() => handleBulkLabelAction(label.id)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 rounded-lg flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                title="Delete Selected"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all text-xs font-medium active:scale-95"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <CustomModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Leads"
        description={`Are you sure you want to delete ${selectedIds.length} leads? This action cannot be undone.`}
        variant="danger"
        footer={(
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleBulkDeleteAction} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">Delete Permanently</button>
          </>
        )}
      />

      <CustomModal 
        isOpen={isNicheModalOpen} 
        onClose={() => setIsNicheModalOpen(false)}
        title="Update Niche"
        description="Change the niche/category for all selected leads."
        footer={(
          <>
            <button onClick={() => setIsNicheModalOpen(false)} className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleBulkNicheAction} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors">Update Niche</button>
          </>
        )}
      >
        <input 
          type="text"
          placeholder="Enter new niche..."
          value={newNicheValue}
          onChange={(e) => setNewNicheValue(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm transition-all"
          autoFocus
        />
      </CustomModal>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-1.5 outline-none focus:border-emerald-500 text-xs transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <CustomSelect 
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "All", label: "All Statuses" },
              { value: "New", label: "New" },
              { value: "Contacted", label: "Contacted" },
              { value: "Replied", label: "Replied" },
              { value: "Call Booked", label: "Call Booked" },
              { value: "Closed", label: "Closed" },
              { value: "Not Interested", label: "Not Interested" },
            ]}
            className="w-40"
            icon={<Filter size={12} />}
          />

          <CustomSelect 
            value={nicheFilter}
            onChange={setNicheFilter}
            options={[
              { value: "All", label: "All Niches" },
              ...uniqueNiches.map(n => ({ value: n as string, label: n as string }))
            ]}
            className="w-40"
          />

          <CustomSelect 
            value={labelFilter}
            onChange={setLabelFilter}
            options={[
              { value: "All", label: "All Labels" },
              ...customLabels.map(l => ({ value: l.id, label: l.name }))
            ]}
            className="w-40"
            icon={<Tag size={12} />}
          />

          {isAdmin && (
            <CustomSelect 
              value={ownerFilter}
              onChange={setOwnerFilter}
              options={[
                { value: "All", label: "All Owners" },
                ...uniqueOwners.map(o => ({ value: o as string, label: o as string }))
              ]}
              className="w-48"
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-white/10 rounded-xl bg-white/5 w-full">
        <div className="overflow-auto h-full relative">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase bg-black/40 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Phone / Email</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Niche</th>
                <th className="px-6 py-3 font-semibold">Added</th>
                <th className="px-6 py-3 font-semibold">Labels</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                {isAdmin && <th className="px-6 py-3 font-semibold">Owner</th>}
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={() => onLeadClick(lead)}
                  className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-emerald-500/5' : ''}`}
                >
                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleSelectLead(lead.id, e)}
                      className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-white">{lead.name}</div>
                      {lead.source === "groq_simulated" && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.5 rounded uppercase font-bold tracking-wider">Sim</span>
                      )}
                    </div>
                    {lead.decisionMaker && <div className="text-[10px] text-muted-foreground">{lead.decisionMaker}</div>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="font-medium">{lead.phone || "—"}</div>
                    {lead.email && <div className="text-[10px] text-muted-foreground">{lead.email}</div>}
                  </td>
                  <td className="px-6 py-3">
                    <div>{lead.city || "—"}</div>
                    {lead.country && <div className="text-[10px] text-muted-foreground">{lead.country}</div>}
                  </td>
                  <td className="px-6 py-3">{lead.niche}</td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {lead.createdAt && typeof lead.createdAt === "object" && "toMillis" in lead.createdAt 
                        ? formatRelativeTime(lead.createdAt.toMillis())
                        : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {lead.labels && lead.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.labels.map((label: any) => (
                          <span 
                            key={label.id} 
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium border border-white/5 whitespace-nowrap flex items-center gap-1"
                            style={{ backgroundColor: `${label.color}15`, color: label.color }}
                          >
                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-2">
                    <CustomSelect 
                      value={lead.status}
                      onChange={(val) => onStatusChange(lead.id, val)}
                      options={[
                        { value: "New", label: "New" },
                        { value: "Contacted", label: "Contacted" },
                        { value: "Replied", label: "Replied" },
                        { value: "Call Booked", label: "Call Booked" },
                        { value: "Closed", label: "Closed" },
                        { value: "Not Interested", label: "Not Interested" },
                      ]}
                      className="w-28 text-[10px]"
                    />
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-white">{lead.userName || "Unknown"}</span>
                        <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{lead.userEmail || lead.userId?.substring(0, 8)}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-3 text-right">
                    <button className="text-emerald-400 hover:text-emerald-300 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="w-full max-w-6xl mt-4 text-[10px] text-muted-foreground flex justify-between items-center">
        <span>Showing {filteredLeads.length} leads</span>
        {selectedIds.length > 0 && (
          <span className="text-emerald-400 font-medium">{selectedIds.length} leads selected</span>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass border border-emerald-500/30 px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4">
          <div className="text-sm font-medium">
            <span className="text-emerald-400">{selectedIds.length}</span> leads selected
          </div>
          
          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <div className="flex gap-1">
              {["New", "Contacted", "Closed"].map(status => (
                <button
                  key={status}
                  onClick={() => handleBulkStatus(status)}
                  className="px-3 py-1 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs transition-all"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkNicheAction}
              className="px-3 py-1 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs transition-all flex items-center gap-2"
            >
              <Filter size={12} /> Set Category
            </button>

            {customLabels.length > 0 && (
              <div className="relative group">
                <button className="px-3 py-1 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs transition-all flex items-center gap-2">
                  <Tag size={12} /> Add Label
                </button>
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block w-48 bg-black/90 border border-white/10 rounded-xl p-1 shadow-2xl">
                  {customLabels.map(label => (
                    <button
                      key={label.id}
                      onClick={() => handleBulkLabelAction(label.id)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-xs flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-white/10" />

          <button
            onClick={handleBulkDeleteAction}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 transition-colors"
          >
            Delete
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
