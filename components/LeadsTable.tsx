"use client";

import { useState } from "react";
import { Download, Search, Filter } from "lucide-react";

interface LeadsTableProps {
  leads: any[];
  onLeadClick: (lead: any) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

export function LeadsTable({ leads, onLeadClick, onStatusChange }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.niche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (leads.length === 0) return;
    
    // Get all unique keys from all leads to form headers
    const headers = ["name", "phone", "email", "website", "address", "city", "country", "niche", "decisionMaker", "status", "source"];
    
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
        
        <div className="relative w-48">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-emerald-500 text-sm appearance-none"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Replied">Replied</option>
            <option value="Call Booked">Call Booked</option>
            <option value="Closed">Closed</option>
            <option value="Not Interested">Not Interested</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-white/10 rounded-xl bg-white/5">
        <div className="overflow-auto h-full relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/40 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Phone / Email</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Niche</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{lead.name}</div>
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
                    <select 
                      value={lead.status}
                      onChange={(e) => onStatusChange(lead.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent row click
                      className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Replied">Replied</option>
                      <option value="Call Booked">Call Booked</option>
                      <option value="Closed">Closed</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </td>
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
      
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {filteredLeads.length} leads
      </div>
    </div>
  );
}
