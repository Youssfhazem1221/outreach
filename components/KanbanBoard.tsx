"use client";

import { useMemo, useState } from "react";
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

interface KanbanBoardProps {
  leads: any[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: any) => void;
  isAdmin?: boolean;
}

const COLUMNS = ["New", "Contacted", "Replied", "Call Booked", "Closed", "Not Interested"];

function KanbanColumn({ title, leads, onLeadClick, isAdmin }: { title: string; leads: any[]; onLeadClick: (lead: any) => void; isAdmin?: boolean }) {
  const { setNodeRef } = useDroppable({
    id: title,
  });

  return (
    <div className="flex flex-col w-[260px] shrink-0 bg-white/5 rounded-2xl border border-white/10 overflow-hidden h-full">
      <div className="p-3 border-b border-white/10 bg-black/20 flex justify-between items-center">
        <h3 className="font-semibold text-xs">{title}</h3>
        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-muted-foreground">{leads.length}</span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto min-h-[150px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} isAdmin={isAdmin} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ leads, onStatusChange, onLeadClick, isAdmin }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Avoid triggering drag on simple clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find((l) => l.id === active.id);
    setActiveLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const activeLeadData = leads.find((l) => l.id === leadId);
    if (!activeLeadData) return;

    // Is it dropped over another card?
    const overLeadData = leads.find((l) => l.id === overId);
    
    // The new status is either the status of the card we dropped over, or the id of the column we dropped into
    const newStatus = overLeadData ? overLeadData.status : overId;

    if (activeLeadData.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  };

  return (
    <div className="h-full flex gap-3 overflow-x-auto pb-4 p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            title={col}
            leads={leads.filter((l) => l.status === col)}
            onLeadClick={onLeadClick}
            isAdmin={isAdmin}
          />
        ))}

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-2 scale-105 shadow-2xl cursor-grabbing">
              <LeadCard lead={activeLead} onClick={() => {}} isAdmin={isAdmin} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
