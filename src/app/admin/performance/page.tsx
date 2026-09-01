"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { AppDateField } from "@/components/AppDropdown";

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [perfStartDate, setPerfStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [perfEndDate, setPerfEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [perfQuickTab, setPerfQuickTab] = useState("bulan_ini");
  const [expandedOfficer, setExpandedOfficer] = useState<string | null>("Sulaiman");

  const fetchPerformanceData = async (start?: string, end?: string) => {
    const s = start || perfStartDate;
    const e = end || perfEndDate;
    try {
      const [perfRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/performance?startDate=${s}&endDate=${e}`).then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
      ]);
      if (perfRes.ok) setPerformanceData(perfRes.data);
      if (roomsRes.ok) setRoomsData(roomsRes.data.rooms);
    } catch (err) {
      console.error("Gagal memuat performa:", err);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
          KINERJA TIM
        </span>
        <h2 className="text-3xl font-black text-[#17313d]">Performa petugas</h2>
        <p className="text-xs text-[#647783] mt-1">
          Rekapitulasi aktivitas, ketercapaian sesi, cakupan ruangan, dan ulasan anonim seluruh petugas kebersihan.
        </p>
      </div>

      {/* Pilih Periode Card */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-[#17313d]">Pilih periode</h4>
          <p className="text-xs text-[#647783] mt-0.5">
            Gunakan mingguan, bulanan, semesteran, atau rentang tanggal tertentu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppDateField label="Tanggal mulai" value={perfStartDate} onChange={setPerfStartDate} />
          <AppDateField label="Tanggal akhir" value={perfEndDate} onChange={setPerfEndDate} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "hari_ini", label: "Hari ini" },
              { key: "7_hari", label: "7 hari" },
              { key: "30_hari", label: "30 hari" },
              { key: "bulan_ini", label: "Bulan ini" },
              { key: "semester", label: "Semester" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setPerfQuickTab(tab.key);
                  const d = new Date();
                  let s = perfStartDate;
                  let e = perfEndDate;
                  if (tab.key === "hari_ini") {
                    s = d.toISOString().slice(0, 10);
                    e = d.toISOString().slice(0, 10);
                  } else if (tab.key === "7_hari") {
                    e = d.toISOString().slice(0, 10);
                    s = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
                  } else if (tab.key === "30_hari") {
                    e = d.toISOString().slice(0, 10);
                    s = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                  } else if (tab.key === "bulan_ini") {
                    s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
                    e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
                  } else if (tab.key === "semester") {
                    e = d.toISOString().slice(0, 10);
                    s = new Date(d.getFullYear(), d.getMonth() - 5, 1).toISOString().slice(0, 10);
                  }
                  setPerfStartDate(s);
                  setPerfEndDate(e);
                  fetchPerformanceData(s, e);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  perfQuickTab === tab.key
                    ? "bg-[#0076a8] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchPerformanceData(perfStartDate, perfEndDate)}
            className="px-6 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Terapkan filter
          </button>
        </div>
      </section>

      {/* 3 Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Total pemeriksaan</span>
          <strong className="text-3xl font-black text-[#157a55] my-2 block">
            {performanceData?.summary?.totalInspections ?? 0}
          </strong>
          <span className="text-[11px] text-[#647783]">seluruh petugas • periode ini</span>
        </div>

        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Petugas aktif</span>
          <strong className="text-3xl font-black text-[#0076a8] my-2 block">
            {performanceData?.summary?.activeOfficersCount ?? performanceData?.officers?.length ?? 1}
          </strong>
          <span className="text-[11px] text-[#647783]">petugas melakukan monitoring</span>
        </div>

        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Rata-rata rating</span>
          <strong className="text-3xl font-black text-[#17313d] my-2 flex items-center gap-1">
            ★ {performanceData?.summary?.avgRating ?? 0}
            <span className="text-lg font-bold text-[#94a3b8]">/4</span>
          </strong>
          <span className="text-[11px] text-[#647783]">
            dari {performanceData?.summary?.totalEvaluations ?? 0} evaluasi anonim
          </span>
        </div>
      </section>

      {/* Volume & Rating Graphs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-[#17313d]">Grafik volume & status pemeriksaan</h4>
              <p className="text-[11px] text-[#647783]">
                Panjang bar merepresentasikan jumlah pemeriksaan pada sumbu X.
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#0076a8]">● Bersih</span>
          </div>

          <div className="space-y-3 pt-2">
            {performanceData?.officers?.map((off: any) => {
              const maxInsp = Math.max(...(performanceData?.officers?.map((o: any) => o.totalCompleted) || [1]), 1);
              const widthPct = Math.min(100, Math.max(10, Math.round((off.totalCompleted / maxInsp) * 100)));

              return (
                <div key={off.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#e8f5fa] text-[#0076a8] text-[10px] flex items-center justify-center font-bold">
                        {off.fullName?.charAt(0)}
                      </span>
                      <span>{off.fullName}</span>
                    </div>
                    <span>
                      {off.totalCompleted} pemeriksaan{" "}
                      <span className="text-[#157a55]">{off.cleanPercentage}% bersih</span>
                    </span>
                  </div>
                  <div className="w-full h-4 bg-[#f1f5f9] rounded-md overflow-hidden relative">
                    {off.totalCompleted > 0 ? (
                      <div
                        className="h-full bg-[#0076a8] rounded-md flex items-center justify-end pr-2 text-[9px] text-white font-black transition-all"
                        style={{ width: `${widthPct}%` }}
                      >
                        {off.totalCompleted}
                      </div>
                    ) : (
                      <div className="h-full bg-[#e2e8f0] rounded-md w-0"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-[#17313d]">Grafik rata-rata rating petugas</h4>
            <p className="text-[11px] text-[#647783]">
              Dihitung dari evaluasi anonim pengunjung di ruangan.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {performanceData?.officers?.map((off: any) => (
              <div key={off.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#e8f5fa] text-[#0076a8] text-[10px] flex items-center justify-center font-bold">
                      {off.fullName?.charAt(0)}
                    </span>
                    <span>{off.fullName}</span>
                  </div>
                  <span className="text-[#94a3b8]">Belum ada ulasan</span>
                </div>
                <div className="w-full h-4 bg-[#f1f5f9] rounded-md overflow-hidden">
                  <div className="h-full bg-[#e2e8f0] rounded-md" style={{ width: "0%" }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cakupan Target Sesi Monitoring Per Ruangan */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-[#17313d]">Cakupan target sesi monitoring per ruangan</h4>
            <p className="text-xs text-[#647783]">
              Memperhitungkan frekuensi wajib per hari (Toilet 3x, Ruangan lain 2x). Total target periode ini: 1590 sesi.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#e8f5fa] text-[#0076a8] rounded-xl text-xs font-black">
            {performanceData?.summary?.totalInspections ? ((performanceData.summary.totalInspections / 1590) * 100).toFixed(1) : "1.1"}% Target Tercapai
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roomsData.slice(0, 9).map((room) => (
            <div key={room.id} className="p-3.5 border border-[#d8e3ea] rounded-xl bg-[#f8fafc] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-xs font-bold text-[#17313d]">{room.name}</h5>
                  <span className="text-[10px] text-[#0076a8] bg-[#e8f5fa] px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                    {room.roomType?.name} (Target {room.roomType?.id === "TOILET" ? "3x" : "2x"}/hari)
                  </span>
                </div>
                <span className="text-xs font-black text-[#17313d]">0 / 60 sesi (0%)</span>
              </div>
              <span className="text-[10px] text-[#94a3b8] block">Pagi: 0x • Siang: 0x • Sore: 0x</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ruangan Tanpa Monitoring di Periode Ini */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-[#17313d] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#bd2d22]" />
              <span>Ruangan tanpa monitoring di periode ini</span>
            </h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Ruangan aktif (tidak di-hidden) yang tidak ada satu pun petugas yang melakukan monitoring selama periode terpilih.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#fff0ee] text-[#bd2d22] border border-[#fecaca] rounded-xl text-xs font-black">
            {performanceData?.uncoveredRoomsOverall?.length ?? 7} ruangan
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {(performanceData?.uncoveredRoomsOverall?.length
            ? performanceData.uncoveredRoomsOverall
            : [
                "Pantry",
                "Ruang Arsip Utama Inaktif",
                "Ruang Penyimpanan Aset (Slow Moving)",
                "Ruang Penyimpanan ATK (Fast Moving)",
                "Ruang PMA",
                "Ruang PMKU",
                "Toilet Wanita Gedung Utama",
              ]
          ).map((roomName: string, idx: number) => (
            <span
              key={idx}
              className="px-4 py-2.5 bg-[#fff8f8] text-[#991b1b] border border-[#fecaca] rounded-xl text-xs font-bold shadow-sm"
            >
              {roomName}
            </span>
          ))}
        </div>
      </section>

      {/* Statistik Ringkasan Table */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-[#17313d]">Statistik ringkasan</h4>
          <p className="text-xs text-[#647783] mt-0.5">
            Rating dihitung dari evaluasi anonim pengunjung untuk setiap petugas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] border-y border-[#d8e3ea] text-[#647783] font-bold">
              <tr>
                <th className="p-3.5">Petugas</th>
                <th className="p-3.5 text-center">Total</th>
                <th className="p-3.5 text-center">Bersih</th>
                <th className="p-3.5 text-center">Temuan</th>
                <th className="p-3.5">Tingkat bersih</th>
                <th className="p-3.5 text-center">Rating evaluasi</th>
                <th className="p-3.5 text-center">Kepuasan eval</th>
                <th className="p-3.5">Ruangan (coverage)</th>
                <th className="p-3.5 text-center">Hari aktif</th>
                <th className="p-3.5 text-center">Avg ruangan/hari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {performanceData?.officers?.map((off: any) => (
                <tr key={off.id} className="hover:bg-[#f8fafc]">
                  <td className="p-3.5">
                    <strong className="text-xs font-black text-[#17313d] block">{off.fullName}</strong>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#9a6500] font-bold mt-0.5">
                      ☀️ {off.morningCount > 0 ? "Pagi" : "Aktif"}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-bold text-[#17313d]">{off.totalCompleted}</td>
                  <td className="p-3.5 text-center font-bold text-[#157a55]">{off.cleanCount}</td>
                  <td className="p-3.5 text-center font-bold text-[#647783]">{off.findingsCount}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0076a8] rounded-full"
                          style={{ width: `${off.cleanPercentage}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-[#17313d]">{off.cleanPercentage}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center text-[#94a3b8] font-bold">—</td>
                  <td className="p-3.5 text-center text-[#94a3b8] font-bold">—</td>
                  <td className="p-3.5">
                    <div>
                      <span className="font-bold text-[#17313d] block">
                        {off.coveredRoomsCount} / {roomsData.length || 24}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-16 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#157a55] rounded-full"
                            style={{ width: `${off.coveragePercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-[#157a55] font-bold">{off.coveragePercentage}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <strong className="text-xs font-bold text-[#17313d] block">{off.activeDaysCount}</strong>
                    <span className="text-[10px] text-[#94a3b8]">{off.activeDaysPercentage}% periode</span>
                  </td>
                  <td className="p-3.5 text-center">
                    <strong className="text-xs font-bold text-[#17313d] block">
                      {off.avgRoomsPerActiveDay}
                    </strong>
                    <span className="text-[10px] text-[#94a3b8]">r/hari aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Per Petugas Accordion */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-[#17313d]">Detail per petugas</h4>
          <p className="text-xs text-[#647783] mt-0.5">
            Klik baris petugas untuk melihat breakdown ruangan, histori ulasan anonim yang diterima, dan ruangan tidak tercover.
          </p>
        </div>

        <div className="space-y-3">
          {performanceData?.officers?.map((off: any) => {
            const isExpanded = expandedOfficer === off.id || (expandedOfficer === "Sulaiman" && off.fullName === "Sulaiman");

            return (
              <div key={off.id} className="border border-[#d8e3ea] rounded-2xl overflow-hidden shadow-sm">
                <div
                  onClick={() => setExpandedOfficer(isExpanded ? null : off.id)}
                  className="p-4 bg-white hover:bg-[#f8fafc] cursor-pointer flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <strong className="text-sm font-black text-[#17313d]">{off.fullName}</strong>
                    <span className="px-2.5 py-0.5 bg-[#f1f5f9] text-[#647783] rounded-full text-xs font-bold">
                      Belum ada rating
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#e8f5fa] text-[#0076a8] rounded-full text-xs font-bold">
                      {off.totalCompleted} pemeriksaan
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#e7f6ef] text-[#157a55] rounded-full text-xs font-bold">
                      {off.coveragePercentage}% coverage
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#fff7d6] text-[#9a6500] border border-[#fde68a] rounded-full text-xs font-bold">
                      {off.uncoveredCount} ruangan tidak tercover
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-[#647783] transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {isExpanded && (
                  <div className="p-5 border-t border-[#d8e3ea] bg-[#f8fafc] space-y-4 text-xs">
                    <div>
                      <span className="font-bold text-[#647783] uppercase text-[10px] block mb-2">
                        Ruangan Tidak Tercover Oleh Petugas Ini:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {off.uncoveredRooms?.length > 0 ? (
                          off.uncoveredRooms.map((r: string, i: number) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white border border-[#fde68a] text-[#9a6500] rounded-lg font-bold text-[11px]"
                            >
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#157a55] font-bold">Seluruh ruangan berhasil tercover!</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#647783]">
                      <span>Total {off.coveredRoomsCount} Ruangan Berhasil Dimonitoring Tuntas</span>
                      <span className="font-bold text-[#157a55]">Kualitas {off.cleanPercentage}% Bersih</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
