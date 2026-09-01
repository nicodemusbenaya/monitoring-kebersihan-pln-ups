"use client";

import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { AppDropdown, AppDateField } from "@/components/AppDropdown";

export default function EvaluationsPage() {
  const [evaluationsData, setEvaluationsData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [evalStartDate, setEvalStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [evalEndDate, setEvalEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [evalRoomFilter, setEvalRoomFilter] = useState("ALL");
  const [evalQuickTab, setEvalQuickTab] = useState("bulan_ini");

  const roomOptions = useMemo(() => [{ value: "ALL", label: "Semua ruangan" }, ...roomsData.filter((r: any) => !r.hidden).map((r: any) => ({ value: r.id, label: r.name }))], [roomsData]);

  const fetchEvaluationsData = async (start?: string, end?: string, room?: string) => {
    const s = start || evalStartDate;
    const e = end || evalEndDate;
    const rId = room || evalRoomFilter;
    try {
      const [evalRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/evaluations?startDate=${s}&endDate=${e}&roomId=${rId}`).then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
      ]);
      if (evalRes.ok) setEvaluationsData(evalRes.data);
      if (roomsRes.ok) setRoomsData(roomsRes.data.rooms);
    } catch (err) {
      console.error("Gagal memuat kepuasan:", err);
    }
  };

  useEffect(() => {
    fetchEvaluationsData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
          SUARA PENGGUNA
        </span>
        <h2 className="text-3xl font-black text-[#17313d]">Dashboard kepuasan</h2>
        <p className="text-xs text-[#647783] mt-1">
          Rekap rating anonim dari QR evaluasi. Nama pengisi tidak pernah dicatat.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppDateField label="Tanggal mulai" value={evalStartDate} onChange={setEvalStartDate} />
          <AppDateField label="Tanggal akhir" value={evalEndDate} onChange={setEvalEndDate} />
          <AppDropdown
            label="Ruangan"
            value={evalRoomFilter}
            onChange={setEvalRoomFilter}
            options={roomOptions}
          />
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
                  setEvalQuickTab(tab.key);
                  const d = new Date();
                  let s = evalStartDate;
                  let e = evalEndDate;
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
                  setEvalStartDate(s);
                  setEvalEndDate(e);
                  fetchEvaluationsData(s, e, evalRoomFilter);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  evalQuickTab === tab.key
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
            onClick={() => fetchEvaluationsData(evalStartDate, evalEndDate, evalRoomFilter)}
            className="px-6 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Terapkan filter
          </button>
        </div>
      </section>

      {/* 3 Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#d8e3ea] border-t-4 border-t-[#157a55] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Tingkat kepuasan</span>
          <strong className="text-3xl font-black text-[#157a55] my-2 block">
            {evaluationsData?.summary?.satisfactionRate ?? 0}%
          </strong>
          <span className="text-[11px] text-[#647783]">
            rating 3–4 dari {evaluationsData?.summary?.totalEvaluations ?? 0} tanggapan
          </span>
        </div>

        <div className="bg-white border border-[#d8e3ea] border-t-4 border-t-[#0076a8] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Rata-rata rating</span>
          <strong className="text-3xl font-black text-[#0076a8] my-2 block">
            {evaluationsData?.summary?.averageRating ?? 0}
            <span className="text-lg font-bold text-[#94a3b8]">/4</span>
          </strong>
          <span className="text-[11px] text-[#647783]">Semakin tinggi semakin baik</span>
        </div>

        <div className="bg-white border border-[#d8e3ea] border-t-4 border-t-[#bd2d22] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#647783] block">Perlu perhatian</span>
          <strong className="text-3xl font-black text-[#bd2d22] my-2 block">
            {evaluationsData?.summary?.attentionCount ?? 0}
          </strong>
          <span className="text-[11px] text-[#647783]">rating 1–2</span>
        </div>
      </section>

      {/* Middle 2-Column: Distribusi Rating & Aspek Perlu Ditingkatkan */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Distribusi Rating */}
        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-extrabold text-[#17313d]">Distribusi rating</h4>
              <p className="text-xs text-[#647783] mt-0.5">
                Komposisi seluruh tanggapan pada periode ini.
              </p>
            </div>
            <span className="px-2.5 py-0.5 bg-[#f1f5f9] text-[#647783] rounded-lg text-xs font-bold font-mono">
              1-4
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(evaluationsData?.distribution || [
              { rating: 1, label: "Sangat perlu ditingkatkan", count: 0, percentage: 0 },
              { rating: 2, label: "Perlu ditingkatkan", count: 0, percentage: 0 },
              { rating: 3, label: "Baik", count: 0, percentage: 0 },
              { rating: 4, label: "Sangat baik", count: 0, percentage: 0 },
            ]).map((row: any) => (
              <div key={row.rating} className="flex items-center gap-3 text-xs">
                <span className="w-6 h-6 rounded-md bg-[#ffd100] text-[#072d3f] font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {row.rating}
                </span>
                <span className="w-40 font-bold text-[#17313d] truncate">{row.label}</span>
                <div className="flex-1 h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0076a8] rounded-full transition-all"
                    style={{ width: `${row.percentage}%` }}
                  ></div>
                </div>
                <span className="w-14 text-right font-bold text-[#647783]">
                  {row.count} ({row.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Aspek yang Perlu Ditingkatkan */}
        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-base font-extrabold text-[#17313d]">Aspek yang perlu ditingkatkan</h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Persentase kedua dihitung dari rating rendah.
            </p>
          </div>

          <div className="overflow-x-auto pt-2 -mx-6 px-6" style={{ scrollbarGutter: 'stable' } as any}>
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-[#f8fafc] border-y border-[#d8e3ea] text-[#647783] font-bold">
                <tr>
                  <th className="p-3">Aspek</th>
                  <th className="p-3 text-center">Dipilih</th>
                  <th className="p-3 text-center">Semua rating</th>
                  <th className="p-3 text-center">Rating rendah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {evaluationsData?.aspectsAnalysis?.length > 0 ? (
                  evaluationsData.aspectsAnalysis.map((asp: any, i: number) => (
                    <tr key={i} className="hover:bg-[#f8fafc]">
                      <td className="p-3 font-bold text-[#17313d]">{asp.name}</td>
                      <td className="p-3 text-center font-bold">{asp.chosenCount}</td>
                      <td className="p-3 text-center">{asp.allRatingsPercentage}%</td>
                      <td className="p-3 text-center font-bold text-[#bd2d22]">{asp.lowRatingsPercentage}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#94a3b8] font-medium">
                      Belum ada aspek yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom: Histori Evaluasi Table */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-extrabold text-[#17313d]">Histori evaluasi</h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Waktu tercatat • Identitas pengisi tidak dicatat • Petugas terakhir = monitoring terakhir sebelum evaluasi dikirim.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#0076a8]" />
              <span>Unduh Excel</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] border-y border-[#d8e3ea] text-[#647783] font-bold">
              <tr>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Ruangan</th>
                <th className="p-3.5 text-center">Rating</th>
                <th className="p-3.5">Aspek</th>
                <th className="p-3.5">Komentar</th>
                <th className="p-3.5">Petugas terakhir ⓘ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {evaluationsData?.history?.length > 0 ? (
                evaluationsData.history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-[#f8fafc]">
                    <td className="p-3.5 text-[#647783] whitespace-nowrap">{h.timeFormatted}</td>
                    <td className="p-3.5 font-bold text-[#17313d]">{h.roomName}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#fff7d6] text-[#9a6500]">
                        ★ {h.rating}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {h.aspects?.length > 0 ? (
                          h.aspects.map((asp: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded-md text-[10px] font-semibold">
                              {asp}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-[#475569] max-w-xs truncate">{h.comment}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-[#e8f5fa] text-[#0076a8] rounded-md text-[11px] font-bold">
                        {h.lastOfficer}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#94a3b8] font-medium">
                    Belum ada histori pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
