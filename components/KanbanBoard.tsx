"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@/types/lead";
import { Plus } from "lucide-react";

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: Lead) => void;
  isAdmin?: boolean;
  onAddLead?: () => void;
}

const COLUMNS = ["New", "Contacted", "Replied", "Call Booked", "Closed", "Not Interested"];

const KanbanColumn = React.memo(({ title, leads, onLeadClick, isAdmin }: { title: string; leads: Lead[]; onLeadClick: (lead: Lead) => void; isAdmin?: boolean }) => {
  const { setNodeRef } = useDroppable({
    id: title,
  });

  return (
    <div className="flex flex-col w-[280px] shrink-0 bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden h-full shadow-xl">
      <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{title}</h3>
        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-4 overflow-y-auto min-h-[200px] space-y-3">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} isAdmin={isAdmin} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
});

KanbanColumn.displayName = "KanbanColumn";

export function KanbanBoard({ leads, onStatusChange, onLeadClick, isAdmin, onAddLead }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Memoize grouped leads to prevent redundant filtering in render
  const columnsData = useMemo(() => {
    return COLUMNS.map(col => ({
      title: col,
      leads: leads.filter(l => l.status === col)
    }));
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Increased slightly to prevent accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find((l) => l.id === active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const activeLeadData = leads.find((l) => l.id === leadId);
    if (!activeLeadData) return;

    // Check if drop target is a column ID or another lead's ID
    const isColumn = COLUMNS.includes(overId);
    let newStatus = overId;

    if (!isColumn) {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) newStatus = overLead.status;
    }

    if (activeLeadData.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Board header with Add Lead CTA */}
      {onAddLead && (
        <div className="px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
            Pipeline Board — Drag cards to change status
          </p>
          <button
            onClick={onAddLead}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus size={14} /> Add Lead
          </button>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 px-6 pt-2 selection:bg-emerald-500/20">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columnsData.map((col) => (
            <KanbanColumn
              key={col.title}
              title={col.title}
              leads={col.leads}
              onLeadClick={onLeadClick}
              isAdmin={isAdmin}
            />
          ))}

          <DragOverlay zIndex={1000}>
            {activeLead ? (
              <div className="rotate-2 scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-grabbing">
                <LeadCard lead={activeLead} onClick={() => {}} isAdmin={isAdmin} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
