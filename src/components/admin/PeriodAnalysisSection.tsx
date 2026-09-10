"use client";

import React, { useMemo } from "react";
import { DashboardData } from "@/types/dashboard";

interface PeriodAnalysisSectionProps {
  appliedPeriod: string;
  dashboardData: DashboardData | null;
  loading: boolean;
}

export function PeriodAnalysisSection({
  appliedPeriod,
  dashboardData,
  loading,
}: PeriodAnalysisSectionProps) {
  const maxTrendValue = useMemo(() => {
    if (!dashboardData?.dailyTrend || dashboardData.dailyTrend.length === 0) return 20;
    const maxVal = Math.max(...dashboardData.dailyTrend.map((d) => d.total));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 20;
  }, [dashboardData]);

  return (
    <section className="space-y-4 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            ANALISIS PERIODE
          </span>
          <h3 className="text-xl font-black text-[#17313d] capitalize">
            Bulan {appliedPeriod}
          </h3>
          <p className="text-xs text-[#647783] mt-0.5">
            Tren operasional dan kepuasan pengguna mengikuti periode yang dipilih.
          </p>
        </div>

        <div className={`flex items-center gap-6 text-right ${loading ? "opacity-40" : ""}`}>
          <div>
            {loading ? (
              <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" />
            ) : (
              <strong className="text-xl font-black text-[#17313d] block">
                {dashboardData?.metrics?.monthlyInspectionsCount ?? 0}
              </strong>
            )}
            <span className="text-[11px] text-[#718c99]">Pemeriksaan</span>
          </div>
          <div>
            {loading ? (
              <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" />
            ) : (
              <strong className="text-xl font-black text-[#157a55] block">
                {dashboardData?.metrics?.monthlyCleanCount ?? 0}
              </strong>
            )}
            <span className="text-[11px] text-[#718c99]">Bersih</span>
          </div>
          <div>
            {loading ? (
              <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" />
            ) : (
              <strong className="text-xl font-black text-[#bd2d22] block">
                {dashboardData?.metrics?.monthlyFindingCount ?? 0}
              </strong>
            )}
            <span className="text-[11px] text-[#718c99]">Dengan temuan</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Suara Pengguna */}
        <div className="lg:col-span-5 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              SUARA PENGGUNA
            </span>
            <h4 className="text-base font-extrabold text-[#17313d]">Ringkasan kepuasan bulan ini</h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Rating anonim dari QR evaluasi pada periode filter.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-[#f1f5f9]">
            <div>
              <strong className="text-2xl font-black text-[#17313d] block">
                {dashboardData?.metrics?.satisfactionRate ?? 100}%
              </strong>
              <span className="text-[10px] text-[#647783]">puas</span>
            </div>
            <div>
              <strong className="text-2xl font-black text-[#17313d] block">
                {dashboardData?.metrics?.averageRating ?? "0.0"}
              </strong>
              <span className="text-[10px] text-[#647783]">rata-rata dari 4</span>
            </div>
            <div>
              <strong className="text-2xl font-black text-[#17313d] block">
                {dashboardData?.metrics?.totalEvaluations ?? 0}
              </strong>
              <span className="text-[10px] text-[#647783]">tanggapan</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[#647783] block mb-2 uppercase">
              Distribusi Rating
            </span>
            <div className="space-y-2 text-xs text-[#647783]">
              {[4, 3, 2, 1].map((star) => {
                const totalEv = dashboardData?.metrics?.totalEvaluations || 1;
                const count = dashboardData?.ratingDist?.[star] || 0;
                const pct = Math.round((count / totalEv) * 100);

                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-3 text-[11px] font-bold">{star}</span>
                    <div className="flex-1 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0076a8] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-[11px] font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Live Bar Chart Tren Operasional */}
        <div className="lg:col-span-7 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
                TREN OPERASIONAL
              </span>
              <h4 className="text-base font-extrabold text-[#17313d]">Aktivitas pemeriksaan bulan ini</h4>
              <p className="text-xs text-[#647783] mt-0.5">
                Jumlah kiriman harian dan temuan yang perlu ditindaklanjuti.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-[#0076a8]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0076a8]" /> Pemeriksaan
              </span>
              <span className="flex items-center gap-1 text-[#eab308]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#eab308]" /> Temuan
              </span>
            </div>
          </div>

          {/* Bars container */}
          <div
            className={`h-48 flex items-end gap-1 sm:gap-1.5 pt-10 pb-2 px-2 border-b border-[#e2e8f0] overflow-x-auto overflow-y-visible ${
              loading ? "opacity-40" : ""
            }`}
            style={{ scrollbarGutter: "stable" }}
          >
            {loading
              ? Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="flex-1 min-w-[8px] h-full flex items-end justify-center pb-1">
                    <div
                      className="w-full bg-[#e2e8f0] animate-pulse rounded-t-sm"
                      style={{ height: `${10 + Math.random() * 60}%` }}
                    />
                  </div>
                ))
              : (dashboardData?.dailyTrend || []).map((item) => {
                  const count = item.total || 0;
                  const findings = item.finding || 0;
                  const heightPct =
                    count > 0 ? Math.min(100, Math.max(8, (count / maxTrendValue) * 100)) : 3;

                  const isLeftEdge = item.day <= 2;
                  const isRightEdge =
                    item.day >= (dashboardData?.dailyTrend?.length || 31) - 1;

                  return (
                    <div
                      key={item.day}
                      className="flex-1 min-w-[8px] flex flex-col items-center h-full group relative"
                    >
                      {/* Bar track */}
                      <div className="w-full flex-1 flex items-end justify-center relative">
                        {/* Tooltip on hover */}
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#072d3f] text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-30 ${
                            isLeftEdge
                              ? "left-0 -translate-x-0"
                              : isRightEdge
                              ? "right-0 left-auto translate-x-0"
                              : "left-1/2 -translate-x-1/2"
                          }`}
                        >
                          <div>Tgl {item.day}: {count} Sesi</div>
                          {findings > 0 && <div className="text-[#ffd100] font-black">{findings} Temuan</div>}
                        </div>

                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            findings > 0
                              ? "bg-[#eab308] group-hover:bg-[#ca8a04]"
                              : count > 0
                              ? "bg-[#0076a8] group-hover:bg-[#00577d]"
                              : "bg-[#f1f5f9]"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {/* Date label */}
                      <div className="h-4 flex items-center justify-center pt-1 w-full">
                        <span className="text-[8px] text-[#94a3b8] font-bold leading-none block">
                          {item.day % 4 === 1 ? item.day : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
}
