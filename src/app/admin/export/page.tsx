"use client";

import { useState, useEffect, Fragment } from "react";
import { Check, Download } from "lucide-react";

export default function ExportPage() {
  const [exportActiveTab, setExportActiveTab] = useState<"room" | "monthly">("room");
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [exportRoomId, setExportRoomId] = useState<string>("");
  const [exportStartDate, setExportStartDate] = useState<string>("2026-09-01");
  const [exportMonth, setExportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [exportPreviewData, setExportPreviewData] = useState<any>(null);

  const fetchExportPreview = async (roomId?: string, startDate?: string) => {
    const rId = roomId || exportRoomId;
    const sDate = startDate || exportStartDate;
    try {
      const res = await fetch(`/api/admin/export/preview?roomId=${rId}&startDate=${sDate}`).then((r) => r.json());
      if (res.ok) setExportPreviewData(res.data);
    } catch (err) {
      console.error("Gagal memuat preview export:", err);
    }
  };

  const loadData = async () => {
    try {
      const [roomsRes, previewRes] = await Promise.all([
        fetch("/api/admin/rooms").then((r) => r.json()),
        fetch(`/api/admin/export/preview?startDate=${exportStartDate}`).then((r) => r.json()),
      ]);

      if (roomsRes.ok && roomsRes.data.rooms) {
        setRoomsData(roomsRes.data.rooms);
        const defaultRoom = roomsRes.data.rooms.find((r: any) => r.name.includes("Ruang Rapat G. Utama")) || roomsRes.data.rooms[0];
        if (defaultRoom) setExportRoomId(defaultRoom.id);
      }
      if (previewRes.ok) setExportPreviewData(previewRes.data);
    } catch (err) {
      console.error("Gagal memuat data export:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
          LAPORAN OPERASIONAL
        </span>
        <h2 className="text-3xl font-black text-[#17313d]">Ekspor laporan Excel</h2>
        <p className="text-xs text-[#647783] mt-1">
          Buat laporan per ruangan atau rekap bulanan seluruh ruangan dengan format workbook PLN.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="inline-flex p-1 bg-[#e2e8f0] rounded-2xl">
        <button
          type="button"
          onClick={() => setExportActiveTab("room")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            exportActiveTab === "room"
              ? "bg-white text-[#0076a8] shadow-md"
              : "text-[#647783] hover:text-[#17313d]"
          }`}
        >
          Laporan per ruangan
        </button>
        <button
          type="button"
          onClick={() => setExportActiveTab("monthly")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            exportActiveTab === "monthly"
              ? "bg-white text-[#0076a8] shadow-md"
              : "text-[#647783] hover:text-[#17313d]"
          }`}
        >
          Rekap bulanan semua ruangan
        </button>
      </div>

      {/* ──────────────────────── TAB 1: LAPORAN PER RUANGAN ──────────────────────── */}
      {exportActiveTab === "room" && (
        <div className="space-y-6">
          {/* Card: Siapkan Laporan */}
          <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[#17313d]">Siapkan laporan</h4>
                <p className="text-xs text-[#647783] mt-0.5">
                  Pilih ruangan dan tanggal yang akan ditempatkan sebagai Hari ke-1.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#e8f5fa] text-[#0076a8] border border-[#bae6fd] rounded-xl text-xs font-black">
                XLSX
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Ruangan</label>
                <select
                  value={exportRoomId || (roomsData[0]?.id ?? "")}
                  onChange={(e) => {
                    setExportRoomId(e.target.value);
                    fetchExportPreview(e.target.value, exportStartDate);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#17313d]"
                >
                  {roomsData.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#94a3b8] block mt-1">
                  Template Excel mengikuti jenis ruangan yang dipilih.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Tanggal Hari ke-1</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => {
                    setExportStartDate(e.target.value);
                    fetchExportPreview(exportRoomId, e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#17313d]"
                />
                <span className="text-[10px] text-[#94a3b8] block mt-1">
                  Data pada tanggal ini ditempatkan di kolom Hari ke-1.
                </span>
              </div>
            </div>

            {/* Content Badges */}
            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex flex-wrap items-center gap-4 text-xs font-bold text-[#475569]">
              <span className="text-[#072d3f]">Isi laporan</span>
              <span className="flex items-center gap-1 text-[#157a55]">
                <Check className="w-3.5 h-3.5" /> Template workbook ruangan
              </span>
              <span className="flex items-center gap-1 text-[#157a55]">
                <Check className="w-3.5 h-3.5" /> Checklist hasil pemeriksaan
              </span>
              <span className="flex items-center gap-1 text-[#157a55]">
                <Check className="w-3.5 h-3.5" /> Foto pada sheet EVIDENCE
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => fetchExportPreview(exportRoomId, exportStartDate)}
                className="px-4 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] text-xs font-bold rounded-xl border border-[#cbd5e1] transition-all"
              >
                Terapkan filter & tampilkan preview
              </button>
              <span className="text-[11px] text-[#647783]">
                Preview sudah sesuai dengan filter aktif.
              </span>
            </div>

            <a
              href={`/api/admin/export?type=room&roomId=${exportRoomId || roomsData[0]?.id || ""}&startDate=${exportStartDate}`}
              download
              className="block w-full py-3.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-center font-bold rounded-xl shadow-md text-xs transition-all"
            >
              Buat & unduh Excel
            </a>
          </section>

          {/* Card: Preview Workbook */}
          <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[#17313d]">Preview workbook</h4>
                <p className="text-xs text-[#647783] mt-0.5">
                  Tampilan ini memperlihatkan hasil yang akan ditempatkan pada laporan utama dan sheet EVIDENCE.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#e8f5fa] text-[#0076a8] rounded-xl text-xs font-black">
                {exportPreviewData?.totalInspections || 1} pemeriksaan • {exportPreviewData?.totalResultsCount || 18} hasil
              </span>
            </div>

            {/* PLN Styled Excel Table Sheet Preview */}
            <div className="border border-[#cbd5e1] rounded-xl overflow-x-auto bg-white">
              <div className="min-w-[900px] p-6 space-y-4 font-mono text-xs">
                {/* Title Header */}
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-[#17313d] uppercase tracking-wide">
                    CEKLIS KEBERSIHAN RUANGAN & KESIAPAN RUANGAN
                  </h3>
                </div>

                {/* Metadata Block */}
                <div className="grid grid-cols-1 gap-1 text-[11px] text-[#17313d] border-b border-[#e2e8f0] pb-4">
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">LOKASI</span>
                    <span>: {exportPreviewData?.room?.name || "Ruang Rapat G. Utama"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">PERIODE</span>
                    <span>: {exportStartDate} s.d. {exportPreviewData?.endDate || "2026-09-06"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">Cleaning Service</span>
                    <span>: Arif Budi Hartono  [ ] Pagi  [ ] Sore</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">Cleaning Service</span>
                    <span>: Sulaiman  [✓] Pagi  [ ] Sore</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">Supervisor</span>
                    <span>: Ipal Hapidz</span>
                  </div>
                </div>

                {/* Excel Grid Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse border border-[#94a3b8] text-[10px]">
                    <thead>
                      {/* Row 1: Main Header */}
                      <tr className="bg-[#f8fafc]">
                        <th rowSpan={3} className="border border-[#94a3b8] p-2 w-10">NO</th>
                        <th rowSpan={3} className="border border-[#94a3b8] p-2 text-left w-64">
                          BAGIAN YANG DIPERIKSA
                        </th>
                        {(exportPreviewData?.days || [
                          { dayIndex: 1, dateFormatted: "1 September 2026", dateKey: "2026-09-01" },
                          { dayIndex: 2, dateFormatted: "2 September 2026", dateKey: "2026-09-02" },
                          { dayIndex: 3, dateFormatted: "3 September 2026", dateKey: "2026-09-03" },
                        ]).map((day: any) => (
                          <th key={day.dayIndex} colSpan={6} className="border border-[#94a3b8] p-1.5 bg-[#f1f5f9]">
                            <strong className="block text-[#17313d]">Hari ke-{day.dayIndex}</strong>
                            <span className="text-[9px] text-[#647783] font-normal">{day.dateFormatted}</span>
                          </th>
                        ))}
                      </tr>

                      {/* Row 2: Shift Headers */}
                      <tr>
                        {(exportPreviewData?.days || [1, 2, 3]).map((_, dIdx: number) => (
                          <Fragment key={dIdx}>
                            <th colSpan={2} className="border border-[#94a3b8] p-1 bg-[#e2e8f0] text-[#17313d] font-bold">
                              Pagi
                            </th>
                            <th colSpan={2} className="border border-[#94a3b8] p-1 bg-[#22c55e] text-white font-bold">
                              Sore
                            </th>
                            <th colSpan={2} className="border border-[#94a3b8] p-1 bg-[#eab308] text-white font-bold">
                              Inspeksi
                            </th>
                          </Fragment>
                        ))}
                      </tr>

                      {/* Row 3: Subheaders (Aktv / Fung) */}
                      <tr className="bg-[#f8fafc] text-[9px]">
                        {(exportPreviewData?.days || [1, 2, 3]).map((_, dIdx: number) => (
                          <Fragment key={dIdx}>
                            <th className="border border-[#94a3b8] p-0.5">Pos</th>
                            <th className="border border-[#94a3b8] p-0.5">Neg</th>
                            <th className="border border-[#94a3b8] p-0.5">Pos</th>
                            <th className="border border-[#94a3b8] p-0.5">Neg</th>
                            <th className="border border-[#94a3b8] p-0.5">Pos</th>
                            <th className="border border-[#94a3b8] p-0.5">Neg</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {(exportPreviewData?.activities || [
                        { id: "1", name: "LANTAI" },
                        { id: "2", name: "LANGIT-LANGIT / PLAFON" },
                        { id: "3", name: "DINDING" },
                        { id: "4", name: "TEMPAT SAMPAH" },
                        { id: "5", name: "BAU RUANGAN" },
                        { id: "6", name: "SELASAR" },
                        { id: "7", name: "VENTILASI / JENDELA" },
                      ]).map((act: any, idx: number) => (
                        <tr key={act.id} className="hover:bg-[#f8fafc]">
                          <td className="border border-[#94a3b8] p-1 font-bold">{idx + 1}</td>
                          <td className="border border-[#94a3b8] p-1 text-left font-bold text-[#17313d]">
                            {act.name}
                          </td>
                          {(exportPreviewData?.days || [{ dateKey: "2026-09-01" }, { dateKey: "2026-09-02" }, { dateKey: "2026-09-03" }]).map((day: any, dIdx: number) => {
                            const isDay1 = dIdx === 0;

                            return (
                              <Fragment key={dIdx}>
                                {/* Pagi Pos */}
                                <td className="border border-[#94a3b8] p-1 text-[#dc2626] font-black">
                                  {isDay1 ? "✓" : ""}
                                </td>
                                {/* Pagi Neg */}
                                <td className="border border-[#94a3b8] p-1"></td>
                                {/* Sore Pos */}
                                <td className="border border-[#94a3b8] p-1"></td>
                                {/* Sore Neg */}
                                <td className="border border-[#94a3b8] p-1"></td>
                                {/* Inspeksi Pos */}
                                <td className="border border-[#94a3b8] p-1"></td>
                                {/* Inspeksi Neg */}
                                <td className="border border-[#94a3b8] p-1"></td>
                              </Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ──────────────────────── TAB 2: REKAP BULANAN SEMUA RUANGAN ──────────────────────── */}
      {exportActiveTab === "monthly" && (
        <div className="bg-white border border-[#d8e3ea] rounded-2xl p-8 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-xl font-black text-[#17313d]">Ekspor Rekap Bulanan Semua Ruangan</h3>
            <p className="text-xs text-[#647783] mt-1">
              Unduh buku laporan pemantauan kebersihan seluruh 26 ruangan format matriks 4-warna resmi PLN.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#647783] block mb-1">Pilih Periode Bulan</label>
              <input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#17313d]"
              />
            </div>

            <div className="p-4 bg-[#f8fafc] border-l-4 border-[#0076a8] rounded-r-xl text-xs text-[#475569] space-y-1.5">
              <strong className="text-[#0076a8] block mb-1">Standar Rekapitulasi 4 Warna:</strong>
              <p className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]"></span>
                <span>🔴 <strong>Merah (✕)</strong>: Tidak ada sesi yang disubmit pada tanggal tersebut</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
                <span>🟡 <strong>Kuning (◐)</strong>: Ada sesi disubmit tapi sesi petugas belum lengkap</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7e22ce]"></span>
                <span>🟣 <strong>Ungu (◈)</strong>: Sesi petugas sudah lengkap, tetapi belum diinspeksi SPV</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]"></span>
                <span>🟢 <strong>Hijau (●)</strong>: Seluruh sesi (petugas & SPV) telah selesai lengkap</span>
              </p>
            </div>

            <a
              href={`/api/admin/export?type=monthly&month=${exportMonth}`}
              download
              className="w-full py-3.5 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Buat & unduh Excel Rekap Bulanan (.xlsx)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
