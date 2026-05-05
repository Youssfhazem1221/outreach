"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, MessageCircle, Globe } from "lucide-react";

interface LeadCardProps {
  lead: any;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
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
        className="glass border-emerald-500/50 p-4 rounded-xl opacity-30 h-28" 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="glass glass-hover p-4 rounded-xl cursor-grab active:cursor-grabbing mb-3 group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col min-w-0">
          <h4 className="font-medium text-sm text-white line-clamp-1 pr-2">{lead.name}</h4>
          {lead.source === 'groq_simulated' && (
            <span className="text-[8px] text-amber-500 font-bold uppercase tracking-tighter">Simulated</span>
          )}
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
          {lead.labels.map((label: any) => (
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

      <div className="flex items-center justify-between mt-auto">
        <div className="flex gap-2">
          {lead.channel && (
            <div className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded-md text-muted-foreground">
              {getChannelIcon(lead.channel)}
              <span className="capitalize">{lead.channel}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${lead.source === 'gemini_search' ? 'bg-blue-400' : 'bg-emerald-400'}`} title={`Source: ${lead.source}`} />
        </div>
      </div>
    </div>
  );
}
