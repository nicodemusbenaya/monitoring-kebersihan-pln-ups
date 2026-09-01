"use client";

import { useState, useEffect, Fragment } from "react";
import { Check, Download, FileSpreadsheet, Database } from "lucide-react";

export default function ExportPage() {
  const [exportActiveTab, setExportActiveTab] = useState<"room" | "monthly" | "database">("room");
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

  const selectedRoomObj = roomsData.find((r) => r.id === exportRoomId) || roomsData[0];
  const isToilet = selectedRoomObj?.roomType?.id === "TOILET" || selectedRoomObj?.name?.toLowerCase().includes("toilet");

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
        <button
          type="button"
          onClick={() => setExportActiveTab("database")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            exportActiveTab === "database"
              ? "bg-white text-[#0076a8] shadow-md"
              : "text-[#647783] hover:text-[#17313d]"
          }`}
        >
          🗄️ Ekspor seluruh database (Admin)
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

          {/* Card: Preview Workbook (Matches Exact Ceklis Ruangan UPS Template) */}
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

            {/* Authentic PLN Template Sheet Preview Table */}
            <div className="border border-[#cbd5e1] rounded-xl overflow-x-auto bg-white">
              <div className="min-w-[1000px] p-6 space-y-4 font-mono text-xs">
                {/* Title Header */}
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-[#17313d] uppercase tracking-wide">
                    CEKLIS KEBERSIHAN & KESIAPAN {exportPreviewData?.room?.name?.toUpperCase() || "RUANG RAPAT G. UTAMA"}
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
                    <span>
                      : Arif Budi Hartono  [{exportPreviewData?.officersStatus?.arif?.pagi ? "✓" : "   "}] Pagi  [{exportPreviewData?.officersStatus?.arif?.sore ? "✓" : "   "}] Sore
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">Cleaning Service</span>
                    <span>
                      : Sulaiman  [{exportPreviewData?.officersStatus?.sulaiman?.pagi ? "✓" : "   "}] Pagi  [{exportPreviewData?.officersStatus?.sulaiman?.sore ? "✓" : "   "}] Sore
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-bold">Supervisor</span>
                    <span>: {exportPreviewData?.officersStatus?.supervisor || "Ipal Hapidz"}</span>
                  </div>
                </div>

                {/* Excel Grid Matrix Table Matching Template Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse border border-[#94a3b8] text-[10px]">
                    <thead>
                      {/* Row 1: Day Headers */}
                      <tr className="bg-[#f8fafc]">
                        <th rowSpan={4} className="border border-[#94a3b8] p-2 w-10">NO</th>
                        <th rowSpan={4} className="border border-[#94a3b8] p-2 text-left w-64">
                          BAGIAN YANG DIPERIKSA
                        </th>
                        {(exportPreviewData?.days || []).map((day: any) => (
                          <th
                            key={day.dayIndex}
                            colSpan={isToilet ? 24 : 12}
                            className="border border-[#94a3b8] p-1.5 bg-[#f1f5f9]"
                          >
                            <strong className="block text-[#17313d]">Hari ke {day.dayIndex}</strong>
                            <span className="text-[9px] text-[#647783] font-normal">{day.dateFormatted}</span>
                          </th>
                        ))}
                      </tr>

                      {/* Row 2: Shift Headers */}
                      <tr>
                        {(exportPreviewData?.days || []).map((_: any, dIdx: number) =>
                          isToilet ? (
                            <Fragment key={dIdx}>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#e2e8f0] text-[#17313d] font-bold">PAGI</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#fef08a] text-[#854d0e] font-bold">INSP 1</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#bae6fd] text-[#0369a1] font-bold">SIANG</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#fef08a] text-[#854d0e] font-bold">INSP 2</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#bbf7d0] text-[#166534] font-bold">SORE</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#fef08a] text-[#854d0e] font-bold">INSP 3</th>
                            </Fragment>
                          ) : (
                            <Fragment key={dIdx}>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#e2e8f0] text-[#17313d] font-bold">PAGI</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#bbf7d0] text-[#166534] font-bold">SORE</th>
                              <th colSpan={4} className="border border-[#94a3b8] p-1 bg-[#fef08a] text-[#854d0e] font-bold">INSPEKSI</th>
                            </Fragment>
                          )
                        )}
                      </tr>

                      {/* Row 3: Subheaders (Aktv / Fung) */}
                      <tr className="bg-[#f8fafc] text-[9px] font-bold">
                        {(exportPreviewData?.days || []).map((_: any, dIdx: number) =>
                          Array.from({ length: isToilet ? 6 : 3 }).map((_, sIdx) => (
                            <Fragment key={`${dIdx}-${sIdx}`}>
                              <th colSpan={2} className="border border-[#94a3b8] p-0.5">Aktv</th>
                              <th colSpan={2} className="border border-[#94a3b8] p-0.5">Fung</th>
                            </Fragment>
                          ))
                        )}
                      </tr>

                      {/* Row 4: Indicator Subcolumns (S, B, Y, T) */}
                      <tr className="bg-[#f8fafc] text-[8px] font-bold">
                        {(exportPreviewData?.days || []).map((_: any, dIdx: number) =>
                          Array.from({ length: isToilet ? 6 : 3 }).map((_, sIdx) => (
                            <Fragment key={`${dIdx}-${sIdx}`}>
                              <th className="border border-[#94a3b8] p-0.5 w-5">S</th>
                              <th className="border border-[#94a3b8] p-0.5 w-5">B</th>
                              <th className="border border-[#94a3b8] p-0.5 w-5">Y</th>
                              <th className="border border-[#94a3b8] p-0.5 w-5">T</th>
                            </Fragment>
                          ))
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {(exportPreviewData?.activities || []).map((act: any, idx: number) => {
                        const actMatrix = exportPreviewData?.matrix?.[act.id] || {};

                        return (
                          <tr key={act.id} className="hover:bg-[#f8fafc]">
                            <td className="border border-[#94a3b8] p-1 font-bold">{idx + 1}</td>
                            <td className="border border-[#94a3b8] p-1 text-left font-bold text-[#17313d]">
                              {act.name}
                            </td>
                            {(exportPreviewData?.days || []).map((day: any, dIdx: number) => {
                              const dayMatrix = actMatrix[day.dateKey] || {};

                              const findSlotData = (query: string) => {
                                for (const k of Object.keys(dayMatrix)) {
                                  if (k.toUpperCase().includes(query.toUpperCase())) {
                                    return dayMatrix[k];
                                  }
                                }
                                return null;
                              };

                              if (isToilet) {
                                const slotQueries = ["PAGI", "INSP_1", "SIANG", "INSP_2", "SORE", "INSP_3"];
                                return (
                                  <Fragment key={dIdx}>
                                    {slotQueries.map((q, qIdx) => {
                                      const sd = findSlotData(q);
                                      return (
                                        <Fragment key={qIdx}>
                                          <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{sd?.S || ""}</td>
                                          <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{sd?.B || ""}</td>
                                          <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{sd?.Y || ""}</td>
                                          <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{sd?.T || ""}</td>
                                        </Fragment>
                                      );
                                    })}
                                  </Fragment>
                                );
                              }

                              const pagi = findSlotData("PAGI");
                              const sore = findSlotData("SORE");
                              const insp = findSlotData("INSP") || findSlotData("SUPERVISOR");

                              return (
                                <Fragment key={dIdx}>
                                  {/* PAGI */}
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{pagi?.S || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{pagi?.B || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{pagi?.Y || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{pagi?.T || ""}</td>

                                  {/* SORE */}
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{sore?.S || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{sore?.B || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{sore?.Y || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{sore?.T || ""}</td>

                                  {/* INSPEKSI */}
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{insp?.S || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{insp?.B || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#157a55] font-black">{insp?.Y || ""}</td>
                                  <td className="border border-[#94a3b8] p-0.5 text-[#b91c1c] font-black">{insp?.T || ""}</td>
                                </Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Legend Matching Ceklis Template */}
                <div className="pt-3 text-[11px] text-[#475569] space-y-1">
                  <strong className="text-[#17313d] block">Keterangan:</strong>
                  <p>• <strong>Aktivitas</strong>: Sudah (S) / Belum (B) — Pembersihan, Pembuangan Sampah</p>
                  <p>• <strong>Fungsi</strong>: Ya (Y) / Tidak (T) — Pengecekan apakah kondisi baik & berfungsi normal</p>
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

      {/* ──────────────────────── TAB 3: EKSPOR SELURUH DATABASE (KHUSUS ADMIN) ──────────────────────── */}
      {exportActiveTab === "database" && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-[#d8e3ea] rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#f1f5f9]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0076a8] block mb-1">
                  PENGELOLAAN DATABASE & ARSIP
                </span>
                <h3 className="text-xl font-black text-[#17313d]">Ekspor Seluruh Database (Admin Only)</h3>
                <p className="text-xs text-[#647783] mt-1">
                  Unduh seluruh koleksi data operasional kebersihan dari database cloud Neon dalam bentuk file spreadsheet multi-sheet atau arsip cadangan JSON.
                </p>
              </div>
              <span className="px-3.5 py-1.5 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
                <span>Database Terhubung</span>
              </span>
            </div>

            {/* Two Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Option 1: Multi-sheet Excel */}
              <div className="border border-[#cbd5e1] rounded-2xl p-6 bg-[#f8fafc] flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#0076a8]/10 text-[#0076a8] flex items-center justify-center font-black">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-[#17313d]">Full Database Excel (.xlsx)</h4>
                  <p className="text-xs text-[#647783] leading-relaxed">
                    Satu berkas Excel berisi lembar kerja (*sheets*) terpisah untuk setiap tabel:
                  </p>
                  <ul className="text-[11px] text-[#475569] space-y-1 pt-1 font-mono">
                    <li>• <strong>INSPECTIONS</strong>: 357+ sesi pemeriksaan</li>
                    <li>• <strong>INSPECTION_DETAILS</strong>: 3.661+ detail butir 5S</li>
                    <li>• <strong>PHOTOS</strong>: 359+ log foto bukti</li>
                    <li>• <strong>EVALUATIONS</strong>: Hasil survei kepuasan</li>
                    <li>• <strong>ROOMS & USERS</strong>: Master data ruangan & user</li>
                  </ul>
                </div>

                <a
                  href="/api/admin/export/database?format=xlsx"
                  download
                  className="w-full py-3 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all mt-4"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Database Excel (.xlsx)</span>
                </a>
              </div>

              {/* Option 2: JSON Backup */}
              <div className="border border-[#cbd5e1] rounded-2xl p-6 bg-[#f8fafc] flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#7e22ce]/10 text-[#7e22ce] flex items-center justify-center font-black">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-[#17313d]">Arsip Cadangan JSON (.json)</h4>
                  <p className="text-xs text-[#647783] leading-relaxed">
                    File cadangan mentah berformat JSON standar lengkap dengan metadata dan timestamp. Sangat cocok untuk:
                  </p>
                  <ul className="text-[11px] text-[#475569] space-y-1 pt-1">
                    <li>• Cadangan rutin berkala (*backup point*)</li>
                    <li>• Migrasi data ke sistem / server baru</li>
                    <li>• Integrasi dengan analitik pihak ketiga / data lake</li>
                  </ul>
                </div>

                <a
                  href="/api/admin/export/database?format=json"
                  download
                  className="w-full py-3 bg-[#072d3f] hover:bg-[#0b415a] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all mt-4"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Arsip Cadangan (.json)</span>
                </a>
              </div>
            </div>

            <div className="p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-xl text-xs text-[#92400e] flex items-start gap-2.5">
              <span className="text-base leading-none">🔒</span>
              <div>
                <strong>Akses Terbatas:</strong> Fitur ekspor basis data mentah ini diproteksi oleh sistem autentikasi sesi dan hanya dapat diunduh oleh akun dengan hak akses <strong>ADMIN</strong>.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

