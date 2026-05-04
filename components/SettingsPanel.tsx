"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ShieldAlert, Save, Users } from "lucide-react";
import { auth } from "@/lib/firebaseClient";

export function SettingsPanel() {
  const { role } = useAuth();
  const [targetUid, setTargetUid] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [isPromoting, setIsPromoting] = useState(false);
  const [msg, setMsg] = useState("");

  // Only admins can see this panel (double checked by firestore rules and API)
  if (role !== "admin") {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500 opacity-50" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUid) return;
    setIsPromoting(true);
    setMsg("");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      const res = await fetch("/api/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid, newRole, idToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMsg(`Success: ${data.message}`);
      setTargetUid("");
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and user roles.</p>
        </div>

        {/* User Role Management */}
        <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users size={20} />
            </div>
            <h2 className="text-lg font-semibold">Role Management</h2>
          </div>
          
          <form onSubmit={handlePromote} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">User Firebase UID</label>
                <input 
                  type="text" 
                  value={targetUid} 
                  onChange={(e) => setTargetUid(e.target.value)}
                  placeholder="e.g. abc123xyz..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Assign Role</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="admin">Administrator</option>
                  <option value="user">Standard User</option>
                </select>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isPromoting}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-xl transition-colors"
            >
              {isPromoting ? "Updating..." : "Update Role"}
            </button>
            {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>}
          </form>
        </div>

        {/* System Config Placeholder */}
        <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Save size={20} />
            </div>
            <h2 className="text-lg font-semibold">Prompt Templates (Coming Soon)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            In a future update, you will be able to edit the Gemini and Groq system prompts directly from this panel and save them to Firestore.
          </p>
        </div>

      </div>
    </div>
  );
}
