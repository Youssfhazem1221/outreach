"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, Globe, GripVertical } from "lucide-react";
import { Lead, LabelRecord } from "@/types/lead";
import { formatRelativeTime } from "@/lib/dates";
import { getStatusStyle } from "@/constants/statuses";
import React from "react";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isAdmin?: boolean;
}

/** Generate a consistent hue from a string for avatars */
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function LeadCardComponent({ lead, onClick, isAdmin }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "Lead", lead },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const statusStyle = getStatusStyle(lead.status);
  const avatarHue = stringToHue(lead.name || "?");

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, borderColor: statusStyle.hex }}
        className="border-2 border-dashed rounded-xl opacity-40 h-[88px]"
      />
    );
  }

  const whatsappLink = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, "")}`
    : null;
  const websiteLink = lead.website
    ? lead.website.startsWith("http") ? lead.website : `https://${lead.website}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="relative bg-white/[0.04] border border-white/[0.08] rounded-xl cursor-grab active:cursor-grabbing mb-2 group overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg"
    >
      {/* Status color left stripe — always visible */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-200 group-hover:w-[4px]"
        style={{
          background: `linear-gradient(180deg, ${statusStyle.hex}dd 0%, ${statusStyle.hex}66 100%)`,
          boxShadow: `2px 0 8px ${statusStyle.hex}30`,
        }}
      />

      <div className="pl-4 pr-3 pt-3 pb-3">
        {/* Header row: avatar + name + grip */}
        <div className="flex items-start gap-2.5 mb-2">
          {/* Company avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 border border-white/10"
            style={{
              background: `hsl(${avatarHue}, 55%, 18%)`,
              color: `hsl(${avatarHue}, 70%, 65%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}
          >
            {getInitials(lead.name || "?")}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white/90 line-clamp-1 group-hover:text-white transition-colors leading-tight">
              {lead.name}
            </h4>
            <p className="text-[10px] text-white/35 mt-0.5 line-clamp-1">
              {[lead.niche, lead.city].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Drag grip — visible on hover */}
          <div className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0 text-white/50 mt-0.5">
            <GripVertical size={13} />
          </div>
        </div>

        {/* Labels */}
        {lead.labels && lead.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {lead.labels.map((label: LabelRecord) => (
              <span
                key={label.id}
                className="text-[9px] px-1.5 py-0.5 rounded-md font-bold border flex items-center gap-1"
                style={{
                  backgroundColor: `${label.color}18`,
                  color: label.color,
                  borderColor: `${label.color}30`,
                }}
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer: quick-actions + date */}
        <div className="flex items-center justify-between mt-2">
          {/* Quick-action buttons — appear on hover */}
          <div className="flex items-center gap-1.5">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-all duration-150 w-6 h-6 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:scale-110 active:scale-90"
                title="WhatsApp"
              >
                <Phone size={10} />
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-all duration-150 delay-[20ms] w-6 h-6 rounded-md bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:scale-110 active:scale-90"
                title="Email"
              >
                <Mail size={10} />
              </a>
            )}
            {websiteLink && (
              <a
                href={websiteLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-all duration-150 delay-[40ms] w-6 h-6 rounded-md bg-violet-500/10 hover:bg-violet-500/25 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:scale-110 active:scale-90"
                title="Website"
              >
                <Globe size={10} />
              </a>
            )}

            {/* Source dot */}
            {!whatsappLink && !lead.email && !websiteLink && (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusStyle.hex, boxShadow: `0 0 6px ${statusStyle.hex}60` }}
                title={`Source: ${lead.source}`}
              />
            )}

            {/* Admin owner badge */}
            {isAdmin && (lead.userName || lead.userEmail) && (
              <div
                className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/40"
                title={`Owner: ${lead.userName || lead.userEmail}`}
              >
                {getInitials(lead.userName || lead.userEmail || "U")}
              </div>
            )}
          </div>

          {/* Date pill */}
          <span className="text-[9px] text-white/25 tabular-nums">
            {formatRelativeTime(lead.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const LeadCard = React.memo(LeadCardComponent);
