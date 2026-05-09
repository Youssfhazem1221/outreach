"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Users, Key, Tags, Save, Plus, Trash2, Loader2, ChevronDown, MoveUp, MoveDown } from "lucide-react";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNotification } from "@/contexts/NotificationContext";
import { AIProvider, UserRecord, LabelRecord, ProviderSettings } from "@/types/lead";

// ─── Sub-Component: ProviderList ─────────────────────────────────────────────

interface ProviderListProps {
  providers: AIProvider[];
  onChange: (providers: AIProvider[]) => void;
}

function ProviderList({ providers, onChange }: ProviderListProps) {
  const addProvider = () => {
    onChange([...providers, {
      id: Math.random().toString(36).substring(7),
      name: "New Provider",
      providerType: "openrouter",
      apiKey: "",
      model: "",
      isActive: true
    }]);
  };

  const updateProvider = (id: string, updates: Partial<AIProvider>) => {
    onChange(providers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeProvider = (id: string) => {
    onChange(providers.filter(p => p.id !== id));
  };

  const moveProvider = (index: number, direction: 'up' | 'down') => {
    const newArr = [...providers];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= providers.length) return;
    [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
    onChange(newArr);
  };

  return (
    <div className="space-y-4">
      {providers.map((p, index) => (
        <div key={p.id} className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4 relative group hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="flex flex-col gap-1">
                 <button 
                   type="button" 
                   disabled={index === 0}
                   onClick={() => moveProvider(index, 'up')}
                   className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                 >
                   <MoveUp size={12} />
                 </button>
                 <button 
                   type="button" 
                   disabled={index === providers.length - 1}
                   onClick={() => moveProvider(index, 'down')}
                   className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                 >
                   <MoveDown size={12} />
                 </button>
               </div>
               <div className="h-8 w-px bg-white/10 mx-1" />
               <input 
                 type="text" 
                 value={p.name} 
                 onChange={(e) => updateProvider(p.id, { name: e.target.value })} 
                 className="bg-transparent border-none outline-none font-bold text-white placeholder-white/30 text-sm"
                 placeholder="Provider Name (e.g. My OpenAI)"
               />
             </div>
             <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors">
                 <input 
                   type="checkbox" 
                   checked={p.isActive} 
                   onChange={(e) => updateProvider(p.id, { isActive: e.target.checked })} 
                   className="rounded bg-black/40 border-white/20 text-emerald-500 focus:ring-emerald-500" 
                 />
                 Active
               </label>
               <button 
                 type="button" 
                 onClick={() => removeProvider(p.id)} 
                 className="text-muted-foreground hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
               >
                 <Trash2 size={16} />
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Type</label>
              <div className="relative">
                <select 
                  value={p.providerType} 
                  onChange={(e) => updateProvider(p.id, { providerType: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm appearance-none cursor-pointer"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">API Key</label>
              <input 
                type="password" 
                value={p.apiKey} 
                onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-mono"
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Model ID</label>
              <input 
                type="text" 
                value={p.model} 
                onChange={(e) => updateProvider(p.id, { model: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-mono"
                placeholder="e.g. gpt-4o"
              />
            </div>
          </div>
        </div>
      ))}
      <button 
        type="button" 
        onClick={addProvider} 
        className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 text-sm font-bold group"
      >
        <Plus size={18} className="group-hover:scale-110 transition-transform" /> Add AI Provider
      </button>
    </div>
  );
}

// ─── Main Component: SettingsPanel ───────────────────────────────────────────

export function SettingsPanel() {
  const { role } = useAuth();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<"personal" | "users" | "apis" | "labels">("personal");

  // Grouped States
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [systemSettings, setSystemSettings] = useState<ProviderSettings>({
    tavily: "",
    ai_providers: []
  });
  const [personalSettings, setPersonalSettings] = useState<ProviderSettings>({
    tavily: "",
    ai_providers: []
  });
  const [labels, setLabels] = useState<LabelRecord[]>([]);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: "", color: "#10b981" });

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) notify("Admin session expired. Please re-login.", "error");
        return;
      }
      if (data.users) setUsers(data.users);
    } catch (err) {
      notify("Failed to load users", "error");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [notify]);

  const fetchSettings = useCallback(async () => {
    try {
      // Global Settings (Admin Only)
      if (role === "admin") {
        const [apiDoc, labelDoc] = await Promise.all([
          getDoc(doc(db, "settings", "api_keys")),
          getDoc(doc(db, "settings", "labels"))
        ]);
        
        if (apiDoc.exists()) {
          setSystemSettings({
            tavily: apiDoc.data().tavily || "",
            ai_providers: apiDoc.data().ai_providers || []
          });
        }
        if (labelDoc.exists()) {
          setLabels(labelDoc.data().items || []);
        }
      }

      // Personal Settings (All Users)
      if (auth.currentUser) {
        const personalDoc = await getDoc(doc(db, "users", auth.currentUser.uid, "settings", "api_keys"));
        if (personalDoc.exists()) {
          setPersonalSettings({
            tavily: personalDoc.data().tavily || "",
            ai_providers: personalDoc.data().ai_providers || []
          });
        }
      }
    } catch {
      notify("Failed to sync settings", "error");
    }
  }, [role, notify]);

  useEffect(() => {
    fetchSettings();
    if (role === "admin") fetchUsers();
  }, [role, fetchSettings, fetchUsers]);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch("/api/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: uid, newRole, idToken }),
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      notify(`Role updated for user`);
    } catch {
      notify("Failed to update role", "error");
    }
  };

  const saveSettings = async (type: 'personal' | 'system' | 'labels') => {
    setIsSaving(true);
    try {
      if (type === 'system') {
        await setDoc(doc(db, "settings", "api_keys"), systemSettings, { merge: true });
        notify("System backup keys updated");
      } else if (type === 'personal') {
        if (!auth.currentUser) return;
        await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "api_keys"), personalSettings, { merge: true });
        notify("Your personal API keys saved");
      } else if (type === 'labels') {
        await setDoc(doc(db, "settings", "labels"), { items: labels });
        notify("Custom labels configuration saved");
      }
    } catch {
      notify(`Failed to save ${type} settings`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const addLabel = () => {
    if (!newLabel.name.trim()) return;
    setLabels(prev => [...prev, {
      id: Date.now().toString(),
      name: newLabel.name.trim(),
      color: newLabel.color
    }]);
    setNewLabel({ ...newLabel, name: "" });
  };

  const deleteLabel = (id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id));
  };

  const isAdmin = role === "admin";

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Key className="text-emerald-500" /> System Settings
          </h1>
          <p className="text-muted-foreground text-sm">Configure your personal experience and global system fallback rules.</p>
        </header>

        {/* Tab Navigation */}
        <nav className="flex border-b border-white/10 gap-8">
          {[
            { id: "personal", label: "Personal Keys", icon: <Key size={16} />, adminOnly: false },
            { id: "users", label: "User Management", icon: <Users size={16} />, adminOnly: true },
            { id: "apis", label: "System Backups", icon: <ShieldAlert size={16} />, adminOnly: true },
            { id: "labels", label: "Taxonomy", icon: <Tags size={16} />, adminOnly: true },
          ].map(tab => (
            (!tab.adminOnly || isAdmin) && (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"}`}
              >
                {tab.icon} {tab.label}
              </button>
            )
          ))}
        </nav>

        {/* Personal API Tab */}
        {activeTab === "personal" && (
          <section className="glass p-8 rounded-3xl border border-white/10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <h3 className="text-xl font-bold mb-2">Private Environment</h3>
              <p className="text-sm text-muted-foreground">
                These keys are stored securely in your user profile. They override system defaults to ensure your quotas are never shared.
              </p>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Tavily API Key</label>
                <input 
                  type="password" 
                  value={personalSettings.tavily} 
                  onChange={(e) => setPersonalSettings({ ...personalSettings, tavily: e.target.value })}
                  placeholder="tvly-..." 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 font-mono transition-all"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal LLM Providers (Outreach)</label>
                <ProviderList 
                  providers={personalSettings.ai_providers} 
                  onChange={(p) => setPersonalSettings({ ...personalSettings, ai_providers: p })} 
                />
              </div>
              <button 
                onClick={() => saveSettings('personal')} 
                disabled={isSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Update Personal Configuration
              </button>
            </div>
          </section>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <section className="glass rounded-3xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="px-8 py-5 flex items-center gap-4">
                    Identity
                    <button onClick={fetchUsers} className="text-emerald-400 hover:text-white transition-colors">refresh</button>
                  </th>
                  <th className="px-8 py-5">Joined</th>
                  <th className="px-8 py-5">Access Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoadingUsers ? (
                  <tr><td colSpan={3} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-20 text-center text-muted-foreground">No users found.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-sm text-white">{u.displayName || "Anonymous User"}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-8 py-5 text-sm text-muted-foreground">
                        {u.creationTime ? new Date(u.creationTime).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-8 py-5">
                        <div className="relative group w-full max-w-[200px]">
                          <select 
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500 appearance-none cursor-pointer hover:bg-white/10 transition-all font-medium"
                          >
                            <option value="admin">Administrator</option>
                            <option value="user">Verified User</option>
                            <option value="viewer">Guest / Viewer</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* API Tab */}
        {activeTab === "apis" && (
          <section className="glass p-8 rounded-3xl border border-white/10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <header className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                <strong className="text-amber-400 block mb-1">System Fallback Configuration</strong>
                These keys are used globally when a user has not configured their own keys, or when primary environment variables are exhausted.
              </p>
            </header>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Tavily Key</label>
                <input 
                  type="password" 
                  value={systemSettings.tavily} 
                  onChange={(e) => setSystemSettings({ ...systemSettings, tavily: e.target.value })}
                  placeholder="tvly-..." 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 font-mono transition-all"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global AI Providers</label>
                <ProviderList 
                  providers={systemSettings.ai_providers} 
                  onChange={(p) => setSystemSettings({ ...systemSettings, ai_providers: p })} 
                />
              </div>
              <button 
                onClick={() => saveSettings('system')} 
                disabled={isSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Deploy System Update
              </button>
            </div>
          </section>
        )}

        {/* Labels Tab */}
        {activeTab === "labels" && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="glass p-8 rounded-3xl border border-white/10 h-fit space-y-6">
              <h3 className="text-xl font-bold">New Taxonomy</h3>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Label Name</label>
                  <input 
                    type="text" 
                    value={newLabel.name} 
                    onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                    placeholder="e.g. Verified Lead" 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brand Color</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={newLabel.color} 
                      onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                      className="w-14 h-14 rounded-2xl cursor-pointer bg-black/40 border border-white/10 p-1"
                    />
                    <input 
                      type="text" 
                      value={newLabel.color} 
                      onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 font-mono text-sm uppercase transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={addLabel}
                  className="w-full bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group"
                >
                  <Plus size={20} className="group-hover:scale-110 transition-transform" /> Add to Pipeline
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/10 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Active Labels</h3>
                {labels.length > 0 && (
                  <button 
                    onClick={() => saveSettings('labels')}
                    className="text-xs font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg"
                  >
                    <Save size={14} /> Commit Changes
                  </button>
                )}
              </div>
              
              {labels.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                  <Tags size={48} className="mb-4" />
                  <p className="text-sm">Define your sales stages above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {labels.map(label => (
                    <div key={label.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: label.color, boxShadow: `0 0 10px ${label.color}40` }} />
                        <span className="font-bold text-sm">{label.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteLabel(label.id)}
                        className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
