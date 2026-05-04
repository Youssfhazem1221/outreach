"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadEngine } from "@/components/LeadEngine";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

type ViewType = "pipeline" | "table" | "engine" | "settings";

export default function AppShell() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [currentView, setCurrentView] = useState<ViewType>("pipeline");
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Firestore Real-time Listener (50K reads optimization: scoped to current user)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "leads"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by creation date client-side to save on compound index requirements initially
      fetchedLeads.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setLeads(fetchedLeads);
    }, (error) => {
      console.error("Firestore listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleGenerateOutreach = async (leadId: string, offer: string) => {
    try {
      const leadData = leads.find(l => l.id === leadId);
      if (!leadData) return;

      const idToken = await user?.getIdToken();
      
      const res = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadData, offer, idToken }),
      });

      if (!res.ok) throw new Error("Failed to generate outreach");

      // Handle the stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedJsonStr = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulatedJsonStr += decoder.decode(value, { stream: true });
        }
      }

      // Parse the final JSON
      // Groq might wrap in ```json ... ``` so clean it up
      const cleanedStr = accumulatedJsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedStr);

      // Save to Firestore
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        en_message: result.en_message,
        ar_message: result.ar_message
      });

      // Local state is updated automatically via onSnapshot listener!

    } catch (error: any) {
      console.error(error);
      alert("Error generating outreach: " + error.message);
    }
  };

  if (loading || !user) return <div className="min-h-screen bg-black" />;

  return (
    <div className="flex h-screen bg-black overflow-hidden selection:bg-emerald-500/30">
      
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black">
        {/* Render active view */}
        {currentView === "pipeline" && (
          <KanbanBoard 
            leads={leads} 
            onStatusChange={handleStatusChange} 
            onLeadClick={(l) => { setSelectedLead(l); setIsDrawerOpen(true); }}
          />
        )}
        {currentView === "table" && (
          <LeadsTable 
            leads={leads}
            onStatusChange={handleStatusChange}
            onLeadClick={(l) => { setSelectedLead(l); setIsDrawerOpen(true); }}
          />
        )}
        {currentView === "engine" && <LeadEngine />}
        {currentView === "settings" && <SettingsPanel />}
      </main>

      <LeadDetailDrawer 
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={handleStatusChange}
        onGenerateOutreach={handleGenerateOutreach}
      />
    </div>
  );
}
