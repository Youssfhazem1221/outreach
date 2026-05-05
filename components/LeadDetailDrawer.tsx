"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Mail, Phone, MapPin, Globe, History, Send, MessageSquare, Plus, Trash2, Calendar, Target, User, Copy, Check, ChevronDown } from "lucide-react";
import { CustomSelect } from "./UI/CustomSelect";
import { CustomModal } from "./UI/CustomModal";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

interface LeadDetailDrawerProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export function LeadDetailDrawer({ lead: initialLead, isOpen, onClose, onUpdateStatus }: LeadDetailDrawerProps) {
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [globalLabels, setGlobalLabels] = useState<{id: string, name: string, color: string}[]>([]);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local state when lead prop changes
  useEffect(() => {
    if (initialLead) {
      setLead({ ...initialLead });
      setIsEditing(false);
    }
  }, [initialLead, isOpen]);

  // Close label dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch global labels when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchLabels = async () => {
      try {
        const labelDoc = await getDoc(doc(db, "settings", "labels"));
        if (labelDoc.exists()) {
          setGlobalLabels(labelDoc.data().items || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLabels();
  }, [isOpen]);

  const toggleLeadLabel = async (label: {id: string, name: string, color: string}) => {
    if (!lead) return;
    const currentLabels = lead.labels || [];
    const hasLabel = currentLabels.some((l: any) => l.id === label.id);
    try {
      const updatedLabels = hasLabel
        ? currentLabels.filter((l: any) => l.id !== label.id)
        : [...currentLabels, label];
      setLead({ ...lead, labels: updatedLabels });
      await updateDoc(doc(db, "leads", lead.id), { labels: updatedLabels });
    } catch (e) {
      console.error("Failed to update labels", e);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setLead((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!lead || !lead.id) return;
    setIsSaving(true);
    try {
      const { id, ...saveData } = lead;
      await updateDoc(doc(db, "leads", lead.id), {
        ...saveData,
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (initialLead) setLead({ ...initialLead });
    setIsEditing(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !lead || !user) return;
    setIsPostingNote(true);
    const noteEntry = {
      id: Date.now().toString(),
      text: newNote.trim(),
      author: user.displayName || user.email || "Unknown",
      timestamp: new Date().toISOString(),
    };
    try {
      await updateDoc(doc(db, "leads", lead.id), { history: arrayUnion(noteEntry) });
      // Removed local state update to prevent "adds twice" bug (let Firestore listener handle it)
      setNewNote("");
    } catch (e) {
      console.error("Failed to add note", e);
      alert("Failed to add note");
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!lead || !noteToDelete) return;
    try {
      const updatedHistory = lead.history.filter((n: any) => n.id !== noteToDelete);
      await updateDoc(doc(db, "leads", lead.id), { history: updatedHistory });
      setLead((prev: any) => ({ ...prev, history: updatedHistory }));
      setNoteToDelete(null);
    } catch (e) {
      console.error("Failed to delete note", e);
    }
  };

  const handleCopyLink = () => {
    if (!lead?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?leadId=${lead.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && lead && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-[520px] max-w-[100vw] bg-[#0d0d0d] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/[0.02]">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      className="text-2xl font-bold bg-white/5 border border-white/10 outline-none focus:border-emerald-500 w-full rounded-lg px-3 py-1.5 transition-colors"
                      value={lead.name || ""}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="Company Name"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold truncate">{lead.name}</h2>
                  )}

                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    {isEditing ? (
                      <input
                        className="text-xs px-2 py-1 rounded-md bg-white/10 text-muted-foreground border border-white/10 outline-none focus:border-emerald-500 w-32"
                        value={lead.niche || ""}
                        onChange={(e) => handleFieldChange("niche", e.target.value)}
                        placeholder="Industry"
                      />
                    ) : (
                      lead.niche && <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-muted-foreground">{lead.niche}</span>
                    )}

                    {/* Status — always editable (instant save) */}
                    <CustomSelect 
                      value={lead.status}
                      onChange={(val) => {
                        handleFieldChange("status", val);
                        onUpdateStatus(lead.id, val);
                      }}
                      options={[
                        { value: "New", label: "New" },
                        { value: "Contacted", label: "Contacted" },
                        { value: "Replied", label: "Replied" },
                        { value: "Call Booked", label: "Call Booked" },
                        { value: "Closed", label: "Closed" },
                        { value: "Not Interested", label: "Not Interested" },
                      ]}
                      className="w-36 text-[10px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-xs font-semibold border border-emerald-500/20"
                    >
                      Edit Profile
                    </button>
                  )}
                  <button 
                    onClick={handleCopyLink}
                    className={`p-1.5 rounded-lg transition-all ${copiedLink ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-muted-foreground"}`}
                    title="Copy direct link to this lead"
                  >
                    {copiedLink ? <Check size={18} /> : <Link size={18} />}
                  </button>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Labels */}
              <div className="flex flex-wrap gap-2 items-center relative" ref={dropdownRef}>
                {(lead.labels || []).map((label: any) => (
                  <span
                    key={label.id}
                    className="text-xs px-2 py-1 rounded-md font-medium border border-white/10 flex items-center gap-1"
                    style={{ backgroundColor: `${label.color}20`, color: label.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </span>
                ))}
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground transition-colors flex items-center gap-1"
                >
                  <Plus size={11} /> Label
                </button>

                {showLabelDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-xl p-2 z-[60] shadow-2xl">
                    {globalLabels.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No labels configured.</p>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {globalLabels.map(label => {
                          const isApplied = (lead.labels || []).some((l: any) => l.id === label.id);
                          return (
                            <button
                              key={label.id}
                              onClick={() => toggleLeadLabel(label)}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-left transition-colors"
                            >
                              <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isApplied ? "border-emerald-500 bg-emerald-500" : "border-white/20"}`}>
                                {isApplied && <CheckCircle2 size={9} className="text-white" />}
                              </div>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                              <span className="text-sm">{label.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">

              {/* Activity Log */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-emerald-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Activity Log</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                    {(lead.history?.length || 0)} interactions
                  </span>
                </div>

                {/* Post note */}
                <form onSubmit={handleAddNote} className="relative">
                  <textarea
                    className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 pr-12 text-sm outline-none focus:border-emerald-500 transition-all resize-none placeholder:text-muted-foreground/30"
                    placeholder="Log a call, note a follow-up..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim() || isPostingNote}
                    className="absolute bottom-3 right-3 p-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-lg transition-all active:scale-90"
                  >
                    {isPostingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </form>

                {/* Timeline */}
                <div className="space-y-3 relative before:absolute before:left-[10px] before:top-1 before:bottom-1 before:w-px before:bg-white/8">
                  {(lead.history?.length || 0) === 0 ? (
                    <p className="pl-7 text-sm text-muted-foreground italic">No activity yet.</p>
                  ) : (
                    [...(lead.history || [])].reverse().map((item: any) => (
                      <div key={item.id} className="relative pl-7">
                        <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-[#111] border border-white/10 flex items-center justify-center">
                          <MessageSquare size={9} className="text-emerald-500" />
                        </div>
                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400/80">{item.author}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <button 
                                onClick={() => setNoteToDelete(item.id)}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Info</h3>
                  <div className="flex gap-2">
                    {lead.phone && (
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors">
                        <Phone size={13} />
                      </a>
                    )}
                    {lead.website && (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors">
                        <Globe size={13} />
                      </a>
                    )}
                  </div>
                </div>

                {[
                  { icon: <Phone size={14} />, field: "phone", placeholder: "Phone number" },
                  { icon: <Mail size={14} />, field: "email", placeholder: "Email address" },
                  { icon: <Globe size={14} />, field: "website", placeholder: "Website URL" },
                ].map(({ icon, field, placeholder }) => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-muted-foreground shrink-0">{icon}</span>
                    {isEditing ? (
                      <input
                        className="flex-1 bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                        value={lead[field] || ""}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        placeholder={placeholder}
                      />
                    ) : (
                      <span className="text-sm text-white/80">{lead[field] || "—"}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Company Details */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Details</h3>

                {/* Decision maker */}
                <div className="flex items-center gap-3">
                  <Users size={14} className="text-muted-foreground shrink-0" />
                  {isEditing ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        className="flex-1 bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                        value={lead.decisionMaker || ""}
                        onChange={(e) => handleFieldChange("decisionMaker", e.target.value)}
                        placeholder="Contact name"
                      />
                      <input
                        className="w-32 bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                        value={lead.decisionMakerTitle || ""}
                        onChange={(e) => handleFieldChange("decisionMakerTitle", e.target.value)}
                        placeholder="Title"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-white/80">
                      {lead.decisionMaker || "—"}
                      {lead.decisionMakerTitle && <span className="text-muted-foreground italic ml-1">({lead.decisionMakerTitle})</span>}
                    </span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-muted-foreground shrink-0 mt-1" />
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5 flex-1">
                      <input
                        className="bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                        value={lead.address || ""}
                        onChange={(e) => handleFieldChange("address", e.target.value)}
                        placeholder="Street address"
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                          value={lead.city || ""}
                          onChange={(e) => handleFieldChange("city", e.target.value)}
                          placeholder="City"
                        />
                        <input
                          className="w-28 bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-lg px-2 py-1.5 transition-colors"
                          value={lead.country || ""}
                          onChange={(e) => handleFieldChange("country", e.target.value)}
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-white/80">
                      {[lead.address, lead.city, lead.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  )}
                </div>
              </div>

              {/* Lead Attribution */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Attribution</h3>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Generated by:</span>
                  <span className="text-white font-medium">{lead.userName || "Unknown"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">User Email:</span>
                  <span className="text-white/70">{lead.userEmail || lead.userId?.substring(0, 8) || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Added on:</span>
                  <span className="text-white/70">
                    {lead.createdAt && typeof lead.createdAt === "object" && "toMillis" in lead.createdAt 
                      ? new Date(lead.createdAt.toMillis()).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Pain Point */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Identified Pain Point</h3>
                {isEditing ? (
                  <textarea
                    className="w-full bg-white/5 border border-white/10 outline-none focus:border-red-500 text-sm text-red-100 p-2 rounded-lg resize-none h-20 transition-colors"
                    value={lead.pain || ""}
                    onChange={(e) => handleFieldChange("pain", e.target.value)}
                    placeholder="Describe the pain point..."
                  />
                ) : (
                  <p className="text-sm text-red-100/80 leading-relaxed">{lead.pain || "No pain points identified."}</p>
                )}
              </div>
            </div>

            {/* ── Save Bar (only in edit mode) ── */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ y: 80 }}
                  animate={{ y: 0 }}
                  exit={{ y: 80 }}
                  className="absolute bottom-0 left-0 w-full p-5 bg-black/90 backdrop-blur-md border-t border-white/10 flex gap-3"
                >
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-5 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-colors border border-white/10"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      <CustomModal 
        isOpen={!!noteToDelete} 
        onClose={() => setNoteToDelete(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note?"
        variant="danger"
        footer={(
          <>
            <button onClick={() => setNoteToDelete(null)} className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleDeleteNote} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">Delete Note</button>
          </>
        )}
      />
    </AnimatePresence>
  );
}
