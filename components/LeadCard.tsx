"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, MessageCircle, Globe } from "lucide-react";
import { Lead, LabelRecord } from "@/types/lead";
import { formatRelativeTime } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isAdmin?: boolean;
}

export function LeadCard({ lead, onClick, isAdmin }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case "whatsapp": return <MessageCircle size={14} />;
      case "instagram": return <Globe size={14} />;
      case "linkedin": return <Globe size={14} />;
      case "email": return <Mail size={14} />;
      default: return <Phone size={14} />;
    }
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="glass border-emerald-500/50 p-3 rounded-xl opacity-30 h-24" 
      />
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="glass glass-hover p-3 rounded-xl cursor-grab active:cursor-grabbing mb-2 group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col min-w-0">
          <h4 className="font-medium text-sm text-white line-clamp-1 pr-2">{lead.name}</h4>
        </div>
        {lead.rating && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-medium shrink-0">
            ★ {lead.rating}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
        {lead.niche} • {lead.city}
      </p>

      {lead.labels && lead.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {lead.labels.map((label: LabelRecord) => (
            <span 
              key={label.id} 
              className="text-[9px] px-1.5 py-0.5 rounded font-medium border border-white/5 flex items-center gap-1"
              style={{ backgroundColor: `${label.color}15`, color: label.color }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-end mt-3">
        <div className="flex items-center gap-2">
          {isAdmin && (lead.userName || lead.userEmail) && (
            <div 
              className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400"
              title={`Owner: ${lead.userName || lead.userEmail}`}
            >
              {getInitials(lead.userName || lead.userEmail || "U")}
            </div>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${lead.source === 'gemini_search' ? 'bg-blue-400' : 'bg-emerald-400'}`} title={`Source: ${lead.source}`} />
        </div>

        <div className="flex flex-col items-end gap-1">
          {lead.channel && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              {getChannelIcon(lead.channel)}
              <span className="capitalize">{lead.channel}</span>
            </div>
          )}
          <span className="text-[9px] text-muted-foreground/60 italic">
            {lead.createdAt && typeof lead.createdAt === "object" && "toMillis" in lead.createdAt 
              ? formatRelativeTime(lead.createdAt.toMillis())
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}


