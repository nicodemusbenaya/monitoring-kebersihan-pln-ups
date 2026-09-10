"use client";

import React from "react";
import { AppDropdown, MonthDropdown } from "@/components/AppDropdown";

interface CakupanDataFilterProps {
  hasFilterActive: boolean;
  filterPeriodLabel: string;
  pendingRoomOptions: { value: string; label: string }[];
  appliedRoomFilter: string;
  pendingRoomFilter: string;
  setPendingRoomFilter: (val: string) => void;
  pendingPeriod: string;
  setPendingPeriod: (val: string) => void;
  pendingIsDirty: boolean;
  onApplyFilter: () => void;
  loading: boolean;
}

export function CakupanDataFilter({
  hasFilterActive,
  filterPeriodLabel,
  pendingRoomOptions,
  appliedRoomFilter,
  pendingRoomFilter,
  setPendingRoomFilter,
  pendingPeriod,
  setPendingPeriod,
  pendingIsDirty,
  onApplyFilter,
  loading,
}: CakupanDataFilterProps) {
  const currentRoomLabel =
    pendingRoomOptions.find((o) => o.value === appliedRoomFilter)?.label || "Semua ruangan";

  return (
    <section className="bg-white border border-[#d8e3ea] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
          CAKUPAN DATA
        </span>
        <h3 className="text-base font-extrabold text-[#17313d] capitalize">
          {hasFilterActive ? `${currentRoomLabel} · ${filterPeriodLabel}` : "Semua ruangan"}
        </h3>
        <p className="text-xs text-[#647783] mt-0.5">
          Ruangan berlaku untuk seluruh ringkasan; bulan hanya untuk bagian analisis periode.{" "}
          {pendingIsDirty && (
            <span className="text-[#b45309] font-bold">· Ada perubahan belum diterapkan</span>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full lg:w-auto">
        <div className="flex-1 sm:flex-none">
          <AppDropdown
            label="Ruangan"
            value={pendingRoomFilter}
            onChange={setPendingRoomFilter}
            options={pendingRoomOptions}
            placeholder="Semua ruangan"
          />
        </div>
        <div className="flex-1 sm:flex-none">
          <MonthDropdown
            label="Periode analisis"
            value={pendingPeriod}
            onChange={setPendingPeriod}
          />
        </div>
        <button
          type="button"
          onClick={onApplyFilter}
          disabled={loading}
          className={`h-[44px] px-6 bg-[#0076a8] hover:bg-[#00577d] disabled:bg-[#94a3b8] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
            loading ? "cursor-wait" : ""
          }`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Menerapkan...</span>
            </>
          ) : (
            <span>Terapkan</span>
          )}
        </button>
      </div>
    </section>
  );
}
