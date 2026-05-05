"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadEngine } from "@/components/LeadEngine";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { db } from "@/lib/firebaseClient";
import { collection, query, onSnapshot, doc, updateDoc, getDoc, where } from "firebase/firestore";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";

type ViewType = "pipeline" | "table" | "engine" | "settings" | "dashboard";

type TimestampLike =
  | { toMillis?: () => number }
  | { seconds?: number; nanoseconds?: number }
  | Date
  | number
  | string
  | null
  | undefined;

type LabelRecord = { id: string; name: string; color: string };

type LeadRecord = {
  id: string;
  createdAt?: TimestampLike;
  labels?: Array<string | LabelRecord>;
  status?: string;
};

export default function AppShell() {
  const { user, loading, role, signInWithGoogle } = useAuth();
  const router = useRouter();
  
  const [currentView, setCurrentView] = useState<ViewType>("pipeline");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customLabels, setCustomLabels] = useState<LabelRecord[]>([]);

  // Deep Link Listener: Auto-open lead from URL ?leadId=...
  useEffect(() => {
    if (leads.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const leadIdFromUrl = params.get("leadId");
    
    if (leadIdFromUrl) {
      const foundLead = leads.find(l => l.id === leadIdFromUrl);
      if (foundLead) {
        setSelectedLead(foundLead);
        setIsDrawerOpen(true);
      }
    }
  }, [leads]);

  // Sync URL with Drawer State
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isDrawerOpen && selectedLead) {
      params.set("leadId", selectedLead.id);
    } else {
      params.delete("leadId");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [isDrawerOpen, selectedLead]);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch Global Custom Labels
  useEffect(() => {
    if (!user) return;
    const fetchLabels = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "labels"));
        if (snap.exists()) {
          setCustomLabels(snap.data().items || []);
        }
      } catch (err) {
        console.error("Failed to load global labels", err);
      }
    };
    fetchLabels();
  }, [user]);

  // Firestore Real-time Listener (50K reads optimization: scoped to current user)
  useEffect(() => {
    if (!user) return;

    const q = role === "admin"
      ? query(collection(db, "leads"))
      : query(collection(db, "leads"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads: LeadRecord[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LeadRecord, "id">),
      }));
      // Sort by creation date client-side to save on compound index requirements initially
      fetchedLeads.sort((a, b) => {
        const dateA = a.createdAt && typeof a.createdAt === "object" && "toMillis" in a.createdAt
          ? a.createdAt.toMillis?.() || 0
          : 0;
        const dateB = b.createdAt && typeof b.createdAt === "object" && "toMillis" in b.createdAt
          ? b.createdAt.toMillis?.() || 0
          : 0;
        return dateB - dateA;
      });
      setLeads(fetchedLeads as LeadRecord[]);
    }, (error) => {
      console.error("Firestore listener error:", error);
    });

    return () => unsubscribe();
  }, [user, role]);

  // Hydrate Leads with Label Objects
  const hydratedLeads = useMemo(() => {
    return leads.map(lead => {
      if (lead.labels && Array.isArray(lead.labels)) {
        const fullLabels = lead.labels.map((idOrObj) => {
          if (typeof idOrObj === "string") {
            const found = customLabels.find(l => l.id === idOrObj);
            return found || { id: idOrObj, name: "Unknown Label", color: "#666666" };
          }
          if (idOrObj && typeof idOrObj === "object" && "id" in idOrObj && "name" in idOrObj && "color" in idOrObj) {
            return idOrObj as LabelRecord;
          }
          return idOrObj; // already an object
        }) as LabelRecord[];
        return { ...lead, labels: fullLabels };
      }
      return lead;
    });
  }, [leads, customLabels]);

  const hydratedSelectedLead = useMemo(() => {
    if (!selectedLead) return null;
    return hydratedLeads.find(l => l.id === selectedLead.id) || selectedLead;
  }, [selectedLead, hydratedLeads]);

  // Optimistic UI update for Status Change
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // 1. Optimistic update
    const previousLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }

    try {
      // 2. Network request
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status", error);
      // 3. Revert on failure
      setLeads(previousLeads);
      alert("Failed to update status. Reverting.");
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (leadIds: string[], newStatus: string) => {
    try {
      const { writeBatch, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        const ref = doc(db, "leads", id);
        batch.update(ref, { status: newStatus, updatedAt: new Date() });
      });
      await batch.commit();
    } catch (error) {
      console.error("Bulk status update failed", error);
      alert("Failed to update some leads.");
    }
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    try {
      const { writeBatch, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        const ref = doc(db, "leads", id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert("Failed to delete some leads.");
    }
  };

  const handleBulkNicheChange = async (leadIds: string[], newNiche: string) => {
    try {
      const { writeBatch, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        const ref = doc(db, "leads", id);
        batch.update(ref, { niche: newNiche, updatedAt: new Date() });
      });
      await batch.commit();
    } catch (error) {
      console.error("Bulk niche update failed", error);
      alert("Failed to update niche.");
    }
  };

  const handleBulkLabelAdd = async (leadIds: string[], labelId: string) => {
    try {
      const { writeBatch, doc, arrayUnion } = await import("firebase/firestore");
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        const ref = doc(db, "leads", id);
        batch.update(ref, { 
          labels: arrayUnion(labelId),
          updatedAt: new Date() 
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Bulk label update failed", error);
      alert("Failed to add labels.");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="glass p-8 rounded-2xl w-full max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full glass flex items-center justify-center text-emerald-500">
              <LogIn size={32} />
            </div>
          </div>

          <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            {loading ? "Checking your session..." : "Sign in to access your CRM and Lead Engine."}
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed py-3 px-4 rounded-xl font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden selection:bg-emerald-500/30">
      
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black">
        {/* Render active view */}
        {currentView === "pipeline" && (
          <KanbanBoard 
            leads={hydratedLeads} 
            onStatusChange={handleStatusChange} 
            onLeadClick={(l) => { setSelectedLead(l); setIsDrawerOpen(true); }}
            isAdmin={role === "admin"}
          />
        )}
        {currentView === "table" && (
          <LeadsTable 
            leads={hydratedLeads}
            onStatusChange={handleStatusChange}
            onLeadClick={(l) => { setSelectedLead(l); setIsDrawerOpen(true); }}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkNicheChange={handleBulkNicheChange}
            onBulkLabelAdd={handleBulkLabelAdd}
            customLabels={customLabels}
            isAdmin={role === "admin"}
          />
        )}
        {currentView === "engine" && <LeadEngine />}
        {currentView === "settings" && <SettingsPanel />}
        {currentView === "dashboard" && <AnalyticsDashboard leads={hydratedLeads} />}
      </main>

      <LeadDetailDrawer 
        lead={hydratedSelectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={handleStatusChange}
      />
    </div>
  );
}
