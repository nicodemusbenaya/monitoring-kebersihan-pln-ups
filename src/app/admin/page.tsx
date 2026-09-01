"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { AppDropdown, MonthDropdown } from "@/components/AppDropdown";

export default function DashboardSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);

  // Filters state - pending vs applied to make Terapkan meaningful
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [appliedRoomFilter, setAppliedRoomFilter] = useState("ALL");
  const [appliedPeriod, setAppliedPeriod] = useState(currentMonthKey);
  const [pendingRoomFilter, setPendingRoomFilter] = useState("ALL");
  const [pendingPeriod, setPendingPeriod] = useState(currentMonthKey);
  const [statusRoomFilter, setStatusRoomFilter] = useState<"ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE">("ALL");
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [actionItemFilter, setActionItemFilter] = useState<"ALL" | "FINDINGS" | "PENDING">("ALL");
  const [reopenId, setReopenId] = useState<string | null>(null);

  const hasFilterActive = appliedRoomFilter !== "ALL" || appliedPeriod !== currentMonthKey;
  const filterPeriodLabel = useMemo(() => {
    if (!appliedPeriod) return "";
    const [y, m] = appliedPeriod.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }, [appliedPeriod]);

  const pendingRoomOptions = useMemo(() => {
    const visible = roomsData.filter((r: any) => !r.hidden);
    return [{ value: "ALL", label: "Semua ruangan" }, ...visible.map((r: any) => ({ value: r.id, label: r.name }))];
  }, [roomsData]);

  const loadData = async (roomId = appliedRoomFilter, month = appliedPeriod) => {
    setLoading(true);
    try {
      const [dashRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/dashboard?month=${month}${roomId !== "ALL" ? `&roomId=${roomId}` : ""}`).then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
      ]);
      if (dashRes.ok) setDashboardData(dashRes.data);
      if (roomsRes.ok) setRoomsData((roomsRes.data.rooms || []).filter((r: any) => !r.hidden));
    } catch (err) {
      console.error("Gagal memuat ringkasan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    setAppliedRoomFilter(pendingRoomFilter);
    setAppliedPeriod(pendingPeriod);
    await loadData(pendingRoomFilter, pendingPeriod);
  };

  const pendingIsDirty = pendingRoomFilter !== appliedRoomFilter || pendingPeriod !== appliedPeriod;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReopen = async (inspectionId: string) => {
    if (!confirm("Buka kembali laporan ini? Laporan akan dihapus dan petugas dapat mengisi ulang untuk slot/hari tersebut.")) return;
    setReopenId(inspectionId);
    try {
      const res = await fetch("/api/admin/inspections/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Gagal membuka kembali laporan.");
      alert(data.message);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membuka kembali laporan.");
    } finally {
      setReopenId(null);
    }
  };

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

  // Filtered room summaries (server already filters by appliedRoomFilter, this is extra client tabs)
  const filteredRoomSummaries = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    return dashboardData.roomSummaries.filter((r: any) => {
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
  }, [dashboardData, roomSearchQuery, statusRoomFilter]);

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

  // Max daily trend value for chart scaling
  const maxTrendValue = useMemo(() => {
    if (!dashboardData?.dailyTrend || dashboardData.dailyTrend.length === 0) return 20;
    const maxVal = Math.max(...dashboardData.dailyTrend.map((d: any) => d.total));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 20;
  }, [dashboardData]);

  return (
    <div className="space-y-6 pb-12">
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
            {loading && !dashboardData ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ffd100] animate-ping"></span>
                <span className="text-[#ffd100] font-bold">Menghubungkan ke database & memuat data...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                <span>Data terbaru • {todayTimeFormatted}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Filter Bar (Cakupan Data) - custom dropdown sesuai gambar */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            CAKUPAN DATA
          </span>
          <h3 className="text-base font-extrabold text-[#17313d] capitalize">
            {hasFilterActive
              ? `${pendingRoomOptions.find((o) => o.value === appliedRoomFilter)?.label || "Semua ruangan"} · ${filterPeriodLabel}`
              : "Semua ruangan"}
          </h3>
          <p className="text-xs text-[#647783] mt-0.5">
            Ruangan berlaku untuk seluruh ringkasan; bulan hanya untuk bagian analisis periode. {pendingIsDirty && <span className="text-[#b45309] font-bold">· Ada perubahan belum diterapkan</span>}
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
            <MonthDropdown label="Periode analisis" value={pendingPeriod} onChange={setPendingPeriod} />
          </div>
          <button
            type="button"
            onClick={handleApplyFilter}
            disabled={loading}
            className={`h-[44px] px-6 bg-[#0076a8] hover:bg-[#00577d] disabled:bg-[#94a3b8] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${loading ? "cursor-wait" : ""}`}
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

      {/* 3. Four Metric KPI Cards - skeletal when loading, first card label reacts to filter */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all ${loading ? "border-[#ffd100]/50" : "border-[#d8e3ea]"} ${hasFilterActive ? "ring-1 ring-[#ffd100]/20" : ""}`}>
          <span className="text-xs font-bold text-[#647783] flex items-center gap-1.5">
            {hasFilterActive ? "Penyelesaian jadwal waktu filter" : "Penyelesaian jadwal hari ini"}
            {hasFilterActive && <span className="px-1.5 py-0.5 bg-[#fff6a1] border border-[#ffd100] rounded-md text-[9px] font-black tracking-wide text-[#92400e]">FILTER AKTIF</span>}
          </span>
          <div className="my-2">
            {loading ? (
              <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl"></div>
            ) : (
              <strong className="text-3xl font-black text-[#17313d]">
                {dashboardData?.summary?.completionRate ?? 0}%
              </strong>
            )}
          </div>
          {loading ? (
            <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md"></div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
              <span className="w-2 h-2 rounded-full bg-[#ffd100]"></span>
              <span>
                {hasFilterActive
                  ? `${dashboardData?.summary?.completedSessions ?? 0} dari ${dashboardData?.summary?.totalExpectedSessions ?? 0} jadwal • ${filterPeriodLabel}`
                  : `${dashboardData?.summary?.completedSessions ?? 0} dari ${dashboardData?.summary?.totalExpectedSessions ?? 87} jadwal harian`}
              </span>
            </div>
          )}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#ffd100]/30 pointer-events-none"></div>
          {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl pointer-events-none" />}
        </div>

        <div className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] ${loading ? "opacity-70" : ""}`}>
          <span className="text-xs font-bold text-[#647783]">Ruangan lengkap</span>
          <div className="my-2">
            {loading ? (
              <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl"></div>
            ) : (
              <strong className="text-3xl font-black text-[#0076a8]">
                {dashboardData?.summary?.greenCount ?? 0}
                <span className="text-xl font-bold text-[#647783]">/{roomsData.length || 24}</span>
              </strong>
            )}
          </div>
          {loading ? (
            <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md"></div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
              <span className="w-2 h-2 rounded-full bg-[#0076a8]"></span>
              <span>Seluruh jadwal ruangan selesai</span>
            </div>
          )}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#0076a8]/15 pointer-events-none"></div>
        </div>

        <div className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] ${loading ? "opacity-70" : ""}`}>
          <span className="text-xs font-bold text-[#647783]">Pemeriksaan dengan temuan</span>
          <div className="my-2">
            {loading ? (
              <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl"></div>
            ) : (
              <strong className="text-3xl font-black text-[#bd2d22]">
                {dashboardData?.summary?.findingCount ?? 0}
              </strong>
            )}
          </div>
          {loading ? (
            <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md"></div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              <span>{dashboardData?.summary?.findingCount ?? 0} indikator perlu ditinjau</span>
            </div>
          )}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#bd2d22]/15 pointer-events-none"></div>
        </div>

        <div className={`relative overflow-hidden bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] ${loading ? "opacity-70" : ""}`}>
          <span className="text-xs font-bold text-[#647783]">Kepuasan pengguna</span>
          <div className="my-2">
            {loading ? (
              <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl"></div>
            ) : (
              <strong className="text-3xl font-black text-[#157a55]">
                {dashboardData?.metrics?.satisfactionRate ?? 100}%
              </strong>
            )}
          </div>
          {loading ? (
            <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md"></div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
              <span className="w-2 h-2 rounded-full bg-[#157a55]"></span>
              <span>Rata-rata {dashboardData?.metrics?.averageRating ?? "3.8"} dari 4</span>
            </div>
          )}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#157a55]/15 pointer-events-none"></div>
        </div>
      </section>

      {/* 4. Ruangan Hari Ini & Item Perhatian Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Matriks Ruangan */}
        <div className="lg:col-span-8 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f5f9]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
                STATUS HARIAN
              </span>
              <h4 className="text-lg font-black text-[#17313d]">Ruangan hari ini</h4>
              <p className="text-xs text-[#647783] mt-0.5">
                Kondisi tiap ruangan berdasarkan seluruh slot yang dijadwalkan hari ini.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari ruangan..."
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#d8e3ea] rounded-xl text-xs font-bold text-[#17313d] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0076a8]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: `Semua (${dashboardData?.roomSummaries?.length || 0})` },
              { id: "FINDINGS", label: `Temuan (${dashboardData?.summary?.findingCount || 0})` },
              { id: "PARTIAL", label: `Belum lengkap (${(dashboardData?.summary?.yellowCount || 0) + (dashboardData?.summary?.redCount || 0)})` },
              { id: "COMPLETE", label: `Lengkap (${dashboardData?.summary?.greenCount || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusRoomFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusRoomFilter === tab.id
                    ? "bg-[#072d3f] text-white shadow-sm"
                    : "bg-[#f8fafc] text-[#647783] hover:bg-[#f1f5f9]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 max-h-[520px] overflow-y-auto pr-1 ${loading ? "opacity-60" : ""}`}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-[#cbd5e1]/40 bg-[#f8fafc] flex flex-col justify-between h-28 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-[#e2e8f0] rounded"></div>
                    <div className="h-4 w-32 bg-[#e2e8f0] rounded"></div>
                  </div>
                  <div className="h-3 w-20 bg-[#e2e8f0] rounded pt-2 border-t border-black/5"></div>
                </div>
              ))
            ) : (
              filteredRoomSummaries.map((room: any) => {
                const isGreen = room.status === "COMPLETE";
                const isPurple = room.status === "WAITING_SPV";
                const isYellow = room.status === "PARTIAL";

                let borderColor = "border-[#cbd5e1]";
                let badgeColor = "bg-[#f1f5f9] text-[#647783]";
                let statusText = "Belum Ada Data";

                if (isGreen) {
                  borderColor = "border-[#10b981]/40 bg-[#f0fdf4]";
                  badgeColor = "bg-[#dcfce7] text-[#15803d]";
                  statusText = "Lengkap";
                } else if (isPurple) {
                  borderColor = "border-[#8b5cf6]/40 bg-[#faf5ff]";
                  badgeColor = "bg-[#f3e8ff] text-[#7e22ce]";
                  statusText = "Menunggu SPV";
                } else if (isYellow) {
                  borderColor = "border-[#f59e0b]/40 bg-[#fffbeb]";
                  badgeColor = "bg-[#fef3c7] text-[#b45309]";
                  statusText = "Sebagian";
                }

                return (
                  <div
                    key={room.id}
                    className={`p-4 rounded-2xl border ${borderColor} flex flex-col justify-between transition-all hover:shadow-md`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-black uppercase text-[#647783] truncate">
                          {room.roomTypeName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${badgeColor}`}>
                          {statusText}
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-[#17313d] line-clamp-1">{room.name}</h5>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#647783] font-bold">
                        {room.completedSlots}/{room.totalSlots} Sesi
                      </span>
                      {room.dirtyCount > 0 && (
                        <span className="text-[#b91c1c] font-black flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {room.dirtyCount} Temuan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Item Perhatian */}
        <div className="lg:col-span-4 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              TINDAK LANJUT
            </span>
            <h4 className="text-lg font-black text-[#17313d]">Item perhatian</h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Temuan dan jadwal yang perlu tindakan lebih lanjut.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActionItemFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                actionItemFilter === "ALL" ? "bg-[#072d3f] text-white" : "bg-[#f1f5f9] text-[#647783]"
              }`}
            >
              Semua {actionItems.length}
            </button>
            <button
              type="button"
              onClick={() => setActionItemFilter("FINDINGS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                actionItemFilter === "FINDINGS" ? "bg-[#072d3f] text-white" : "bg-[#f1f5f9] text-[#647783]"
              }`}
            >
              Temuan {dashboardData?.summary?.findingCount ?? 0}
            </button>
            <button
              type="button"
              onClick={() => setActionItemFilter("PENDING")}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                actionItemFilter === "PENDING" ? "bg-[#072d3f] text-white" : "bg-[#f1f5f9] text-[#647783]"
              }`}
            >
              Belum selesai {actionItems.length - (dashboardData?.summary?.findingCount ?? 0)}
            </button>
          </div>

          <div className={`space-y-3 max-h-[440px] overflow-y-auto pr-1 ${loading ? "opacity-60" : ""}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex items-start gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-2.5 w-44 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              actionItems.slice(0, 10).map((item, idx) => (
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
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5. Analisis Periode & Chart Tren Operasional */}
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
              {loading ? <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" /> : <strong className="text-xl font-black text-[#17313d] block">{dashboardData?.metrics?.monthlyInspectionsCount ?? 0}</strong>}
              <span className="text-[11px] text-[#718c99]">Pemeriksaan</span>
            </div>
            <div>
              {loading ? <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" /> : <strong className="text-xl font-black text-[#157a55] block">{dashboardData?.metrics?.monthlyCleanCount ?? 0}</strong>}
              <span className="text-[11px] text-[#718c99]">Bersih</span>
            </div>
            <div>
              {loading ? <div className="h-6 w-10 bg-[#e2e8f0] animate-pulse rounded mx-auto" /> : <strong className="text-xl font-black text-[#bd2d22] block">{dashboardData?.metrics?.monthlyFindingCount ?? 0}</strong>}
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
                        ></div>
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
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0076a8]"></span> Pemeriksaan
                </span>
                <span className="flex items-center gap-1 text-[#eab308]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#eab308]"></span> Temuan
                </span>
              </div>
            </div>

            {/* Bars container - skeleton when loading */}
            <div className={`h-48 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 border-b border-[#e2e8f0] overflow-x-auto ${loading ? "opacity-40" : ""}`}>
              {loading
                ? Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="flex-1 min-w-[8px] h-full flex items-end justify-center pb-1">
                      <div className="w-full bg-[#e2e8f0] animate-pulse rounded-t-sm" style={{ height: `${10 + Math.random() * 60}%` }} />
                    </div>
                  ))
                : (dashboardData?.dailyTrend || []).map((item: any) => {
                const count = item.total || 0;
                const findings = item.finding || 0;
                const heightPct = count > 0 ? Math.min(100, Math.max(8, (count / maxTrendValue) * 100)) : 3;

                return (
                  <div
                    key={item.day}
                    className="flex-1 min-w-[8px] flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#072d3f] text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20">
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
                    ></div>
                    <span className="text-[8px] text-[#94a3b8] font-bold">
                      {item.day % 4 === 1 ? item.day : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 6. AKTIVITAS TERBARU (RECENT ACTIVITY FEED) */}
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
            {dashboardData?.recentActivities?.length || 0} Aktivitas Terkini
          </span>
        </div>

        {/* Activity Feed Cards List */}
        <div className="divide-y divide-[#f1f5f9] max-h-[600px] overflow-y-auto pr-2 space-y-3">
          {(!dashboardData?.recentActivities || dashboardData.recentActivities.length === 0) ? (
            <div className="text-center py-12 text-xs text-[#647783]">
              Belum ada data riwayat aktivitas yang tercatat.
            </div>
          ) : (
            dashboardData.recentActivities.map((act: any) => {
              const isClean = act.overallStatus === "BERSIH";
              const isSpv = act.slotRole === "SUPERVISOR";

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
                    onClick={() => handleReopen(act.id)}
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


    </div>
  );
}
