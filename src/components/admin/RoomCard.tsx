"use client";

import React from "react";
import { AlertTriangle, Camera, ChevronRight } from "lucide-react";
import { RoomSummaryItem } from "@/types/dashboard";

interface RoomCardProps {
  room: RoomSummaryItem;
  onSelect: (room: RoomSummaryItem) => void;
}

export function RoomCard({ room, onSelect }: RoomCardProps) {
  const isGreen = room.status === "COMPLETE";
  const isPurple = room.status === "WAITING_SPV";
  const isYellow = room.status === "PARTIAL";

  let borderColor = "border-[#cbd5e1]";
  let badgeColor = "bg-[#f1f5f9] text-[#647783]";
  let statusText = "Belum Ada Data";

  if (isGreen) {
    borderColor = "border-[#10b981]/40 bg-[#f0fdf4]";
    badgeColor = "bg-[#dcfce7] text-[#15803d]";
    statusText = "Lengkap";
  } else if (isPurple) {
    borderColor = "border-[#8b5cf6]/40 bg-[#faf5ff]";
    badgeColor = "bg-[#f3e8ff] text-[#7e22ce]";
    statusText = "Menunggu SPV";
  } else if (isYellow) {
    borderColor = "border-[#f59e0b]/40 bg-[#fffbeb]";
    badgeColor = "bg-[#fef3c7] text-[#b45309]";
    statusText = "Sebagian";
  }

  const roomPhotosCount = (room.slots || []).reduce(
    (acc: number, s) => acc + (s.inspection?.photos?.length || 0),
    0
  );

  return (
    <div
      onClick={() => onSelect(room)}
      className={`p-4 rounded-2xl border ${borderColor} flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:border-[#0076a8] group`}
    >
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[10px] font-black uppercase text-[#647783] truncate">
            {room.roomTypeName}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${badgeColor}`}>
            {statusText}
          </span>
        </div>
        <h5 className="text-xs font-black text-[#17313d] line-clamp-1 group-hover:text-[#0076a8] transition-colors">
          {room.name}
        </h5>
      </div>

      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
        <span className="text-[#647783] font-bold">
          {room.completedSlots}/{room.totalSlots} Sesi
        </span>
        <div className="flex items-center gap-1.5">
          {roomPhotosCount > 0 && (
            <span
              className="text-[#0076a8] font-black text-[10px] flex items-center gap-1 bg-[#e0f2fe] border border-[#bae6fd] px-1.5 py-0.5 rounded-md"
              title={`${roomPhotosCount} foto bukti tersimpan untuk ruangan ini`}
            >
              <Camera className="w-3 h-3 text-[#0284c7]" /> {roomPhotosCount} Foto
            </span>
          )}
          {room.dirtyCount > 0 ? (
            <span className="text-[#b91c1c] font-black flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {room.dirtyCount}
            </span>
          ) : (
            <span className="text-[#0076a8] font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Detail <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
