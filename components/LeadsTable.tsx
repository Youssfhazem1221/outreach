"use client";

import { useState } from "react";
import { Download, Search, Filter, ChevronDown, Tag } from "lucide-react";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.niche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
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
  };

  const handleBulkNicheAction = () => {
    const newNiche = prompt("Enter the new niche/category for these leads:");
    if (newNiche) {
      onBulkNicheChange(selectedIds, newNiche);
      setSelectedIds([]);
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
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">All Leads</h1>
          <p className="text-muted-foreground text-sm">Manage and export your complete lead database.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search name, phone, or niche..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-emerald-500 text-sm"
          />
        </div>
        
        <div className="relative w-48 group">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2 outline-none focus:border-emerald-500 text-sm appearance-none cursor-pointer hover:bg-white/5 transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Replied">Replied</option>
            <option value="Call Booked">Call Booked</option>
            <option value="Closed">Closed</option>
            <option value="Not Interested">Not Interested</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-white/10 rounded-xl bg-white/5">
        <div className="overflow-auto h-full relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/40 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Phone / Email</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Niche</th>
                <th className="px-6 py-4 font-semibold">Labels</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                {isAdmin && <th className="px-6 py-4 font-semibold">Owner</th>}
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={() => onLeadClick(lead)}
                  className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-emerald-500/5' : ''}`}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleSelectLead(lead.id, e)}
                      className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-white">{lead.name}</div>
                      {lead.source === "groq_simulated" && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Simulated</span>
                      )}
                    </div>
                    {lead.decisionMaker && <div className="text-xs text-muted-foreground mt-0.5">{lead.decisionMaker}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{lead.phone || "—"}</div>
                    {lead.email && <div className="text-xs text-muted-foreground mt-0.5">{lead.email}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div>{lead.city || "—"}</div>
                    {lead.country && <div className="text-xs text-muted-foreground mt-0.5">{lead.country}</div>}
                  </td>
                  <td className="px-6 py-4">{lead.niche}</td>
                  <td className="px-6 py-4">
                    {lead.labels && lead.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.labels.map((label: any) => (
                          <span 
                            key={label.id} 
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium border border-white/5 whitespace-nowrap flex items-center gap-1"
                            style={{ backgroundColor: `${label.color}15`, color: label.color }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative group w-36">
                      <select 
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                        className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded px-2 pr-6 py-1 text-xs outline-none focus:border-emerald-500 appearance-none cursor-pointer hover:bg-emerald-500/20 transition-all"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Replied">Replied</option>
                        <option value="Call Booked">Call Booked</option>
                        <option value="Closed">Closed</option>
                        <option value="Not Interested">Not Interested</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{lead.userName || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{lead.userEmail || lead.userId?.substring(0, 8)}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onLeadClick(lead)}
                      className="text-emerald-400 hover:text-emerald-300 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
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
      
      <div className="mt-4 text-sm text-muted-foreground flex justify-between items-center">
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
  );
}
