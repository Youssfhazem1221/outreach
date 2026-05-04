"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Globe, MapPin, Building, Star, MessageSquare } from "lucide-react";
import { useState } from "react";

interface LeadDetailDrawerProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onGenerateOutreach: (leadId: string, offer: string) => Promise<void>;
}

export function LeadDetailDrawer({ lead, isOpen, onClose, onUpdateStatus, onGenerateOutreach }: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "outreach">("details");
  const [offer, setOffer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!lead || !offer) return;
    setIsGenerating(true);
    await onGenerateOutreach(lead.id, offer);
    setIsGenerating(false);
  };

  return (
    <AnimatePresence>
      {isOpen && lead && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-[500px] max-w-[100vw] glass border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold mb-1">{lead.name}</h2>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-muted-foreground">{lead.niche}</span>
                  <select 
                    className="text-xs px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 outline-none"
                    value={lead.status}
                    onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Replied">Replied</option>
                    <option value="Call Booked">Call Booked</option>
                    <option value="Closed">Closed</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-6 mt-4 gap-6">
              <button 
                onClick={() => setActiveTab("details")}
                className={`pb-3 border-b-2 transition-colors font-medium ${activeTab === "details" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                Lead Details
              </button>
              <button 
                onClick={() => setActiveTab("outreach")}
                className={`pb-3 border-b-2 transition-colors font-medium flex items-center gap-2 ${activeTab === "outreach" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                <MessageSquare size={16} />
                Outreach Gen
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {activeTab === "details" ? (
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    {lead.phone && (
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 transition-colors">
                        <Phone size={16} className="text-emerald-400" />
                        <span className="text-sm font-medium">WhatsApp</span>
                      </a>
                    )}
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 transition-colors">
                        <Globe size={16} className="text-blue-400" />
                        <span className="text-sm font-medium">Website</span>
                      </a>
                    )}
                  </div>

                  {/* Info Blocks */}
                  <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Contact Info</h3>
                    
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-muted-foreground" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-sm">{lead.address} <br/> {lead.city}, {lead.country}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Company Details</h3>
                    
                    {lead.decisionMaker && (
                      <div className="flex items-center gap-3">
                        <Users size={16} className="text-muted-foreground" />
                        <span className="text-sm"><span className="text-muted-foreground">Contact:</span> {lead.decisionMaker} ({lead.decisionMakerTitle || "Owner"})</span>
                      </div>
                    )}
                    {lead.employeeCount && (
                      <div className="flex items-center gap-3">
                        <Building size={16} className="text-muted-foreground" />
                        <span className="text-sm"><span className="text-muted-foreground">Size:</span> {lead.employeeCount}</span>
                      </div>
                    )}
                    {lead.rating && (
                      <div className="flex items-center gap-3">
                        <Star size={16} className="text-emerald-400" />
                        <span className="text-sm">{lead.rating} <span className="text-muted-foreground">({lead.reviewCount || 0} reviews)</span></span>
                      </div>
                    )}
                  </div>

                  {lead.pain && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <h3 className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-2">Identified Pain Point</h3>
                      <p className="text-sm text-red-100">{lead.pain}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 h-full flex flex-col">
                  {!lead.en_message ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <h3 className="text-sm font-medium mb-3">Generate Outreach</h3>
                      <input 
                        type="text" 
                        value={offer} 
                        onChange={(e) => setOffer(e.target.value)} 
                        placeholder="What are you pitching? (e.g. AI Voice Agent)"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm mb-4 outline-none focus:border-emerald-500"
                      />
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !offer}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        {isGenerating ? "Generating with Groq..." : "Generate AI Messages"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">English Message</h3>
                          <button className="text-xs text-emerald-400 hover:underline" onClick={() => navigator.clipboard.writeText(lead.en_message)}>Copy</button>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                          {lead.en_message}
                        </div>
                      </div>
                      
                      <div className="space-y-2" dir="auto">
                        <div className="flex justify-between items-center" dir="ltr">
                          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Arabic Message</h3>
                          <button className="text-xs text-emerald-400 hover:underline" onClick={() => navigator.clipboard.writeText(lead.ar_message)}>Copy</button>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed font-arabic text-right">
                          {lead.ar_message}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
