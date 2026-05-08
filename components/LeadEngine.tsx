"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Globe, MapPin, Target, CheckCircle2, Tag, Bookmark, Trash2, History, X, Mail, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, collection, addDoc, query as fsQuery, where, onSnapshot, deleteDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { CustomSelect } from "./ui/CustomSelect";
import { CustomModal } from "./ui/CustomModal";
import { Lead, LabelRecord, SavedSearch, SearchMeta } from "@/types/lead";

interface LeadEngineProps {
  customLabels: LabelRecord[];
}

export function LeadEngine({ customLabels }: LeadEngineProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [scope, setScope] = useState("Local");
  const [offer, setOffer] = useState("");
  const [count, setCount] = useState(10);
  const [selectedLabelId, setSelectedLabelId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Partial<Lead>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: "success" | "error" | "info" }[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  // Modal states
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");
  const [deleteSearchId, setDeleteSearchId] = useState<string | null>(null);

  const addNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };



  // Fetch Saved Searches
  useEffect(() => {
    if (!user) return;
    const q = fsQuery(collection(db, "saved_searches"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSavedSearches(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedSearch)));
    });
    return () => unsubscribe();
  }, [user]);

  const saveCurrentSearch = async () => {
    if (!saveModalName.trim()) return;
    setIsSavingSearch(true);
    try {
      await addDoc(collection(db, "saved_searches"), {
        userId: user!.uid,
        name: saveModalName.trim(),
        params: { query, location, country, scope, offer, count, selectedLabelId },
        createdAt: serverTimestamp()
      });
      addNotification("Search configuration bookmarked!");
      setSaveModalOpen(false);
      setSaveModalName("");
    } catch (err) {
      console.error("Failed to save search", err);
      addNotification("Failed to save search.", "error");
    } finally {
      setIsSavingSearch(false);
    }
  };

  const loadSearch = (search: SavedSearch) => {
    const p = search.params;
    setQuery(p.query || "");
    setLocation(p.location || "");
    setCountry(p.country || "Egypt");
    setScope(p.scope || "Local");
    setOffer(p.offer || "");
    setCount(p.count || 10);
    setSelectedLabelId(p.selectedLabelId || "");
  };

  const handleDeleteSavedSearch = async () => {
    if (!deleteSearchId) return;
    try {
      await deleteDoc(doc(db, "saved_searches", deleteSearchId));
      addNotification("Saved search deleted.");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSearchId(null);
    }
  };

  const handleAcceptLead = async (lead: Partial<Lead>) => {
    if (!user) return;
    setIsImporting(lead.tempId || null);
    try {
      await addDoc(collection(db, "leads"), {
        ...lead,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split("@")[0],
        labels: selectedLabelId ? [selectedLabelId] : [],
        status: "New",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setResults(prev => prev.filter(l => l.tempId !== lead.tempId));
      addNotification(`Accepted: ${lead.name}`);
    } catch (err) {
      console.error("Failed to accept lead", err);
      addNotification("Failed to save lead.", "error");
    } finally {
      setIsImporting(null);
    }
  };

  const handleImportAll = async () => {
    if (!user || results.length === 0) return;
    setIsBulkImporting(true);
    try {
      const batch = writeBatch(db);
      const leadsRef = collection(db, "leads");

      results.forEach(lead => {
        const newDocRef = doc(leadsRef);
        batch.set(newDocRef, {
          ...lead,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || user.email?.split("@")[0],
          labels: selectedLabelId ? [selectedLabelId] : [],
          status: "New",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      const importedCount = results.length;
      setResults([]);
      addNotification(`Imported ${importedCount} leads successfully!`);
    } catch (err) {
      console.error("Bulk import failed", err);
      addNotification("Bulk import failed.", "error");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location || !offer) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query, location, country, scope, offer, count, idToken, labelId: selectedLabelId || null
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to fetch leads");

      const allLeads: Partial<Lead>[] = data.leads || [];
      const newLeads = allLeads.filter((l) => !l.alreadyInCRM);
      const duplicateCount = allLeads.length - newLeads.length;

      setResults(newLeads);
      setSearchMeta(data.meta || null);

      if (duplicateCount > 0) {
        addNotification(`Filtered out ${duplicateCount} leads already in your CRM.`, "info");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Target className="text-emerald-500" /> Lead Engine
            </h1>
            <p className="text-muted-foreground">Find real businesses globally using Gemini 2.0 &amp; Tavily Search.</p>
          </div>
          
          {/* Removed dead "View Search History" button — was onClick={() => {}} */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSearch} className="glass p-6 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Niche / Industry</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Dental Clinics"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Offer / Pitch</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      placeholder="e.g. AI Voice Receptionist"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Location (City/State)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Cairo"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <CustomSelect
                    value={country}
                    onChange={setCountry}
                    options={[
                      { value: "Egypt", label: "Egypt" },
                      { value: "USA", label: "United States" },
                      { value: "UK", label: "United Kingdom" },
                      { value: "UAE", label: "United Arab Emirates" },
                      { value: "Saudi Arabia", label: "Saudi Arabia" },
                      { value: "Australia", label: "Australia" },
                    ]}
                    icon={<Globe size={14} />}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Search Scope</label>
                  <CustomSelect
                    value={scope}
                    onChange={setScope}
                    options={[
                      { value: "Local", label: "Local (City only)" },
                      { value: "Global", label: "Global (Entire country)" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Auto-Assign Label</label>
                  <CustomSelect
                    value={selectedLabelId}
                    onChange={setSelectedLabelId}
                    options={[
                      { value: "", label: "No Label" },
                      ...customLabels.map(l => ({ value: l.id, label: l.name }))
                    ]}
                    icon={<Tag size={14} />}
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-sm font-medium text-muted-foreground">Lead Count: {count}</label>
                  <input
                    type="range"
                    min="5" max="20" step="5"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-3"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Extracting Leads...</>
                  ) : (
                    <><Search size={20} /> Find Leads</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { if (query && location) setSaveModalOpen(true); }}
                  disabled={isSavingSearch || !query}
                  className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-colors text-muted-foreground hover:text-emerald-400"
                  title="Save this search configuration"
                >
                  {isSavingSearch ? <Loader2 size={20} className="animate-spin" /> : <Bookmark size={20} />}
                </button>
              </div>
            </form>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                Error: {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" />
                    <div>
                      <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Review Found Leads</h2>
                      <p className="text-xs text-muted-foreground">
                        {results.length} potentials found
                        {searchMeta && ` · ${searchMeta.totalRawResults} scanned · ${searchMeta.passesCompleted}/3 passes`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportAll}
                      disabled={isBulkImporting}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isBulkImporting ? "Importing..." : `Import All ${results.length}`}
                    </button>
                    <button
                      onClick={() => setResults([])}
                      className="px-4 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 rounded-xl text-xs font-medium transition-all"
                    >
                      Discard All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((lead, i) => (
                    <div key={lead.tempId || i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start justify-between group transition-all hover:border-emerald-500/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">{lead.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.niche} · {lead.city}</p>
                        
                        {/* Star Rating */}
                        <div className="flex items-center gap-0.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={10} className={s <= (lead.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                          ))}
                          <span className="text-[9px] text-muted-foreground ml-1">{lead.rating || 0}/5</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {lead.phone && lead.phone !== "[No Phone Found]" && <span className="bg-white/5 text-muted-foreground px-2 py-1 rounded text-[10px]">📞 {lead.phone}</span>}
                          {lead.email && (
                            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                              <Mail size={9} /> {lead.email}
                            </span>
                          )}
                          {lead.website && lead.website !== "[No Link Found]" && (
                            <a 
                              href={lead.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                            >
                              {lead.websiteLabel || "🌐 Website"}
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                          onClick={() => handleAcceptLead(lead)}
                          disabled={isImporting === lead.tempId}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-90"
                          title="Accept &amp; Add to CRM"
                        >
                          {isImporting === lead.tempId ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                        <button
                          onClick={() => setResults(prev => prev.filter(l => l.tempId !== lead.tempId))}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-90"
                          title="Reject &amp; Discard"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Bookmark size={14} className="text-emerald-500" /> Saved Library
              </h3>
              
              {savedSearches.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark size={32} className="mx-auto text-white/10 mb-2" />
                  <p className="text-xs text-muted-foreground">No saved searches yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedSearches.map(search => (
                    <button
                      key={search.id}
                      onClick={() => loadSearch(search)}
                      className="w-full group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-left transition-all"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-white truncate pr-4">{search.name}</span>
                        <div
                          onClick={(e) => { e.stopPropagation(); setDeleteSearchId(search.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <Target size={10} /> {search.params.query}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <MapPin size={10} /> {search.params.location}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass p-6 rounded-2xl bg-emerald-500/5 border-emerald-500/20">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Search Tip</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use specific niches like &quot;Eco-friendly cafes&quot; instead of just &quot;Food&quot; for better target accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Search Modal */}
      <CustomModal
        isOpen={saveModalOpen}
        onClose={() => { setSaveModalOpen(false); setSaveModalName(""); }}
        title="Save Search Configuration"
        description="Give this search a name so you can quickly reload it later."
        footer={(
          <>
            <button onClick={() => { setSaveModalOpen(false); setSaveModalName(""); }} className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
            <button onClick={saveCurrentSearch} disabled={!saveModalName.trim()} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">Save</button>
          </>
        )}
      >
        <input
          type="text"
          placeholder="e.g. Dentists in Maadi"
          value={saveModalName}
          onChange={(e) => setSaveModalName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm transition-all"
          autoFocus
        />
      </CustomModal>

      {/* Delete Search Modal */}
      <CustomModal
        isOpen={!!deleteSearchId}
        onClose={() => setDeleteSearchId(null)}
        title="Delete Saved Search"
        description="Are you sure you want to delete this saved search configuration?"
        variant="danger"
        footer={(
          <>
            <button onClick={() => setDeleteSearchId(null)} className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleDeleteSavedSearch} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">Delete</button>
          </>
        )}
      />

      {/* Notifications Portal */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        {notifications.map(n => (
          <div 
            key={n.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300 ${
              n.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" :
              n.type === "error" ? "bg-red-500/90 border-red-400 text-white" :
              "bg-blue-500/90 border-blue-400 text-white"
            }`}
          >
            {n.type === "success" && <CheckCircle2 size={18} />}
            {n.type === "error" && <X size={18} />}
            <span className="text-sm font-semibold">{n.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
