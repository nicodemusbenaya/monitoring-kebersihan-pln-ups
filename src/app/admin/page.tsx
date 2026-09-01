"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function DashboardSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);

  // Filters state
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [statusRoomFilter, setStatusRoomFilter] = useState<"ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE">("ALL");
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [actionItemFilter, setActionItemFilter] = useState<"ALL" | "FINDINGS" | "PENDING">("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/dashboard?month=${selectedPeriod}`).then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
      ]);

      if (dashRes.ok) setDashboardData(dashRes.data);
      if (roomsRes.ok) setRoomsData(roomsRes.data.rooms);
    } catch (err) {
      console.error("Gagal memuat ringkasan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // Formatted date
  const todayFormatted = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  }, []);

  const todayTimeFormatted = useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now) + " WIB";
  }, []);

  // Filtered room summaries
  const filteredRoomSummaries = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    return dashboardData.roomSummaries.filter((r: any) => {
      if (selectedRoomFilter !== "ALL" && r.id !== selectedRoomFilter) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (statusRoomFilter === "FINDINGS") return r.hasFindings || r.dirtyCount > 0;
      if (statusRoomFilter === "COMPLETE") return r.status === "COMPLETE";
      if (statusRoomFilter === "PARTIAL") return r.status === "PARTIAL" || r.status === "WAITING_SPV" || r.status === "EMPTY";
      return true;
    });
  }, [dashboardData, selectedRoomFilter, roomSearchQuery, statusRoomFilter]);

  // Action items
  const actionItems = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    const list: any[] = [];

    dashboardData.roomSummaries.forEach((r: any) => {
      if (r.status !== "COMPLETE") {
        if (r.petugasFinished < r.petugasTotal) {
          list.push({
            id: `${r.id}-petugas`,
            roomName: r.name,
            slotName: "Petugas",
            desc: "Belum dilakukan pada hari ini.",
            status: "Belum selesai",
            type: "PENDING",
          });
        }
        if (r.spvFinished < r.spvTotal) {
          list.push({
            id: `${r.id}-spv`,
            roomName: r.name,
            slotName: "Inspeksi SPV",
            desc: "Belum dilakukan inspeksi pengawas.",
            status: "Belum selesai",
            type: "PENDING",
          });
        }
      }
    });

    if (dashboardData.findings) {
      dashboardData.findings.forEach((f: any) => {
        list.unshift({
          id: `finding-${f.id}`,
          roomName: f.roomName,
          slotName: f.slotName,
          desc: f.note || "Temuan kotor/rusak",
          status: "Perlu ditinjau",
          type: "FINDINGS",
        });
      });
    }

    if (actionItemFilter === "FINDINGS") return list.filter((i) => i.type === "FINDINGS");
    if (actionItemFilter === "PENDING") return list.filter((i) => i.type === "PENDING");
    return list;
  }, [dashboardData, actionItemFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Large Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#062c3e] via-[#09415b] to-[#0d5678] text-white rounded-3xl p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ffd100] via-transparent to-transparent"></div>
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border-[30px] border-white/10 pointer-events-none"></div>

        <div className="relative z-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#ffd100] block mb-2">
            OPERASIONAL HARI INI
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Ringkasan operasional
          </h2>

          <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/30 backdrop-blur-md rounded-2xl border border-white/15">
            <span className="px-2 py-0.5 bg-[#ffd100] text-[#072d3f] text-xs font-black rounded-lg uppercase tracking-wide">
              HARI INI
            </span>
            <span className="text-xs font-bold text-white">{todayFormatted}</span>
          </div>

          <div className="flex items-center gap-2 mt-4 text-[11px] text-white/80 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span>Data terbaru • {todayTimeFormatted}</span>
          </div>
        </div>
      </section>

      {/* 2. Filter Bar (Cakupan Data) */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            CAKUPAN DATA
          </span>
          <h3 className="text-base font-extrabold text-[#17313d]">Semua ruangan</h3>
          <p className="text-xs text-[#647783] mt-0.5">
            Ruangan berlaku untuk seluruh ringkasan; bulan hanya untuk bagian analisis periode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-[#718c99] uppercase mb-1">Ruangan</label>
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="px-3.5 py-2 bg-[#f8fafc] border border-[#b9cbd3] rounded-xl text-xs font-bold text-[#17313d] focus:outline-none focus:border-[#0076a8]"
            >
              <option value="ALL">Semua ruangan</option>
              {roomsData.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-[#718c99] uppercase mb-1">Periode analisis</label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3.5 py-2 bg-[#f8fafc] border border-[#b9cbd3] rounded-xl text-xs font-bold text-[#17313d] focus:outline-none focus:border-[#0076a8]"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="self-end px-5 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Terapkan
          </button>
        </div>
      </section>

      {/* 3. Four Metric KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-[#647783]">Penyelesaian jadwal hari ini</span>
          <div className="my-2">
            <strong className="text-3xl font-black text-[#17313d]">
              {dashboardData?.summary?.completionRate ?? 0}%
            </strong>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#ffd100]"></span>
            <span>
              {dashboardData?.summary?.completedSessions ?? 0} dari {dashboardData?.summary?.totalExpectedSessions ?? 87} jadwal harian
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#ffd100]/30 pointer-events-none"></div>
        </div>

        <div className="relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-[#647783]">Ruangan lengkap</span>
          <div className="my-2">
            <strong className="text-3xl font-black text-[#0076a8]">
              {dashboardData?.summary?.greenCount ?? 0}
              <span className="text-xl font-bold text-[#647783]">/{roomsData.length || 24}</span>
            </strong>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#0076a8]"></span>
            <span>Seluruh jadwal ruangan selesai</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#0076a8]/15 pointer-events-none"></div>
        </div>

        <div className="relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-[#647783]">Pemeriksaan dengan temuan</span>
          <div className="my-2">
            <strong className="text-3xl font-black text-[#bd2d22]">
              {dashboardData?.summary?.findingCount ?? 0}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            <span>{dashboardData?.summary?.findingCount ?? 0} indikator perlu ditinjau</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#bd2d22]/15 pointer-events-none"></div>
        </div>

        <div className="relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <span className="text-xs font-bold text-[#647783]">Jadwal belum selesai</span>
          <div className="my-2">
            <strong className="text-3xl font-black text-[#d97706]">
              {(dashboardData?.summary?.totalExpectedSessions ?? 87) - (dashboardData?.summary?.completedSessions ?? 0)}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
            <span className="w-2 h-2 rounded-full bg-[#d97706]"></span>
            <span>
              {(roomsData.length || 24) - (dashboardData?.summary?.greenCount ?? 0)} ruangan belum lengkap
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#d97706]/15 pointer-events-none"></div>
        </div>
      </section>

      {/* 4. Two Column Operational Status & Action Items */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Status Ruangan (70%) */}
        <div className="lg:col-span-8 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
                CAKUPAN HARI INI
              </span>
              <h3 className="text-xl font-black text-[#17313d]">Status ruangan</h3>
              <p className="text-xs text-[#647783] mt-0.5">
                Diurutkan dari ruangan yang paling membutuhkan perhatian.
              </p>
            </div>
            <span className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#17313d] font-bold text-xs flex items-center justify-center">
              {filteredRoomSummaries.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusRoomFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusRoomFilter === "ALL"
                    ? "bg-[#0076a8] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusRoomFilter("FINDINGS")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusRoomFilter === "FINDINGS"
                    ? "bg-[#0076a8] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
              >
                Ada temuan
              </button>
              <button
                type="button"
                onClick={() => setStatusRoomFilter("PARTIAL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusRoomFilter === "PARTIAL"
                    ? "bg-[#0076a8] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
              >
                Belum lengkap
              </button>
              <button
                type="button"
                onClick={() => setStatusRoomFilter("COMPLETE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusRoomFilter === "COMPLETE"
                    ? "bg-[#0076a8] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
              >
                Selesai
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder="Cari ruangan..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs focus:outline-none focus:border-[#0076a8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-1">
            {filteredRoomSummaries.map((roomItem: any) => {
              const isComplete = roomItem.status === "COMPLETE";
              const isWaitingSpv = roomItem.status === "WAITING_SPV";
              const isFindings = roomItem.hasFindings || roomItem.dirtyCount > 0;
              const completedCount = roomItem.completedSlots || 0;
              const totalSlots = roomItem.totalSlots || 3;
              const progressPct = totalSlots > 0 ? (completedCount / totalSlots) * 100 : 0;

              return (
                <div
                  key={roomItem.id}
                  className="border border-[#d8e3ea] rounded-2xl p-4 bg-white hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#17313d]">{roomItem.name}</h4>
                      <span className="text-[10px] font-bold text-[#718c99] uppercase block">
                        {roomItem.code}
                      </span>
                    </div>

                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e7f6ef] text-[#157a55]">
                        <CheckCircle2 className="w-3 h-3" /> Selesai
                      </span>
                    ) : isWaitingSpv ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f3e8ff] text-[#7e22ce]">
                        ◈ Menunggu SPV
                      </span>
                    ) : isFindings ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fff0ee] text-[#bd2d22]">
                        <AlertTriangle className="w-3 h-3" /> Ada temuan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fff7d6] text-[#9a6500]">
                        <Clock className="w-3 h-3" /> Belum lengkap
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-end text-[10px] font-bold text-[#647783] mb-1">
                      <span>{completedCount}/{totalSlots}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isComplete ? "bg-[#157a55]" : isWaitingSpv ? "bg-[#7e22ce]" : "bg-[#0076a8]"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f1f5f9] text-[10px]">
                    <div>
                      <span className="text-[#94a3b8] font-bold block">PAGI</span>
                      <span className="font-semibold text-[#647783] flex items-center gap-1 mt-0.5">
                        {roomItem.petugasFinished > 0 ? (
                          <span className="text-[#157a55] font-bold">✓ Selesai</span>
                        ) : (
                          <span className="text-[#9a6500]">⏰ Menunggu</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] font-bold block">SORE</span>
                      <span className="font-semibold text-[#647783] flex items-center gap-1 mt-0.5">
                        {roomItem.petugasFinished >= 2 ? (
                          <span className="text-[#157a55] font-bold">✓ Selesai</span>
                        ) : (
                          <span className="text-[#9a6500]">⏰ Menunggu</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] font-bold block">INSPEKSI</span>
                      <span className="font-semibold text-[#647783] flex items-center gap-1 mt-0.5">
                        {roomItem.spvFinished > 0 ? (
                          <span className="text-[#157a55] font-bold">✓ Selesai</span>
                        ) : (
                          <span className="text-[#9a6500]">⏰ Menunggu</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#f1f5f9] flex flex-wrap gap-4 text-[11px] font-bold text-[#647783]">
            <span className="flex items-center gap-1 text-[#bd2d22]">
              <AlertTriangle className="w-3.5 h-3.5" /> Ada temuan
            </span>
            <span className="flex items-center gap-1 text-[#9a6500]">
              <Clock className="w-3.5 h-3.5" /> Belum lengkap
            </span>
            <span className="flex items-center gap-1 text-[#157a55]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
            </span>
            <span className="flex items-center gap-1 text-[#94a3b8]">
              ⊘ Tidak dijadwalkan
            </span>
          </div>
        </div>

        {/* Right Column: Tindak Lanjut / Perlu Perhatian (30%) */}
        <div className="lg:col-span-4 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#bd2d22] block">
                TINDAK LANJUT
              </span>
              <h3 className="text-xl font-black text-[#17313d]">Perlu perhatian</h3>
              <p className="text-xs text-[#647783] mt-0.5">
                Temuan dan jadwal yang belum selesai hari ini.
              </p>
            </div>
            <span className="w-8 h-8 rounded-full bg-[#fff0ee] text-[#bd2d22] font-bold text-xs flex items-center justify-center">
              {actionItems.length}
            </span>
          </div>

          <div className="flex gap-1.5 p-1 bg-[#f1f5f9] rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActionItemFilter("ALL")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                actionItemFilter === "ALL" ? "bg-[#0076a8] text-white shadow-sm" : "text-[#647783]"
              }`}
            >
              Semua {actionItems.length}
            </button>
            <button
              type="button"
              onClick={() => setActionItemFilter("FINDINGS")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                actionItemFilter === "FINDINGS" ? "bg-[#0076a8] text-white shadow-sm" : "text-[#647783]"
              }`}
            >
              Temuan {dashboardData?.summary?.findingCount ?? 0}
            </button>
            <button
              type="button"
              onClick={() => setActionItemFilter("PENDING")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                actionItemFilter === "PENDING" ? "bg-[#0076a8] text-white shadow-sm" : "text-[#647783]"
              }`}
            >
              Belum selesai {actionItems.length - (dashboardData?.summary?.findingCount ?? 0)}
            </button>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {actionItems.slice(0, 10).map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-[#ffd100]/60 bg-[#fffdf5] flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-[#ffd100]/30 text-[#9a6500] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-[#17313d] truncate">
                    {item.roomName} - {item.slotName}
                  </h5>
                  <p className="text-[11px] text-[#647783] mt-0.5">{item.desc}</p>
                  <span className="text-[10px] font-bold text-[#d97706] mt-1 block">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="w-full py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#d8e3ea] rounded-xl text-xs font-bold text-[#0076a8] transition-all"
          >
            Buka daftar lengkap • {actionItems.length} Item
          </button>
        </div>
      </section>

      {/* 5. Analisis Periode */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              ANALISIS PERIODE
            </span>
            <h3 className="text-xl font-black text-[#17313d] capitalize">
              {selectedPeriod}
            </h3>
            <p className="text-xs text-[#647783] mt-0.5">
              Tren operasional dan suara pengguna mengikuti periode serta ruangan yang dipilih.
            </p>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <strong className="text-xl font-black text-[#17313d] block">
                {dashboardData?.metrics?.inspectionsTodayCount ?? 17}
              </strong>
              <span className="text-[11px] text-[#718c99]">Pemeriksaan</span>
            </div>
            <div>
              <strong className="text-xl font-black text-[#157a55] block">
                {dashboardData?.metrics?.cleanCount ?? 17}
              </strong>
              <span className="text-[11px] text-[#718c99]">Bersih</span>
            </div>
            <div>
              <strong className="text-xl font-black text-[#bd2d22] block">
                {dashboardData?.metrics?.findingCount ?? 0}
              </strong>
              <span className="text-[11px] text-[#718c99]">Dengan temuan</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  {dashboardData?.metrics?.averageRating ?? "3.8"}
                </strong>
                <span className="text-[10px] text-[#647783]">rata-rata dari 4</span>
              </div>
              <div>
                <strong className="text-2xl font-black text-[#17313d] block">
                  {dashboardData?.metrics?.totalEvaluations ?? 6}
                </strong>
                <span className="text-[10px] text-[#647783]">tanggapan</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#647783] block mb-2 uppercase">
                Distribusi Rating
              </span>
              <div className="space-y-1.5 text-xs text-[#647783]">
                {[4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-3 text-[11px] font-bold">{star}</span>
                    <div className="flex-1 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0076a8] rounded-full"
                        style={{ width: star === 4 ? "80%" : star === 3 ? "20%" : "0%" }}
                      ></div>
                    </div>
                    <span className="w-4 text-right text-[11px]">{star === 4 ? "5" : star === 3 ? "1" : "0"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0076a8]"></span> Pemeriksaan
                </span>
                <span className="flex items-center gap-1 text-[#ffd100]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#ffd100]"></span> Temuan
                </span>
              </div>
            </div>

            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-[#e2e8f0]">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const count = day === 1 ? 17 : 0;
                const heightPct = count > 0 ? (count / 20) * 100 : 4;

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        count > 0 ? "bg-[#0076a8] group-hover:bg-[#00577d]" : "bg-[#f1f5f9]"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[8px] text-[#94a3b8]">{day % 4 === 1 ? day : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
