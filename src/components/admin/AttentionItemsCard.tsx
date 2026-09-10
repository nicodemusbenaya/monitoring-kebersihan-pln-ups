"use client";

import React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { ActionItem } from "@/types/dashboard";

interface AttentionItemsCardProps {
  actionCounts: {
    all: number;
    findings: number;
    pending: number;
  };
  actionItemFilter: "ALL" | "FINDINGS" | "PENDING";
  setActionItemFilter: (filter: "ALL" | "FINDINGS" | "PENDING") => void;
  filteredActionItems: ActionItem[];
  loading: boolean;
}

export function AttentionItemsCard({
  actionCounts,
  actionItemFilter,
  setActionItemFilter,
  filteredActionItems,
  loading,
}: AttentionItemsCardProps) {
  return (
    <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            TINDAK LANJUT
          </span>
          <h4 className="text-base font-black text-[#17313d]">Item perhatian</h4>
        </div>
        <span className="text-[10px] text-[#647783] font-bold">
          {actionCounts.all} Catatan
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActionItemFilter("ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
            actionItemFilter === "ALL"
              ? "bg-[#072d3f] text-white shadow-sm"
              : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
          }`}
        >
          Semua ({actionCounts.all})
        </button>
        <button
          type="button"
          onClick={() => setActionItemFilter("FINDINGS")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
            actionItemFilter === "FINDINGS"
              ? "bg-[#072d3f] text-white shadow-sm"
              : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
          }`}
        >
          Temuan ({actionCounts.findings})
        </button>
        <button
          type="button"
          onClick={() => setActionItemFilter("PENDING")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
            actionItemFilter === "PENDING"
              ? "bg-[#072d3f] text-white shadow-sm"
              : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
          }`}
        >
          Belum ({actionCounts.pending})
        </button>
      </div>

      <div
        className={`flex-1 space-y-2.5 max-h-[195px] overflow-y-auto pr-1 ${
          loading ? "opacity-60" : ""
        }`}
      >
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-start gap-2.5 animate-pulse"
            >
              <div className="w-6 h-6 rounded-lg bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-2.5 w-36 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : filteredActionItems.length === 0 ? (
          <div className="py-5 flex flex-col items-center justify-center text-center p-3 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-[#15803d] mb-1" />
            <span className="text-xs font-bold text-[#17313d]">
              {actionItemFilter === "FINDINGS" ? "Nihil Temuan Rusak/Kotor" : "Semua Jadwal Beres"}
            </span>
          </div>
        ) : (
          filteredActionItems.slice(0, 8).map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-2.5 rounded-xl border border-[#ffd100]/60 bg-[#fffdf5] flex items-start gap-2.5"
            >
              <div className="w-6 h-6 rounded-lg bg-[#ffd100]/30 text-[#9a6500] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-[#17313d] truncate">
                  {item.roomName} - {item.slotName}
                </h5>
                <p className="text-[10px] text-[#647783] truncate">{item.desc}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
