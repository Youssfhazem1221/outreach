"use client";

import { useState } from "react";
import { Search, Loader2, Globe, MapPin, Building, Target, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebaseClient";

export function LeadEngine() {
  const { user } = useAuth();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [scope, setScope] = useState("Local");
  const [companySize, setCompanySize] = useState("1-10");
  const [offer, setOffer] = useState("");
  const [count, setCount] = useState(10);
  
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location || !offer) return;
    
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch("/api/find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche, location, country, scope, companySize, offer, count, idToken
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
        
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Target className="text-emerald-500" /> Lead Engine
          </h1>
          <p className="text-muted-foreground">Find real businesses globally using Gemini 2.0 Search Grounding.</p>
        </div>

        <form onSubmit={handleSearch} className="glass p-6 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Niche / Industry</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={niche} 
                  onChange={(e) => setNiche(e.target.value)}
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
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="Egypt">Egypt</option>
                  <option value="USA">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="UAE">United Arab Emirates</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Search Scope</label>
              <select 
                value={scope} 
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Local">Local (City only)</option>
                <option value="Global">Global (Entire country)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Size</label>
              <select 
                value={companySize} 
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="1-10">1-10 Employees</option>
                <option value="11-50">11-50 Employees</option>
                <option value="51-200">51-200 Employees</option>
                <option value="200+">200+ Employees</option>
              </select>
            </div>

            <div className="space-y-2">
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

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4"
          >
            {isLoading ? (
              <><Loader2 className="animate-spin" size={20} /> Extracting Leads via Gemini...</>
            ) : (
              <><Search size={20} /> Find Leads</>
            )}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            Error: {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Successfully Imported
              </h2>
              <span className="text-sm bg-white/10 px-3 py-1 rounded-full">{results.length} leads added to pipeline</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((lead, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.niche} • {lead.city}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      {lead.phone && <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">📞 {lead.phone}</span>}
                      {lead.hasWebsite && <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded">🌐 Website</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground pt-4">Check the Pipeline tab to manage these new leads and generate outreach.</p>
          </div>
        )}
      </div>
    </div>
  );
}
