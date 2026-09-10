"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, Sparkles, User } from "lucide-react";
import { RecentActivityItem } from "@/types/dashboard";

interface RecentActivityFeedProps {
  recentActivities: RecentActivityItem[];
  onReopen: (inspectionId: string) => void;
  reopenId: string | null;
}

export function RecentActivityFeed({
  recentActivities,
  onReopen,
  reopenId,
}: RecentActivityFeedProps) {
  return (
    <section className="bg-white border border-[#d8e3ea] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0076a8]/10 text-[#0076a8] flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              LOG AKTIFITAS LIVE
            </span>
            <h3 className="text-xl font-black text-[#17313d]">Aktivitas Terbaru</h3>
            <p className="text-xs text-[#647783] mt-0.5">
              Daftar kiriman checklist ruangan dan log pemeriksaan terkini oleh petugas & pengawas.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-[#f8fafc] border border-[#d8e3ea] rounded-xl text-xs font-bold text-[#647783] self-start sm:self-auto">
          {recentActivities.length} Aktivitas Terkini
        </span>
      </div>

      {/* Activity Feed Cards List */}
      <div className="divide-y divide-[#f1f5f9] max-h-[600px] overflow-y-auto pr-2 space-y-3">
        {recentActivities.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#647783]">
            Belum ada data riwayat aktivitas yang tercatat.
          </div>
        ) : (
          recentActivities.map((act) => {
            const isClean = act.overallStatus === "BERSIH";

            return (
              <div
                key={act.id}
                className="pt-3 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8fafc] p-3 rounded-2xl transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon / Role Badge */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-black text-xs ${
                      isClean
                        ? "bg-[#dcfce7] text-[#15803d]"
                        : "bg-[#fee2e2] text-[#b91c1c]"
                    }`}
                  >
                    {isClean ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-black text-[#17313d]">{act.roomName}</strong>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          act.slotCode === "PAGI"
                            ? "bg-[#e0f2fe] text-[#0369a1]"
                            : act.slotCode === "SORE"
                            ? "bg-[#fef3c7] text-[#b45309]"
                            : "bg-[#f3e8ff] text-[#7e22ce]"
                        }`}
                      >
                        {act.slotName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          isClean
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {isClean ? "Bersih" : `${act.dirtyCount} Temuan`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#647783]">
                      <span className="flex items-center gap-1 font-bold text-[#17313d]">
                        <User className="w-3.5 h-3.5 text-[#0076a8]" />
                        {act.officerName}
                        <span className="text-[10px] font-normal text-[#94a3b8]">({act.officerRole})</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
                        {act.displayTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buka Kembali Laporan */}
                <button
                  type="button"
                  onClick={() => onReopen(act.id)}
                  disabled={reopenId === act.id}
                  className="self-end sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#d8e3ea] hover:border-[#0076a8] hover:text-[#0076a8] text-[#17313d] rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-60"
                  title="Hapus laporan ini agar petugas bisa isi ulang"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${reopenId === act.id ? "animate-spin" : ""}`} />
                  {reopenId === act.id ? "Membuka..." : "Buka Kembali"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
