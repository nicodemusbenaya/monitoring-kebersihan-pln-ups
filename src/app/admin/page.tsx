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

type QuickRangeKey = "HARI_INI" | "KEMARIN" | "1_MINGGU" | "1_BULAN" | "SEMESTER";

function getQuickRangeDates(key: QuickRangeKey) {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(now);

  if (key === "KEMARIN") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = formatYMD(yesterday);
    return {
      startDate: yStr,
      endDate: yStr,
      label: "Kemarin",
      badgeText: "KEMARIN",
      displayDate: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(yesterday),
      daysCount: 1,
    };
  }

  if (key === "1_MINGGU") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return {
      startDate: formatYMD(weekAgo),
      endDate: todayStr,
      label: "1 minggu",
      badgeText: "1 MINGGU",
      displayDate: `${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(weekAgo)} - ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(now)}`,
      daysCount: 7,
    };
  }

  if (key === "1_BULAN") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatYMD(monthStart),
      endDate: todayStr,
      label: "1 bulan",
      badgeText: "1 BULAN",
      displayDate: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now),
      daysCount: Math.max(1, now.getDate()),
    };
  }

  if (key === "SEMESTER") {
    const semStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const diffDays = Math.max(1, Math.ceil((now.getTime() - semStart.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      startDate: formatYMD(semStart),
      endDate: todayStr,
      label: "Semester",
      badgeText: "SEMESTER",
      displayDate: `${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(semStart)} - ${new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(now)}`,
      daysCount: diffDays,
    };
  }

  // Default: HARI_INI
  return {
    startDate: todayStr,
    endDate: todayStr,
    label: "Hari ini",
    badgeText: "HARI INI",
    displayDate: new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    daysCount: 1,
  };
}

export default function DashboardSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);

  // Quick range state (Hari ini, Kemarin, 1 minggu, 1 bulan, Semester)
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey>("HARI_INI");
  const currentQuickInfo = useMemo(() => getQuickRangeDates(activeQuickRange), [activeQuickRange]);

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
  const [selectedDetailRoom, setSelectedDetailRoom] = useState<any | null>(null);

  const hasFilterActive = appliedRoomFilter !== "ALL" || appliedPeriod !== currentMonthKey;
  const isMonthFiltered = appliedPeriod !== currentMonthKey;
  const filterPeriodLabel = useMemo(() => {
    if (!appliedPeriod) return "";
    const [y, m] = appliedPeriod.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }, [appliedPeriod]);

  const pendingRoomOptions = useMemo(() => {
    const visible = roomsData.filter((r: any) => !r.hidden);
    return [{ value: "ALL", label: "Semua ruangan" }, ...visible.map((r: any) => ({ value: r.id, label: r.name }))];
  }, [roomsData]);

  const filteredKpi = useMemo(() => {
    if (!dashboardData?.summary) return { rate: 0, completed: 0, total: 0, isFiltered: false };
    return {
      rate: dashboardData.summary.completionRate ?? 0,
      completed: dashboardData.summary.completedSessions ?? 0,
      total: dashboardData.summary.totalExpectedSessions ?? 0,
      isFiltered: activeQuickRange !== "HARI_INI" || hasFilterActive,
    };
  }, [dashboardData, activeQuickRange, hasFilterActive]);

  const loadData = async (
    roomId = appliedRoomFilter,
    month = appliedPeriod,
    rangeKey = activeQuickRange
  ) => {
    setLoading(true);
    let rangeInfo = getQuickRangeDates(rangeKey);

    // If a non-current month is explicitly selected in Cakupan Data (and quick filter is default HARI_INI),
    // align rangeInfo to cover that entire month
    if (month && month !== currentMonthKey && rangeKey === "HARI_INI") {
      const [y, m] = month.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      rangeInfo = {
        startDate: `${month}-01`,
        endDate: `${month}-${String(daysInMonth).padStart(2, "0")}`,
        daysCount: daysInMonth,
        label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)),
        badgeText: "BULANAN",
        displayDate: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)),
      };
    }

    try {
      const [dashRes, roomsRes] = await Promise.all([
        fetch(
          `/api/admin/dashboard?month=${month}&startDate=${rangeInfo.startDate}&endDate=${rangeInfo.endDate}&daysCount=${rangeInfo.daysCount}${
            roomId !== "ALL" ? `&roomId=${roomId}` : ""
          }`
        ).then((r) => r.json()),
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

  const handleQuickRangeChange = async (key: QuickRangeKey) => {
    setActiveQuickRange(key);
    await loadData(appliedRoomFilter, appliedPeriod, key);
  };

  const handleApplyFilter = async () => {
    setAppliedRoomFilter(pendingRoomFilter);
    setAppliedPeriod(pendingPeriod);
    await loadData(pendingRoomFilter, pendingPeriod, activeQuickRange);
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
      {/* 1. Large Hero Banner with Quick Filter */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#062c3e] via-[#09415b] to-[#0d5678] text-white rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ffd100] via-transparent to-transparent"></div>
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border-[30px] border-white/10 pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#ffd100] block mb-1">
              OPERASIONAL & PEMANTAUAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
              Ringkasan operasional
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Pantau kepatuhan jadwal, checklist kebersihan, dan kondisi ruangan secara langsung berdasarkan periode pilihan.
            </p>
          </div>

          {/* Quick Filter Bar inside Hero Card */}
          <div className="p-2.5 sm:p-3 bg-black/25 backdrop-blur-md rounded-2xl border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Active Range Badge & Display Date */}
            <div className="flex items-center gap-2.5 px-1.5">
              <span className="px-2.5 py-1 bg-[#ffd100] text-[#072d3f] text-[11px] font-black rounded-lg uppercase tracking-wide shrink-0 shadow-sm">
                {currentQuickInfo.badgeText}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                {currentQuickInfo.displayDate}
              </span>
            </div>

            {/* 5 Quick Filter Buttons: hari ini, kemarin, 1 minggu, 1 bulan, semester */}
            <div className="flex overflow-x-auto gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10 scrollbar-none">
              {[
                { key: "HARI_INI" as QuickRangeKey, label: "Hari ini" },
                { key: "KEMARIN" as QuickRangeKey, label: "Kemarin" },
                { key: "1_MINGGU" as QuickRangeKey, label: "1 minggu" },
                { key: "1_BULAN" as QuickRangeKey, label: "1 bulan" },
                { key: "SEMESTER" as QuickRangeKey, label: "Semester" },
              ].map((tab) => {
                const isActive = activeQuickRange === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleQuickRangeChange(tab.key)}
                    disabled={loading}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      isActive
                        ? "bg-[#ffd100] text-[#072d3f] shadow-md shadow-[#ffd100]/25 scale-100"
                        : "text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium pt-0.5">
            {loading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ffd100] animate-ping"></span>
                <span className="text-[#ffd100] font-bold">Memuat data periode {currentQuickInfo.label.toLowerCase()}...</span>
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
        <div className={`relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] transition-all ${loading ? "border-[#ffd100]/50" : "border-[#d8e3ea]"} ${hasFilterActive || activeQuickRange !== "HARI_INI" ? "ring-1 ring-[#ffd100]/20" : ""}`}>
          <span className="text-xs font-bold text-[#647783] flex items-center gap-1.5">
            {`Penyelesaian jadwal • ${currentQuickInfo.label}`}
            {(activeQuickRange !== "HARI_INI" || hasFilterActive) && (
              <span className="px-1.5 py-0.5 bg-[#fff6a1] border border-[#ffd100] rounded-md text-[9px] font-black tracking-wide text-[#92400e]">
                {currentQuickInfo.badgeText}
              </span>
            )}
          </span>
          <div className="my-2">
            {loading ? (
              <div className="h-9 w-24 bg-gradient-to-r from-[#f1f5f9] via-[#e2e8f0] to-[#f1f5f9] animate-pulse rounded-xl"></div>
            ) : (
              <strong className="text-3xl font-black text-[#17313d]">
                {filteredKpi.rate ?? 0}%
              </strong>
            )}
          </div>
          {loading ? (
            <div className="h-3.5 w-36 bg-[#f1f5f9] animate-pulse rounded-md"></div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#647783]">
              <span className="w-2 h-2 rounded-full bg-[#ffd100]"></span>
              <span>
                {`${filteredKpi.completed} dari ${filteredKpi.total} jadwal (${currentQuickInfo.label.toLowerCase()})`}
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
              {
                id: "PARTIAL",
                label: `Belum lengkap (${Math.max(
                  0,
                  (dashboardData?.roomSummaries?.length || 0) - (dashboardData?.summary?.greenCount || 0)
                )})`,
              },
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
                    onClick={() => setSelectedDetailRoom(room)}
                    className={`p-4 rounded-2xl border ${borderColor} flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:border-[#0076a8] group`}
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
                      <h5 className="text-xs font-black text-[#17313d] line-clamp-1 group-hover:text-[#0076a8] transition-colors">
                        {room.name}
                      </h5>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#647783] font-bold">
                        {room.completedSlots}/{room.totalSlots} Sesi
                      </span>
                      {room.dirtyCount > 0 ? (
                        <span className="text-[#b91c1c] font-black flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {room.dirtyCount} Temuan
                        </span>
                      ) : (
                        <span className="text-[#0076a8] font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          Lihat Detail <ChevronRight className="w-3 h-3" />
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
            <div className={`h-48 flex items-end gap-1 sm:gap-1.5 pt-10 pb-2 px-2 border-b border-[#e2e8f0] overflow-x-auto overflow-y-visible ${loading ? "opacity-40" : ""}`} style={{ scrollbarGutter: 'stable' } as any}>
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

                const isLeftEdge = item.day <= 2;
                const isRightEdge = item.day >= (dashboardData?.dailyTrend?.length || 31) - 1;
                return (
                  <div
                    key={item.day}
                    className="flex-1 min-w-[8px] flex flex-col items-center h-full group relative"
                  >
                    {/* Bar track - always fills remaining height and aligns bar to bottom */}
                    <div className="w-full flex-1 flex items-end justify-center relative">
                      {/* Tooltip on hover - anti-kepotong di tepi */}
                      <div
                        className={`opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#072d3f] text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-30 ${
                          isLeftEdge ? "left-0 -translate-x-0" : isRightEdge ? "right-0 left-auto translate-x-0" : "left-1/2 -translate-x-1/2"
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
                      ></div>
                    </div>

                    {/* Date label - fixed height of 16px (h-4) for every single day */}
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

      {/* MODAL DETAIL RUANGAN HARI INI */}
      {selectedDetailRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedDetailRoom(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#d8e3ea] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-[#f1f5f9] flex items-start justify-between gap-4 bg-gradient-to-r from-[#f8fafc] to-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0076a8]/10 text-[#0076a8]">
                    {selectedDetailRoom.roomTypeName}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#94a3b8]">
                    {selectedDetailRoom.code}
                  </span>
                  {(() => {
                    const isGreen = selectedDetailRoom.status === "COMPLETE";
                    const isPurple = selectedDetailRoom.status === "WAITING_SPV";
                    const isYellow = selectedDetailRoom.status === "PARTIAL";
                    if (isGreen) return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#dcfce7] text-[#15803d]">Lengkap</span>;
                    if (isPurple) return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#f3e8ff] text-[#7e22ce]">Menunggu SPV</span>;
                    if (isYellow) return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#fef3c7] text-[#b45309]">Sebagian</span>;
                    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#f1f5f9] text-[#647783]">Belum Ada Data</span>;
                  })()}
                </div>
                <h3 className="text-xl font-black text-[#17313d]">{selectedDetailRoom.name}</h3>
                <p className="text-xs text-[#647783]">
                  Detail status pemeriksaan dan temuan hari ini ({currentQuickInfo.displayDate})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailRoom(null)}
                className="w-9 h-9 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#647783] hover:text-[#17313d] flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">Pemeriksaan</span>
                  <div className="text-lg font-black text-[#17313d] mt-0.5">
                    {selectedDetailRoom.completedSlots} / {selectedDetailRoom.totalSlots}
                    <span className="text-xs font-semibold text-[#94a3b8] ml-1">Sesi</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">Temuan Kotor / Rusak</span>
                  <div className={`text-lg font-black mt-0.5 ${selectedDetailRoom.dirtyCount > 0 ? "text-[#b91c1c]" : "text-[#157a55]"}`}>
                    {selectedDetailRoom.dirtyCount}
                    <span className="text-xs font-semibold text-[#94a3b8] ml-1">Item</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">Peran Selesai</span>
                  <div className="text-xs font-black text-[#17313d] mt-1.5 space-y-0.5">
                    <div>Petugas: <span className="font-bold text-[#0076a8]">{selectedDetailRoom.petugasFinished}/{selectedDetailRoom.petugasTotal}</span></div>
                    <div>Supervisor: <span className="font-bold text-[#7e22ce]">{selectedDetailRoom.spvFinished}/{selectedDetailRoom.spvTotal}</span></div>
                  </div>
                </div>
              </div>

              {/* Slot List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#718c99]">
                  Jadwal & Sesi Pemeriksaan Hari Ini
                </h4>

                <div className="space-y-2.5">
                  {(selectedDetailRoom.slots || []).map((slot: any) => {
                    const isDone = slot.completed;
                    const insp = slot.inspection;

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDone
                            ? insp?.overallStatus === "ADA_TEMUAN"
                              ? "bg-[#fffbeb] border-[#f59e0b]/40"
                              : "bg-[#f0fdf4] border-[#10b981]/40"
                            : "bg-[#f8fafc] border-[#e2e8f0]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isDone
                                  ? insp?.overallStatus === "ADA_TEMUAN"
                                    ? "bg-[#f59e0b]/15 text-[#b45309]"
                                    : "bg-[#10b981]/15 text-[#15803d]"
                                  : "bg-[#94a3b8]/15 text-[#94a3b8]"
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-sm font-black text-[#17313d]">
                                  {slot.name} ({slot.code})
                                </strong>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#e2e8f0] text-[#475569]">
                                  {slot.role}
                                </span>
                              </div>
                              {isDone && insp ? (
                                <div className="text-[11px] text-[#647783] flex items-center gap-2 mt-0.5">
                                  <span>Oleh: <strong className="text-[#17313d]">{insp.inspectorName}</strong></span>
                                  <span>•</span>
                                  <span>{insp.displayTime}</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">
                                  Belum diisi oleh {slot.role.toLowerCase()}
                                </div>
                              )}
                            </div>
                          </div>

                          {isDone && insp && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                insp.overallStatus === "ADA_TEMUAN"
                                  ? "bg-[#fef3c7] text-[#b45309]"
                                  : "bg-[#dcfce7] text-[#15803d]"
                              }`}
                            >
                              {insp.overallStatus === "ADA_TEMUAN" ? `${insp.dirtyCount} Temuan` : "Bersih"}
                            </span>
                          )}
                        </div>

                        {/* Findings list if any */}
                        {isDone && insp?.findings && insp.findings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-[#b91c1c] block tracking-wider">
                              Daftar Temuan:
                            </span>
                            <div className="space-y-1">
                              {insp.findings.map((f: any, fIdx: number) => (
                                <div
                                  key={fIdx}
                                  className="text-xs bg-white/80 p-2 rounded-xl border border-[#f59e0b]/30 flex flex-col gap-0.5 text-[#17313d]"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold">{f.activityName}</span>
                                    <span className="text-[10px] font-bold text-[#b91c1c]">
                                      {f.qualityLabel || f.functionLabel || "Kotor/Rusak"}
                                    </span>
                                  </div>
                                  {f.note && (
                                    <p className="text-[11px] text-[#647783] italic">
                                      &ldquo;{f.note}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#f1f5f9] bg-[#f8fafc] flex items-center justify-between gap-3">
              <a
                href={`/admin/export?roomId=${selectedDetailRoom.id}`}
                className="px-4 py-2 bg-white border border-[#d8e3ea] hover:bg-[#f1f5f9] text-[#0076a8] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ekspor Ceklis Excel Ruangan Ini
              </a>

              <button
                type="button"
                onClick={() => setSelectedDetailRoom(null)}
                className="px-5 py-2 bg-[#072d3f] hover:bg-[#0076a8] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
