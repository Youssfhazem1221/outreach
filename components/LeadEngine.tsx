"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Globe, MapPin, Target, CheckCircle2, Tag, ChevronDown, Bookmark, Trash2, History, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, collection, addDoc, query as fsQuery, where, onSnapshot, deleteDoc, serverTimestamp } from "firebase/firestore";

export function LeadEngine() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [scope, setScope] = useState("Local");
  const [offer, setOffer] = useState("");
  const [count, setCount] = useState(10);
  const [selectedLabelId, setSelectedLabelId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<{ id: string, name: string, color: string }[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null); // To track individual imports
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: "success" | "error" | "info" }[]>([]);

  const addNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labelDoc = await getDoc(doc(db, "settings", "labels"));
        if (labelDoc.exists()) {
          setLabels(labelDoc.data().items || []);
        }
      } catch (err) {
        console.error("Failed to load labels", err);
      }
    };
    fetchLabels();
  }, []);

  // Fetch Saved Searches
  useEffect(() => {
    if (!user) return;
    const q = fsQuery(collection(db, "saved_searches"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSavedSearches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const saveCurrentSearch = async () => {
    if (!query || !location || !user) return;
    const name = prompt("Enter a name for this search configuration:");
    if (!name) return;

    setIsSavingSearch(true);
    try {
      await addDoc(collection(db, "saved_searches"), {
        userId: user.uid,
        name,
        params: {
          query,
          location,
          country,
          scope,
          offer,
          count,
          selectedLabelId
        },
        createdAt: serverTimestamp()
      });
      addNotification("Search configuration bookmarked!");
    } catch (err) {
      console.error("Failed to save search", err);
      addNotification("Failed to save search.", "error");
    } finally {
      setIsSavingSearch(false);
    }
  };

  const loadSearch = (search: any) => {
    const p = search.params;
    setQuery(p.query || "");
    setLocation(p.location || "");
    setCountry(p.country || "Egypt");
    setScope(p.scope || "Local");
    setOffer(p.offer || "");
    setCount(p.count || 10);
    setSelectedLabelId(p.selectedLabelId || "");
  };

  const deleteSavedSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this saved search?")) return;
    try {
      await deleteDoc(doc(db, "saved_searches", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptLead = async (lead: any) => {
    if (!user) return;
    setIsImporting(lead.tempId);
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "leads"), {
        ...lead,
        userId: user.uid,
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
      const { writeBatch, collection, doc, serverTimestamp } = await import("firebase/firestore");
      const batch = writeBatch(db);
      const leadsRef = collection(db, "leads");

      results.forEach(lead => {
        const newDocRef = doc(leadsRef);
        batch.set(newDocRef, {
          ...lead,
          userId: user.uid,
          labels: selectedLabelId ? [selectedLabelId] : [],
          status: "New",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      const count = results.length;
      setResults([]);
      addNotification(`Imported ${count} leads successfully!`);
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

      setResults(data.leads || []);
    } catch (err: any) {
      setError(err.message);
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
            <p className="text-muted-foreground">Find real businesses globally using Gemini 2.0 & Tavily Search.</p>
          </div>
          
          <button
            onClick={() => {}}
            className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition-all"
          >
            <History size={14} /> View Search History
          </button>
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
                  <div className="relative group">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer hover:bg-white/5"
                    >
                      <option value="Egypt">Egypt</option>
                      <option value="USA">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="UAE">United Arab Emirates</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Australia">Australia</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Search Scope</label>
                  <div className="relative group">
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pr-10 py-2.5 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer hover:bg-white/5"
                    >
                      <option value="Local">Local (City only)</option>
                      <option value="Global">Global (Entire country)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Auto-Assign Label</label>
                  <div className="relative group">
                    <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                    <select
                      value={selectedLabelId}
                      onChange={(e) => setSelectedLabelId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer hover:bg-white/5"
                    >
                      <option value="">No Label</option>
                      {labels.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
                  </div>
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
                  onClick={saveCurrentSearch}
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
                      <p className="text-xs text-muted-foreground">{results.length} potentials waiting for approval.</p>
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
                    <div key={lead.tempId || i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{lead.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.niche} • {lead.city}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {lead.phone && <span className="bg-white/5 text-muted-foreground px-2 py-1 rounded text-[10px]">📞 {lead.phone}</span>}
                          {lead.website && (
                            <a 
                              href={lead.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                            >
                              {lead.websiteLabel || "🌐 Website"}
                            </a>
                          )}
                          <a 
                            href={lead.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white/5 hover:bg-white/10 text-muted-foreground px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                            title="Verify original search source"
                          >
                            Source Link
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAcceptLead(lead)}
                          disabled={isImporting === lead.tempId}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-90"
                          title="Accept & Add to CRM"
                        >
                          {isImporting === lead.tempId ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                        <button
                          onClick={() => setResults(prev => prev.filter(l => l.tempId !== lead.tempId))}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-90"
                          title="Reject & Discard"
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
                          onClick={(e) => deleteSavedSearch(e, search.id)}
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
                Use specific niches like "Eco-friendly cafes" instead of just "Food" for better target accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

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
