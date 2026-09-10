"use client";

import React from "react";
import { QuickRangeKey, QuickRangeInfo } from "@/types/dashboard";

interface HeroFilterBannerProps {
  currentQuickInfo: QuickRangeInfo;
  activeQuickRange: QuickRangeKey;
  onQuickRangeChange: (key: QuickRangeKey) => void;
  loading: boolean;
  todayTimeFormatted: string;
}

const QUICK_RANGE_TABS: { key: QuickRangeKey; label: string }[] = [
  { key: "HARI_INI", label: "Hari ini" },
  { key: "KEMARIN", label: "Kemarin" },
  { key: "1_MINGGU", label: "1 minggu" },
  { key: "1_BULAN", label: "1 bulan" },
  { key: "SEMESTER", label: "Semester" },
];

export function HeroFilterBanner({
  currentQuickInfo,
  activeQuickRange,
  onQuickRangeChange,
  loading,
  todayTimeFormatted,
}: HeroFilterBannerProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#062c3e] via-[#09415b] to-[#0d5678] text-white rounded-3xl p-5 sm:p-7 shadow-xl">
      <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ffd100] via-transparent to-transparent" />
      <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border-[30px] border-white/10 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#ffd100] block mb-1">
            OPERASIONAL & PEMANTAUAN
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
            Ringkasan operasional
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Pantau kepatuhan jadwal, checklist kebersihan, dan kondisi ruangan secara langsung berdasarkan periode pilihan.
          </p>
        </div>

        {/* Quick Filter Bar inside Hero Card */}
        <div className="p-2.5 sm:p-3 bg-black/25 backdrop-blur-md rounded-2xl border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Range Badge & Display Date */}
          <div className="flex items-center gap-2.5 px-1.5">
            <span className="px-2.5 py-1 bg-[#ffd100] text-[#072d3f] text-[11px] font-black rounded-lg uppercase tracking-wide shrink-0 shadow-sm">
              {currentQuickInfo.badgeText}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate">
              {currentQuickInfo.displayDate}
            </span>
          </div>

          {/* 5 Quick Filter Buttons */}
          <div className="flex overflow-x-auto gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10 scrollbar-none">
            {QUICK_RANGE_TABS.map((tab) => {
              const isActive = activeQuickRange === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onQuickRangeChange(tab.key)}
                  disabled={loading}
                  className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                    isActive
                      ? "bg-[#ffd100] text-[#072d3f] shadow-md shadow-[#ffd100]/25 scale-100"
                      : "text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium pt-0.5">
          {loading ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#ffd100] animate-ping" />
              <span className="text-[#ffd100] font-bold">
                Memuat data periode {currentQuickInfo.label.toLowerCase()}...
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>Data terbaru • {todayTimeFormatted}</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
