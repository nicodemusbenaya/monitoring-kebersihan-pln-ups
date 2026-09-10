"use client";

import React from "react";
import { Search } from "lucide-react";
import { RoomSummaryItem } from "@/types/dashboard";
import { RoomCard } from "./RoomCard";

interface RoomMatrixSectionProps {
  roomSearchQuery: string;
  setRoomSearchQuery: (q: string) => void;
  statusRoomFilter: "ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE";
  setStatusRoomFilter: (filter: "ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE") => void;
  totalRoomsCount: number;
  findingRoomsCount: number;
  greenRoomsCount: number;
  filteredRooms: RoomSummaryItem[];
  loading: boolean;
  onSelectRoom: (room: RoomSummaryItem) => void;
}

export function RoomMatrixSection({
  roomSearchQuery,
  setRoomSearchQuery,
  statusRoomFilter,
  setStatusRoomFilter,
  totalRoomsCount,
  findingRoomsCount,
  greenRoomsCount,
  filteredRooms,
  loading,
  onSelectRoom,
}: RoomMatrixSectionProps) {
  const incompleteRoomsCount = Math.max(0, totalRoomsCount - greenRoomsCount);

  const filterTabs = [
    { id: "ALL" as const, label: `Semua (${totalRoomsCount})` },
    { id: "FINDINGS" as const, label: `Temuan (${findingRoomsCount})` },
    { id: "PARTIAL" as const, label: `Belum lengkap (${incompleteRoomsCount})` },
    { id: "COMPLETE" as const, label: `Lengkap (${greenRoomsCount})` },
  ];

  return (
    <div className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f5f9]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            STATUS HARIAN
          </span>
          <h4 className="text-lg font-black text-[#17313d]">Ruangan hari ini</h4>
          <p className="text-xs text-[#647783] mt-0.5">
            Kondisi tiap ruangan berdasarkan seluruh slot yang dijadwalkan hari ini.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ruangan..."
            value={roomSearchQuery}
            onChange={(e) => setRoomSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#d8e3ea] rounded-xl text-xs font-bold text-[#17313d] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0076a8]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusRoomFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusRoomFilter === tab.id
                ? "bg-[#072d3f] text-white shadow-sm"
                : "bg-[#f8fafc] text-[#647783] hover:bg-[#f1f5f9]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 max-h-[520px] overflow-y-auto pr-1 ${
          loading ? "opacity-60" : ""
        }`}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-[#cbd5e1]/40 bg-[#f8fafc] flex flex-col justify-between h-28 animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-3 w-16 bg-[#e2e8f0] rounded" />
                <div className="h-4 w-32 bg-[#e2e8f0] rounded" />
              </div>
              <div className="h-3 w-20 bg-[#e2e8f0] rounded pt-2 border-t border-black/5" />
            </div>
          ))
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#647783]">
            Tidak ada ruangan yang cocok dengan kriteria filter atau pencarian.
          </div>
        ) : (
          filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} onSelect={onSelectRoom} />
          ))
        )}
      </div>
    </div>
  );
}
