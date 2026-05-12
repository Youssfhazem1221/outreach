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
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { useDroppable } from "@dnd-kit/core";
import { Lead } from "@/types/lead";
import { LEAD_STATUSES, getStatusStyle } from "@/constants/statuses";
import { Plus, Inbox } from "lucide-react";

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: Lead) => void;
  isAdmin?: boolean;
  onAddLead?: () => void;
}

const COLUMNS = ["New", "Contacted", "Replied", "Call Booked", "Closed", "Not Interested"];

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  title: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  isAdmin?: boolean;
}

const KanbanColumn = React.memo(({ title, leads, onLeadClick, isAdmin }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  const statusConfig = getStatusStyle(title);

  return (
    <div
      className="flex flex-col w-[272px] shrink-0 rounded-2xl border overflow-hidden h-full transition-all duration-200"
      style={{
        background: isOver
          ? `linear-gradient(180deg, ${statusConfig.hex}10 0%, rgba(0,0,0,0) 40%)`
          : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        borderColor: isOver ? `${statusConfig.hex}40` : "rgba(255,255,255,0.07)",
        boxShadow: isOver ? `0 0 24px ${statusConfig.hex}15` : "none",
      }}
    >
      {/* Column header with status color top border */}
      <div
        className="shrink-0 border-b border-white/[0.06]"
        style={{
          borderTop: `2px solid ${statusConfig.hex}`,
          boxShadow: `0 -1px 0 0 ${statusConfig.hex}30`,
        }}
      >
        <div className="px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            {/* Status indicator dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: statusConfig.hex,
                boxShadow: `0 0 6px ${statusConfig.hex}80`,
              }}
            />
            <h3 className="font-bold text-[11px] uppercase tracking-[0.12em] text-white/70">
              {title}
            </h3>
          </div>

          {/* Lead count badge */}
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full border tabular-nums"
            style={{
              backgroundColor: `${statusConfig.hex}15`,
              color: statusConfig.hex,
              borderColor: `${statusConfig.hex}30`,
            }}
          >
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 overflow-y-auto min-h-[200px]"
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              isAdmin={isAdmin}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {leads.length === 0 && (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] mx-1 mt-1 gap-2 transition-colors"
            style={{ borderColor: isOver ? `${statusConfig.hex}40` : undefined }}
          >
            <Inbox
              size={22}
              style={{ color: statusConfig.hex, opacity: 0.35 }}
            />
            <p className="text-[10px] text-white/20 font-medium text-center leading-relaxed px-4">
              No leads here.<br />Drop a card or use<br />the Lead Engine.
            </p>
          </div>
        )}
      </div>

      {/* Scroll fade at bottom when overflowing */}
      <div
        className="h-6 shrink-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)",
          marginTop: "-24px",
          position: "relative",
          zIndex: 5,
        }}
      />
    </div>
  );
});

KanbanColumn.displayName = "KanbanColumn";

// ─── Main Board ───────────────────────────────────────────────────────────────

export function KanbanBoard({ leads, onStatusChange, onLeadClick, isAdmin, onAddLead }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const columnsData = useMemo(() => {
    return COLUMNS.map((col) => ({
      title: col,
      leads: leads.filter((l) => l.status === col),
    }));
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
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

    const isColumn = COLUMNS.includes(overId);
    let newStatus = overId;
    if (!isColumn) {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) newStatus = overLead.status;
    }
    if (activeLeadData.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Board toolbar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-white">Pipeline</h1>
            <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase font-mono tracking-widest">
              Live
            </span>
          </div>
          <p className="text-[11px] text-white/30 mt-0.5">
            Drag cards between columns to update status
          </p>
        </div>

        {/* Status legend */}
        <div className="hidden xl:flex items-center gap-4 mr-4">
          {LEAD_STATUSES.map((s) => (
            <div key={s.value} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.hex, boxShadow: `0 0 8px ${s.hex}90` }}
              />
              <span className="text-[10px] text-white/50 font-medium tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>

        {onAddLead && (
          <button
            onClick={onAddLead}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 glow-emerald-xs"
          >
            <Plus size={14} /> Add Lead
          </button>
        )}
      </div>

      {/* Board columns */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4 px-6 pt-4">
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
              <div className="rotate-1 scale-105 shadow-[0_24px_60px_rgba(0,0,0,0.6)] cursor-grabbing">
                <LeadCard lead={activeLead} onClick={() => {}} isAdmin={isAdmin} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
