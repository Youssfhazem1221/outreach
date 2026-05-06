"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { ShieldAlert, Users, Key, Tags, Save, Plus, Trash2, Loader2, ChevronDown } from "lucide-react";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";

type UserRecord = {
  uid: string;
  email?: string;
  displayName?: string;
  creationTime?: string;
  lastSignInTime?: string;
  role: string;
};

type LabelRecord = { id: string; name: string; color: string };

export type AIProvider = {
  id: string;
  name: string;
  providerType: "openrouter" | "groq" | "openai" | "anthropic" | "google";
  apiKey: string;
  model: string;
  isActive: boolean;
};

function ProviderList({ 
  providers, 
  setProviders 
}: { 
  providers: AIProvider[], 
  setProviders: (p: AIProvider[]) => void 
}) {
  const addProvider = () => {
    setProviders([...providers, {
      id: Date.now().toString(),
      name: "New Provider",
      providerType: "openrouter",
      apiKey: "",
      model: "",
      isActive: true
    }]);
  };

  const updateProvider = (id: string, field: keyof AIProvider, value: any) => {
    setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProvider = (id: string) => {
    setProviders(providers.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-4">
      {providers.map((p, index) => (
        <div key={p.id} className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-3 relative group">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded">#{index + 1} Priority</span>
               <input 
                 type="text" 
                 value={p.name} 
                 onChange={(e) => updateProvider(p.id, "name", e.target.value)} 
                 className="bg-transparent border-none outline-none font-medium text-white placeholder-white/30"
                 placeholder="Provider Name"
               />
             </div>
             <div className="flex items-center gap-2">
               <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                 <input type="checkbox" checked={p.isActive} onChange={(e) => updateProvider(p.id, "isActive", e.target.checked)} className="rounded bg-black/40 border-white/10" />
                 Active
               </label>
               <button type="button" onClick={() => removeProvider(p.id)} className="text-muted-foreground hover:text-red-400 p-1">
                 <Trash2 size={16} />
               </button>
             </div>
          </div>
          <div className="flex gap-2 mb-1">
            <button 
              type="button" 
              disabled={index === 0}
              onClick={() => {
                const newArr = [...providers];
                [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
                setProviders(newArr);
              }}
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
            >
              ↑ Move Up
            </button>
            <button 
              type="button" 
              disabled={index === providers.length - 1}
              onClick={() => {
                const newArr = [...providers];
                [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
                setProviders(newArr);
              }}
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
            >
              ↓ Move Down
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <select 
                value={p.providerType} 
                onChange={(e) => updateProvider(p.id, "providerType", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google (Gemini)</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key</label>
              <input 
                type="password" 
                value={p.apiKey} 
                onChange={(e) => updateProvider(p.id, "apiKey", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-mono"
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Model</label>
              <input 
                type="text" 
                value={p.model} 
                onChange={(e) => updateProvider(p.id, "model", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-mono"
                placeholder="e.g. openai/gpt-4o"
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={addProvider} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-muted-foreground hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
        <Plus size={16} /> Add AI Provider
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<"personal" | "users" | "apis" | "labels">("personal");

  // User Management State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // API State
  const [tavilyKey, setTavilyKey] = useState("");
  const [systemProviders, setSystemProviders] = useState<AIProvider[]>([]);
  const [isSavingApi, setIsSavingApi] = useState(false);
  
  // Personal Settings State
  const [personalTavily, setPersonalTavily] = useState("");
  const [personalProviders, setPersonalProviders] = useState<AIProvider[]>([]);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Labels State
  const [labels, setLabels] = useState<LabelRecord[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#10b981");

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsers([]); // Clear current list to show loading
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("User Fetch Error:", data.error);
        if (res.status === 403) alert("Your Admin token is stale. Please Log Out and Log Back In to see the user list.");
        return;
      }
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      // Global Settings (Admin Only)
      if (role === "admin") {
        const apiDoc = await getDoc(doc(db, "settings", "api_keys"));
        if (apiDoc.exists()) {
          setTavilyKey(apiDoc.data().tavily || "");
          setSystemProviders(apiDoc.data().ai_providers || []);
        }

        const labelDoc = await getDoc(doc(db, "settings", "labels"));
        if (labelDoc.exists()) {
          setLabels(labelDoc.data().items || []);
        }
      }

      // Personal Settings (All Users)
      if (auth.currentUser) {
        const personalDoc = await getDoc(doc(db, "users", auth.currentUser.uid, "settings", "api_keys"));
        if (personalDoc.exists()) {
          setPersonalTavily(personalDoc.data().tavily || "");
          setPersonalProviders(personalDoc.data().ai_providers || []);
        }
      }
    } catch {
      console.error("Failed to load settings");
    }
  };

  // Fetch Initial Data
  useEffect(() => {
    if (role !== "admin") return;
    void (async () => {
      await Promise.all([fetchUsers(), fetchSettings()]);
    })();
  }, [role]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch("/api/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: uid, newRole, idToken }),
      });
      // Optimistic update
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch {
      alert("Failed to change role");
    }
  };

  const handleSaveApis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApi(true);
    try {
      await setDoc(doc(db, "settings", "api_keys"), {
        tavily: tavilyKey,
        ai_providers: systemProviders
      }, { merge: true });
      alert("System API keys saved successfully");
    } catch {
      alert("Failed to save system API keys");
    } finally {
      setIsSavingApi(false);
    }
  };

  const handleSavePersonalApis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSavingPersonal(true);
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "api_keys"), {
        tavily: personalTavily,
        ai_providers: personalProviders
      }, { merge: true });
      alert("Personal API keys saved successfully");
    } catch {
      alert("Failed to save personal keys");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    
    const newLabel = {
      id: Date.now().toString(),
      name: newLabelName.trim(),
      color: newLabelColor
    };
    
    const updatedLabels = [...labels, newLabel];
    setLabels(updatedLabels);
    setNewLabelName("");
    
    await setDoc(doc(db, "settings", "labels"), { items: updatedLabels });
  };

  const handleDeleteLabel = async (id: string) => {
    const updatedLabels = labels.filter(l => l.id !== id);
    setLabels(updatedLabels);
    await setDoc(doc(db, "settings", "labels"), { items: updatedLabels });
  };

  // Removed global access denial - users can access personal tab
  const isAdmin = role === "admin";

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Settings</h1>
          <p className="text-muted-foreground">Manage users, API fallbacks, and global taxonomy.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-6">
          <button 
            onClick={() => setActiveTab("personal")}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "personal" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
          >
            <Key size={16} /> Personal API Keys
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab("users")}
                className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "users" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                <Users size={16} /> User Management
              </button>
              <button 
                onClick={() => setActiveTab("apis")}
                className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "apis" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                <ShieldAlert size={16} /> System Backup APIs
              </button>
              <button 
                onClick={() => setActiveTab("labels")}
                className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === "labels" ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                <Tags size={16} /> Custom Labels
              </button>
            </>
          )}
        </div>

        {/* Personal API Tab */}
        {activeTab === "personal" && (
          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Your Personal Keys</h3>
              <p className="text-sm text-muted-foreground">
                These keys are private to you and will be used for your searches and generations.
              </p>
            </div>
            <form onSubmit={handleSavePersonalApis} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Personal Tavily API Key</label>
                <input 
                  type="password" 
                  value={personalTavily} 
                  onChange={(e) => setPersonalTavily(e.target.value)}
                  placeholder="tvly-..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Personal AI Providers (Outreach Gen)</label>
                <ProviderList providers={personalProviders} setProviders={setPersonalProviders} />
              </div>
              <button 
                type="submit" 
                disabled={isSavingPersonal}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Save size={16} /> {isSavingPersonal ? "Saving..." : "Save My Keys"}
              </button>
            </form>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/40 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 flex items-center gap-4">
                    User
                    <button 
                      onClick={fetchUsers}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors lowercase font-normal"
                    >
                      (refresh)
                    </button>
                  </th>
                  <th className="px-6 py-4">Signed Up</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoadingUsers ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{u.displayName || "Unknown User"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {u.creationTime ? new Date(u.creationTime).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group w-48">
                          <select 
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 pr-8 py-1.5 outline-none focus:border-emerald-500 appearance-none cursor-pointer hover:bg-white/5 transition-all"
                          >
                            <option value="admin">Admin</option>
                            <option value="user">User (Full CRM Access)</option>
                            <option value="viewer">Viewer (Read-only)</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* API Tab */}
        {activeTab === "apis" && (
          <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              If your primary API keys in Vercel hit their limits, the system will automatically fall back to these keys.
            </p>
            <form onSubmit={handleSaveApis} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Fallback Tavily API Key</label>
                <input 
                  type="password" 
                  value={tavilyKey} 
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Fallback AI Providers (Outreach Gen)</label>
                <ProviderList providers={systemProviders} setProviders={setSystemProviders} />
              </div>
              <button 
                type="submit" 
                disabled={isSavingApi}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Save size={16} /> {isSavingApi ? "Saving..." : "Save Fallback Keys"}
              </button>
            </form>
          </div>
        )}

        {/* Labels Tab */}
        {activeTab === "labels" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl border border-white/10 h-fit">
              <h3 className="font-semibold mb-4">Create New Label</h3>
              <form onSubmit={handleAddLabel} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Label Name</label>
                  <input 
                    type="text" 
                    value={newLabelName} 
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="e.g. High Priority" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Color Hex</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={newLabelColor} 
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-black/40 border border-white/10"
                    />
                    <input 
                      type="text" 
                      value={newLabelColor} 
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={16} /> Add Label
                </button>
              </form>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10">
              <h3 className="font-semibold mb-4">Active Labels</h3>
              {labels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No custom labels created yet.</p>
              ) : (
                <div className="space-y-3">
                  {labels.map(label => (
                    <div key={label.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                        <span className="font-medium text-sm">{label.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteLabel(label.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
