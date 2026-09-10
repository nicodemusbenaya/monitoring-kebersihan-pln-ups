"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { QuickRangeInfo, DashboardData } from "@/types/dashboard";

interface KpiMetricCardsProps {
  loading: boolean;
  currentQuickInfo: QuickRangeInfo;
  activeQuickRange: string;
  hasFilterActive: boolean;
  filteredKpi: {
    rate: number;
    completed: number;
    total: number;
    isFiltered: boolean;
  };
  dashboardData: DashboardData | null;
  totalRoomsCount: number;
  onFilterPartialRooms: () => void;
  onFilterCompleteRooms: () => void;
  onOpenFindingsModal: () => void;
  onOpenEvaluations: () => void;
}

export function KpiMetricCards({
  loading,
  currentQuickInfo,
  activeQuickRange,
  hasFilterActive,
  filteredKpi,
  dashboardData,
  totalRoomsCount,
  onFilterPartialRooms,
  onFilterCompleteRooms,
  onOpenFindingsModal,
  onOpenEvaluations,
}: KpiMetricCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Penyelesaian Jadwal */}
      <div
        onClick={onFilterPartialRooms}
        className={`relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer hover:shadow-md hover:border-[#ffd100] group ${
          loading ? "border-[#ffd100]/50" : "border-[#d8e3ea]"
        } ${hasFilterActive || activeQuickRange !== "HARI_INI" ? "ring-1 ring-[#ffd100]/20" : ""}`}
        title="Klik untuk filter ruangan yang jadwalnya belum lengkap"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#647783] flex items-center gap-1.5">
            {`Penyelesaian jadwal • ${currentQuickInfo.label}`}
            {(activeQuickRange !== "HARI_INI" || hasFilterActive) && (
              <span className="px-1.5 py-0.5 bg-[#fff6a1] border border-[#ffd100] rounded-md text-[9px] font-black tracking-wide text-[#92400e]">
                {currentQuickInfo.badgeText}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold text-[#0076a8] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Filter <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="my-2">
          {loading ? (
            <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl" />
          ) : (
            <strong className="text-3xl font-black text-[#17313d]">
              {filteredKpi.rate ?? 0}%
            </strong>
          )}
        </div>
        {loading ? (
          <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#ffd100]" />
            <span>
              {`${filteredKpi.completed} dari ${filteredKpi.total} jadwal (${currentQuickInfo.label.toLowerCase()})`}
            </span>
          </div>
        )}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#ffd100]/30 pointer-events-none" />
        {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl pointer-events-none" />}
      </div>

      {/* KPI 2: Ruangan Lengkap */}
      <div
        onClick={onFilterCompleteRooms}
        className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer hover:shadow-md hover:border-[#0076a8] group ${
          loading ? "opacity-70" : ""
        }`}
        title="Klik untuk filter ruangan yang sudah lengkap semua sesi"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#647783]">Ruangan lengkap</span>
          <span className="text-[10px] font-bold text-[#0076a8] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Lihat <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="my-2">
          {loading ? (
            <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl" />
          ) : (
            <strong className="text-3xl font-black text-[#0076a8]">
              {dashboardData?.summary?.greenCount ?? 0}
              <span className="text-xl font-bold text-[#647783]">/{totalRoomsCount || 24}</span>
            </strong>
          )}
        </div>
        {loading ? (
          <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#0076a8]" />
            <span>Seluruh jadwal ruangan selesai</span>
          </div>
        )}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#0076a8]/15 pointer-events-none" />
      </div>

      {/* KPI 3: Pemeriksaan dengan Temuan */}
      <div
        onClick={onOpenFindingsModal}
        className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer hover:shadow-md hover:border-[#bd2d22] group ${
          loading ? "opacity-70" : ""
        }`}
        title="Klik untuk membuka modal daftar rincian temuan & foto bukti hari ini"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#647783]">Pemeriksaan dengan temuan</span>
          <span className="text-[10px] font-bold text-[#bd2d22] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Rincian foto <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="my-2">
          {loading ? (
            <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl" />
          ) : (
            <strong className="text-3xl font-black text-[#bd2d22]">
              {dashboardData?.summary?.findingCount ?? 0}
            </strong>
          )}
        </div>
        {loading ? (
          <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#bd2d22]" />
            <span>{dashboardData?.summary?.findingCount ?? 0} indikator perlu ditinjau</span>
          </div>
        )}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#bd2d22]/15 pointer-events-none" />
      </div>

      {/* KPI 4: Kepuasan Pengguna */}
      <div
        onClick={onOpenEvaluations}
        className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all cursor-pointer hover:shadow-md hover:border-[#157a55] group ${
          loading ? "opacity-70" : ""
        }`}
        title="Klik untuk melihat detail evaluasi kepuasan pengunjung"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#647783]">Kepuasan pengguna</span>
          <span className="text-[10px] font-bold text-[#157a55] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Buka ulasan <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="my-2">
          {loading ? (
            <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl" />
          ) : (
            <strong className="text-3xl font-black text-[#157a55]">
              {dashboardData?.metrics?.satisfactionRate ?? 100}%
            </strong>
          )}
        </div>
        {loading ? (
          <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#157a55]" />
            <span>Rata-rata {dashboardData?.metrics?.averageRating ?? "3.8"} dari 4</span>
          </div>
        )}
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#157a55]/15 pointer-events-none" />
      </div>
    </section>
  );
}
