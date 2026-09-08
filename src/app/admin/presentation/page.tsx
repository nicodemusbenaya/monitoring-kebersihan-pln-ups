"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RefreshCw,
  ArrowLeft,
  Tv,
  Layers,
  Camera,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Building2,
  X,
  ExternalLink,
} from "lucide-react";

export default function PresentationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // View state: 'OVERVIEW' | 'ROOMS' | 'EVIDENCE'
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "ROOMS" | "EVIDENCE">("OVERVIEW");
  const [autoCycle, setAutoCycle] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-refresh countdown (20s)
  const [refreshCountdown, setRefreshCountdown] = useState(20);
  // Auto-cycle tab countdown (25s)
  const [cycleCountdown, setCycleCountdown] = useState(25);

  // Evidence photo carousel index (10 photos, 7s cycle)
  const [photoIndex, setPhotoIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomFilter, setRoomFilter] = useState<"ALL" | "FINDING" | "INCOMPLETE" | "SPV">("ALL");

  // Fetch dashboard data
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Presentation data fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshCountdown(20);
    }
  }, []);

  // Initial load & real-time timer
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Real-time clock update (every 1s)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now) + " WIB"
      );
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // 1-second interval for countdowns and auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;

      // Data refresh countdown
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchData(false);
          return 20;
        }
        return prev - 1;
      });

      // Auto cycle tabs countdown (when enabled)
      if (autoCycle) {
        setCycleCountdown((prev) => {
          if (prev <= 1) {
            setActiveTab((current) => {
              if (current === "OVERVIEW") return "ROOMS";
              if (current === "ROOMS") return "EVIDENCE";
              return "OVERVIEW";
            });
            return 25;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, autoCycle, fetchData]);

  // Photo carousel auto-cycle (every 7 seconds)
  useEffect(() => {
    if (isPaused) return;
    const photoTimer = setInterval(() => {
      setData((prevData: any) => {
        const total = prevData?.latestPhotos?.length || 0;
        if (total > 0) {
          setPhotoIndex((idx) => (idx + 1) % total);
        }
        return prevData;
      });
    }, 7000);

    return () => clearInterval(photoTimer);
  }, [isPaused]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !selectedRoom) {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "f" || e.key === "F") {
        if (!selectedRoom) toggleFullscreen();
      } else if (e.key === "Escape" && selectedRoom) {
        setSelectedRoom(null);
      } else if (e.key === "ArrowRight" && activeTab === "EVIDENCE") {
        const total = data?.latestPhotos?.length || 0;
        if (total > 0) setPhotoIndex((i) => (i + 1) % total);
      } else if (e.key === "ArrowLeft" && activeTab === "EVIDENCE") {
        const total = data?.latestPhotos?.length || 0;
        if (total > 0) setPhotoIndex((i) => (i - 1 + total) % total);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRoom, activeTab, data]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#040f17] text-white flex flex-col items-center justify-center font-sans">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0076a8] to-[#06b6d4] animate-pulse flex items-center justify-center p-4 shadow-2xl shadow-cyan-500/20">
            <Image
              src="/pln-emblem.svg"
              alt="PLN Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
            />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-cyan-400/30 animate-ping" />
        </div>
        <h2 className="text-xl font-black tracking-wide text-white">COMMAND CENTER MONITORING PLN UPS</h2>
        <p className="text-xs text-slate-400 mt-2 font-medium tracking-wider uppercase">
          Menghubungkan ke Real-Time Engine & Storage NAS QNAP...
        </p>
      </div>
    );
  }

  // Pre-calculate KPIs & chart metrics
  const metrics = data?.metrics || {};
  const summary = data?.summary || {};
  const dailyTrend = data?.dailyTrend || [];
  const ratingDist = data?.ratingDist || { 4: 0, 3: 0, 2: 0, 1: 0 };
  const latestPhotos = data?.latestPhotos || [];
  const roomSummaries = data?.roomSummaries || [];
  const findings = data?.findings || [];

  // Filtered rooms for Tab 2
  const filteredRooms = roomSummaries.filter((r: any) => {
    if (roomFilter === "FINDING") return r.hasFindings || r.dirtyCount > 0;
    if (roomFilter === "INCOMPLETE") return r.status === "PARTIAL" || r.status === "EMPTY";
    if (roomFilter === "SPV") return r.status === "WAITING_SPV";
    return true;
  });

  // Trend chart calculations
  const maxTrendTotal = Math.max(15, ...dailyTrend.map((d: any) => d.total || 0));
  const todayDayNumber = new Date().getDate();

  // Rating breakdown calculations
  const totalEvals = metrics.totalEvaluations || 0;
  const star4Count = ratingDist[4] || 0;
  const star3Count = ratingDist[3] || 0;
  const star2Count = ratingDist[2] || 0;
  const star1Count = ratingDist[1] || 0;
  const star4Pct = totalEvals > 0 ? Math.round((star4Count / totalEvals) * 100) : 0;
  const star3Pct = totalEvals > 0 ? Math.round((star3Count / totalEvals) * 100) : 0;
  const star2Pct = totalEvals > 0 ? Math.round((star2Count / totalEvals) * 100) : 0;
  const star1Pct = totalEvals > 0 ? Math.round((star1Count / totalEvals) * 100) : 0;

  // Active photo
  const activePhoto = latestPhotos[photoIndex] || null;

  return (
    <div className="h-screen w-screen bg-[#040f17] text-slate-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0076a8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ffd100]/5 rounded-full blur-3xl pointer-events-none" />

      {/* ────────────────── TOP TV COMMAND HEADER ────────────────── */}
      <header className="h-[76px] shrink-0 bg-[#081b28]/95 backdrop-blur-md border-b border-[#123349] px-5 sm:px-8 flex items-center justify-between z-20 shadow-xl">
        {/* Left: PLN Logo & Corporate Title */}
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/10 rounded-2xl border border-white/20 shadow-md">
            <Image
              src="/pln-emblem.svg"
              alt="PLN Logo"
              width={34}
              height={34}
              className="w-8 h-8 object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#ffd100] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#ffd100]/10 border border-[#ffd100]/20">
                LIVE COMMAND CENTER
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SISTEM AKTIF
              </span>
              <span className="hidden xl:inline text-[10px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
                QNAP NAS OK
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Monitoring Kebersihan & 5S <span className="text-slate-500 font-normal">|</span>{" "}
              <span className="text-[#00b4d8] font-bold">PLN UPS</span>
            </h1>
          </div>
        </div>

        {/* Center: View Mode Tabs & Auto-Cycle Indicator */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="p-1 bg-[#051420] border border-[#143d56] rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab("OVERVIEW");
                setCycleCountdown(25);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "OVERVIEW"
                  ? "bg-gradient-to-r from-[#0076a8] to-[#0095d9] text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Ringkasan & Chart</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ROOMS");
                setCycleCountdown(25);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "ROOMS"
                  ? "bg-gradient-to-r from-[#0076a8] to-[#0095d9] text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriks Ruangan</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-white/20 text-white">
                {roomSummaries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("EVIDENCE");
                setCycleCountdown(25);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "EVIDENCE"
                  ? "bg-gradient-to-r from-[#0076a8] to-[#0095d9] text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Galeri Evidence</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-white/20 text-white">
                {latestPhotos.length}
              </span>
            </button>
          </div>

          {/* Auto Cycle Toggle */}
          <button
            type="button"
            onClick={() => setAutoCycle(!autoCycle)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              autoCycle
                ? "bg-[#0c2f44] border-cyan-500/40 text-cyan-300"
                : "bg-[#051420] border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={autoCycle ? "Putar otomatis aktif (berganti setiap 25s)" : "Putar otomatis nonaktif"}
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoCycle ? "text-[#ffd100] animate-spin" : ""}`} />
            <span>Rotasi: {autoCycle ? `${cycleCountdown}s` : "Off"}</span>
          </button>
        </div>

        {/* Right: Clock & Executive Controls */}
        <div className="flex items-center gap-3">
          {/* Clock */}
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
              WAKTU OPERASIONAL
            </span>
            <span className="text-sm font-mono font-bold text-white tracking-wide">{currentTime}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {/* Pause / Play */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                isPaused
                  ? "bg-amber-950/50 border-amber-500 text-amber-300"
                  : "bg-[#0c2637] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
              }`}
              title={isPaused ? "Lanjutkan auto-refresh (Spasi)" : "Jeda auto-refresh (Spasi)"}
            >
              {isPaused ? <Play className="w-4 h-4 fill-amber-300" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Refresh Countdown Pill */}
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="px-2.5 h-9 rounded-xl bg-[#0c2637] border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              title="Segarkan data sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span>{refreshCountdown}s</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-[#0c2637] border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              title={isFullscreen ? "Keluar Layar Penuh (F)" : "Layar Penuh (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Back to Admin */}
            <Link
              href="/admin"
              className="px-3 h-9 rounded-xl bg-gradient-to-r from-red-950/50 to-slate-900 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all ml-1 shadow-sm"
              title="Kembali ke Portal Administrasi"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Portal Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Auto-cycle Progress Line */}
      {autoCycle && (
        <div className="h-0.5 bg-[#0a1e2d] w-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0076a8] via-[#06b6d4] to-[#ffd100] transition-all duration-1000 ease-linear"
            style={{ width: `${((25 - cycleCountdown) / 25) * 100}%` }}
          />
        </div>
      )}

      {/* ────────────────── MAIN STAGE CONTENT ────────────────── */}
      <main className="flex-1 p-4 sm:p-5 overflow-y-auto overflow-x-hidden relative">
        {/* ════════════════════════════════════════════════════════════
            VIEW 1: OVERVIEW (EXECUTIVE COMMAND CENTER & CHARTS)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-4 max-w-[1920px] mx-auto animate-fadeIn">
            {/* ── TOP KPI RIBBON (4 CARDS) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Sesi Hari Ini */}
              <div className="bg-gradient-to-br from-[#081f2f] to-[#061722] border border-[#133c56] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-[#0076a8] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    PEMERIKSAAN HARI INI
                  </span>
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {metrics.inspectionsTodayCount || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Sesi Selesai</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#123247] flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {metrics.cleanCount || 0} Bersih
                  </span>
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      (metrics.findingCount || 0) > 0 ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {metrics.findingCount || 0} Temuan
                  </span>
                </div>
              </div>

              {/* Card 2: Tingkat Kepatuhan Sesi */}
              <div className="bg-gradient-to-br from-[#081f2f] to-[#061722] border border-[#133c56] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-emerald-500 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    KEPATUHAN PEMENUHAN
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                    {summary.completionRate || 0}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {summary.completedSessions || 0}/{summary.totalExpectedSessions || 0} Sesi Target
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#123247]">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-700"
                      style={{ width: `${Math.min(100, summary.completionRate || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Kepuasan Pengguna (CSAT) */}
              <div className="bg-gradient-to-br from-[#081f2f] to-[#061722] border border-[#133c56] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-[#ffd100] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    KEPUASAN PENGGUNA (CSAT)
                  </span>
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 text-[#ffd100]">
                    <Star className="w-4 h-4 fill-[#ffd100]" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-[#ffd100] tracking-tight flex items-center gap-1.5">
                    {metrics.averageRating || "0.0"}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 4.0 Skala</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#123247] flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">{metrics.satisfactionRate || 0}% Sangat Puas</span>
                  <span className="text-slate-400 font-medium">{totalEvals} Ulasan Bulan Ini</span>
                </div>
              </div>

              {/* Card 4: Akumulasi Operasional Bulanan */}
              <div className="bg-gradient-to-br from-[#081f2f] to-[#061722] border border-[#133c56] rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-purple-500 transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    AKUMULASI BULAN INI
                  </span>
                  <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {metrics.monthlyInspectionsCount || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Total Sesi Lapangan</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#123247] flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Rasio Bersih:{" "}
                    <span className="text-emerald-400 font-bold">
                      {metrics.monthlyInspectionsCount
                        ? Math.round(
                            ((metrics.monthlyCleanCount || 0) / metrics.monthlyInspectionsCount) * 100
                          )
                        : 0}
                      %
                    </span>
                  </span>
                  <span className="text-slate-400">
                    {metrics.monthlyFindingCount || 0} Temuan Diselesaikan
                  </span>
                </div>
              </div>
            </div>

            {/* ── ROW 2: 3 DISTINCT, HIGH-LEGIBILITY CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* CHART 1: TREN OPERASIONAL & TEMUAN BULANAN (6 COLS) */}
              <div className="lg:col-span-6 bg-[#081b28] border border-[#12354c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                {/* Header with Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#12354c]">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0095d9]" />
                      Tren Operasional Harian Bulan Ini
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Distribusi sesi inspeksi checklist per hari (Tgl 1 - {dailyTrend.length})
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#0076a8]" /> Sesi Selesai
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Ada Temuan
                    </span>
                  </div>
                </div>

                {/* Main Daily Bar Chart Area */}
                <div className="h-52 pt-6 pb-2 flex items-end gap-1 sm:gap-1.5 overflow-x-auto">
                  {dailyTrend.map((item: any) => {
                    const count = item.total || 0;
                    const findingsCount = item.finding || 0;
                    const isToday = item.day === todayDayNumber;
                    const barHeightPct =
                      count > 0 ? Math.min(100, Math.max(8, (count / maxTrendTotal) * 100)) : 3;

                    return (
                      <div
                        key={item.day}
                        className="flex-1 min-w-[10px] h-full flex flex-col items-center justify-end group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#020b12] border border-[#1e4e6d] text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-30">
                          <div className="text-cyan-400 font-black">
                            Tgl {item.day} {isToday ? "(Hari Ini)" : ""}
                          </div>
                          <div>{count} Sesi Pemeriksaan</div>
                          {findingsCount > 0 ? (
                            <div className="text-amber-400">{findingsCount} Catatan Temuan</div>
                          ) : (
                            <div className="text-emerald-400">100% Bersih</div>
                          )}
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isToday
                              ? "ring-2 ring-[#ffd100] shadow-lg shadow-yellow-500/20"
                              : ""
                          } ${
                            findingsCount > 0
                              ? "bg-gradient-to-t from-amber-600 to-amber-400"
                              : count > 0
                              ? "bg-gradient-to-t from-[#005a82] to-[#0095d9]"
                              : "bg-slate-800/40"
                          }`}
                          style={{ height: `${barHeightPct}%` }}
                        />

                        {/* Day Number Label (Every 5 days or today) */}
                        <span
                          className={`text-[9px] mt-1.5 font-mono ${
                            isToday
                              ? "text-[#ffd100] font-black underline"
                              : item.day % 5 === 0 || item.day === 1
                              ? "text-slate-400 font-bold"
                              : "text-transparent"
                          }`}
                        >
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Insight */}
                <div className="pt-3 border-t border-[#12354c] flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Hari ini: <strong className="text-white">Tgl {todayDayNumber}</strong> ({metrics.inspectionsTodayCount || 0} sesi)
                  </span>
                  <span>
                    Puncak Bulanan: <strong className="text-cyan-400">{maxTrendTotal} Sesi/Hari</strong>
                  </span>
                </div>
              </div>

              {/* CHART 2: DISTRIBUSI KEPUASAN & RATING (3 COLS) */}
              <div className="lg:col-span-3 bg-[#081b28] border border-[#12354c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="pb-3 border-b border-[#12354c]">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 fill-[#ffd100] text-[#ffd100]" />
                    Distribusi Rating & CSAT
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ulasan kepuasan pengguna anonim</p>
                </div>

                {/* Score Showcase */}
                <div className="my-2 bg-[#051420] border border-[#143c56] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black block">
                      RATA-RATA SKOR
                    </span>
                    <div className="text-3xl font-black text-[#ffd100] flex items-center gap-1.5 mt-0.5">
                      <span>{metrics.averageRating || "0.0"}</span>
                      <span className="text-xs font-semibold text-slate-400">/ 4.0</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">
                      TINGKAT KEPUASAN
                    </span>
                    <span className="text-2xl font-black text-emerald-400 block mt-0.5">
                      {metrics.satisfactionRate || 0}%
                    </span>
                  </div>
                </div>

                {/* 4 Star Tier Progress Bars */}
                <div className="space-y-2.5 my-1">
                  {/* Bintang 4 */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span>★★★★</span> <span className="text-slate-300 font-normal">Sangat Puas</span>
                      </span>
                      <span className="text-white font-mono">{star4Count} ({star4Pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${star4Pct}%` }} />
                    </div>
                  </div>

                  {/* Bintang 3 */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-cyan-400 flex items-center gap-1">
                        <span>★★★</span> <span className="text-slate-300 font-normal">Puas</span>
                      </span>
                      <span className="text-white font-mono">{star3Count} ({star3Pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${star3Pct}%` }} />
                    </div>
                  </div>

                  {/* Bintang 2 */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-amber-400 flex items-center gap-1">
                        <span>★★</span> <span className="text-slate-300 font-normal">Cukup</span>
                      </span>
                      <span className="text-white font-mono">{star2Count} ({star2Pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${star2Pct}%` }} />
                    </div>
                  </div>

                  {/* Bintang 1 */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-rose-400 flex items-center gap-1">
                        <span>★</span> <span className="text-slate-300 font-normal">Kurang</span>
                      </span>
                      <span className="text-white font-mono">{star1Count} ({star1Pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${star1Pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#12354c] text-[11px] text-slate-400 flex justify-between">
                  <span>Standar Layanan 5S PLN</span>
                  <span className="font-bold text-white">{totalEvals} Total Responden</span>
                </div>
              </div>

              {/* CHART 3: KOMPOSISI STATUS RUANGAN (3 COLS) */}
              <div className="lg:col-span-3 bg-[#081b28] border border-[#12354c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="pb-3 border-b border-[#12354c]">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Status Ruangan Hari Ini
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Progres checklist seluruh {roomSummaries.length} ruangan aktif
                  </p>
                </div>

                {/* 4 Status Matrix Pill Breakdown */}
                <div className="grid grid-cols-2 gap-2.5 my-2">
                  <div className="bg-[#051420] border border-emerald-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Lengkap</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {summary.greenCount || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#051420] border border-purple-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Tunggu SPV</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {summary.purpleCount || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#051420] border border-amber-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Sebagian</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {summary.yellowCount || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#051420] border border-rose-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Belum Mulai</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {summary.redCount || 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">ruang</span>
                    </div>
                  </div>
                </div>

                {/* Stacked Composition Bar */}
                <div className="mt-1">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Komposisi Keseluruhan</span>
                    <span className="font-bold text-white">
                      {summary.greenCount + summary.purpleCount}/{roomSummaries.length} Selesai Petugas
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-400 h-full transition-all"
                      style={{
                        width: `${((summary.greenCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Lengkap"
                    />
                    <div
                      className="bg-purple-400 h-full transition-all"
                      style={{
                        width: `${((summary.purpleCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Tunggu SPV"
                    />
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width: `${((summary.yellowCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Sebagian"
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{
                        width: `${((summary.redCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Belum Mulai"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#12354c] text-[11px] text-slate-400 flex justify-between">
                  <span>Target: 100% Lengkap Hari Ini</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ROOMS")}
                    className="text-cyan-400 hover:underline font-bold flex items-center gap-0.5"
                  >
                    Buka Matriks Detail <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── ROW 3: LIVE EVIDENCE SHOWCASE & ATTENTION ITEMS FEED ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LEFT: 10 EVIDENCE PHOTOS SHOWCASE (7 COLS) */}
              <div className="lg:col-span-7 bg-[#081b28] border border-[#12354c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-[#12354c]">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Dokumentasi Foto Evidence Lapangan
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">
                      Foto <strong className="text-white">{photoIndex + 1}</strong> dari{" "}
                      <strong className="text-white">{latestPhotos.length}</strong>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoIndex((i) => (i - 1 + latestPhotos.length) % latestPhotos.length)
                        }
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        title="Foto sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i + 1) % latestPhotos.length)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        title="Foto berikutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Display Card */}
                {activePhoto ? (
                  <div className="my-3 flex flex-col sm:flex-row gap-4 bg-[#051420] border border-[#143c56] rounded-xl p-3">
                    {/* Image */}
                    <div className="relative w-full sm:w-64 h-48 sm:h-44 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                      <Image
                        src={activePhoto.fileUrl}
                        alt={`Evidence ${activePhoto.roomName}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-md ${
                            activePhoto.overallStatus === "ADA_TEMUAN"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-emerald-500 text-slate-950"
                          }`}
                        >
                          {activePhoto.overallStatus === "ADA_TEMUAN" ? "⚠ Ada Temuan" : "✓ Bersih"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                            {activePhoto.slotName} ({activePhoto.slotRole})
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {activePhoto.displayTime}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-white mt-1.5">{activePhoto.roomName}</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Pemeriksa: <strong className="text-[#ffd100]">{activePhoto.officerName}</strong>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Status: Standar 5S</span>
                        <span className="text-cyan-400 font-medium">QNAP NAS Storage</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-6 text-center text-slate-500 text-xs py-10">
                    Belum ada foto evidence tersimpan hari ini.
                  </div>
                )}

                {/* 10 Photo Thumbnail Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-2">
                  {latestPhotos.map((photo: any, idx: number) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPhotoIndex(idx)}
                      className={`relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        idx === photoIndex
                          ? "border-[#ffd100] ring-2 ring-yellow-400/30 scale-105"
                          : "border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={photo.fileUrl}
                        alt={`Thumb ${idx}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: LIVE ATTENTION ITEMS & ACTIVITY FEED (5 COLS) */}
              <div className="lg:col-span-5 bg-[#081b28] border border-[#12354c] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-[#12354c]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        findings.length > 0 ? "text-amber-400 animate-bounce" : "text-emerald-400"
                      }`}
                    />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {findings.length > 0 ? "Item Perhatian & Temuan Hari Ini" : "Status Bersih & Optimal"}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      findings.length > 0 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {findings.length} Catatan
                  </span>
                </div>

                <div className="my-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {findings.length > 0 ? (
                    findings.map((f: any, idx: number) => (
                      <div
                        key={f.id || idx}
                        className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <strong className="text-amber-300 font-bold">{f.roomName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{f.time} WIB</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {f.note || "Perlu perhatian dan tindak lanjut kebersihan."}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Oleh: {f.officerName}</span>
                          <span className="text-amber-400 font-semibold">{f.slotName}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Semua Ruangan Memenuhi Standar</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Tidak ada temuan kotor atau kerusakan yang belum diselesaikan hari ini.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#12354c] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Sistem Siaga Operasional</span>
                  <span className="text-slate-300 font-mono">Tervalidasi SPV</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            VIEW 2: FULL ROOM MATRIX BOARD
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "ROOMS" && (
          <div className="space-y-4 max-w-[1920px] mx-auto animate-fadeIn">
            {/* Filter Ribbons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#081b28] border border-[#12354c] rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Filter Ruangan:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRoomFilter("ALL")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "ALL"
                        ? "bg-[#0076a8] text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua ({roomSummaries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("FINDING")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "FINDING"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Ada Temuan ({roomSummaries.filter((r: any) => r.hasFindings).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("SPV")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "SPV"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Tunggu SPV ({summary.purpleCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("INCOMPLETE")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "INCOMPLETE"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Belum Lengkap ({summary.yellowCount + summary.redCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Lengkap
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Tunggu SPV
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Sebagian
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Belum Ada
                </span>
              </div>
            </div>

            {/* Complete Room Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredRooms.map((room: any) => {
                const isComplete = room.status === "COMPLETE";
                const isWaitingSpv = room.status === "WAITING_SPV";
                const isPartial = room.status === "PARTIAL";

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] flex flex-col justify-between shadow-lg ${
                      isComplete
                        ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
                        : isWaitingSpv
                        ? "bg-purple-950/20 border-purple-500/40 hover:border-purple-400"
                        : isPartial
                        ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-400"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {room.code}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isComplete
                              ? "bg-emerald-400 shadow-md shadow-emerald-500/40"
                              : isWaitingSpv
                              ? "bg-purple-400 animate-pulse"
                              : isPartial
                              ? "bg-amber-400"
                              : "bg-rose-500"
                          }`}
                        />
                      </div>
                      <h4 className="text-xs font-black text-white mt-1 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                        {room.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">{room.roomTypeName}</span>
                    </div>

                    {/* Slot Chips */}
                    <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Progres Sesi</span>
                        <span className="font-mono font-bold text-white">
                          {room.completedSlots}/{room.totalSlots}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {room.slots?.map((s: any) => (
                          <span
                            key={s.id}
                            className={`flex-1 text-center py-0.5 rounded text-[9px] font-bold ${
                              s.completed
                                ? s.inspection?.overallStatus === "ADA_TEMUAN"
                                  ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-500"
                            }`}
                            title={`${s.name} (${s.role}): ${s.completed ? "Selesai" : "Belum"}`}
                          >
                            {s.name.slice(0, 1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            VIEW 3: FULL EVIDENCE THEATER
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "EVIDENCE" && (
          <div className="h-full flex flex-col justify-between max-w-5xl mx-auto animate-fadeIn py-2">
            {activePhoto ? (
              <div className="bg-[#081b28] border border-[#12354c] rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row gap-6">
                {/* Large Main Photo */}
                <div className="relative w-full md:w-3/5 h-80 md:h-[450px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
                  <Image
                    src={activePhoto.fileUrl}
                    alt={activePhoto.roomName}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg ${
                        activePhoto.overallStatus === "ADA_TEMUAN"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {activePhoto.overallStatus === "ADA_TEMUAN" ? "⚠ Ada Temuan" : "✓ Bersih & Optimal"}
                    </span>
                  </div>
                </div>

                {/* Information Details */}
                <div className="w-full md:w-2/5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                        EVIDENCE DETAIL #{photoIndex + 1}
                      </span>
                      <h2 className="text-2xl font-black text-white mt-1">{activePhoto.roomName}</h2>
                      <span className="text-xs text-slate-400">{activePhoto.roomCode}</span>
                    </div>

                    <div className="space-y-2.5 bg-[#051420] border border-[#143c56] rounded-2xl p-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Petugas Pemeriksa:</span>
                        <strong className="text-[#ffd100]">{activePhoto.officerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sesi Checklist:</span>
                        <strong className="text-white">{activePhoto.slotName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peran Sesi:</span>
                        <strong className="text-cyan-400">{activePhoto.slotRole}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Waktu Pengambilan:</span>
                        <strong className="text-white font-mono">{activePhoto.displayTime}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage Penyimpanan:</span>
                        <strong className="text-emerald-400">QNAP NAS On-Premise</strong>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex((i) => (i - 1 + latestPhotos.length) % latestPhotos.length)
                      }
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Foto Sebelumnya
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => (i + 1) % latestPhotos.length)}
                      className="flex-1 py-2.5 rounded-xl bg-[#0076a8] hover:bg-[#0095d9] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      Foto Berikutnya <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">Belum ada foto evidence tersimpan.</div>
            )}

            {/* Thumbnail selector */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-3">
              {latestPhotos.map((photo: any, idx: number) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    idx === photoIndex
                      ? "border-[#ffd100] ring-2 ring-yellow-400/40 scale-110"
                      : "border-slate-800 opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image src={photo.fileUrl} alt={`Thumb ${idx}`} fill unoptimized className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ────────────────── BOTTOM STATUS TICKER & SHORTCUTS ────────────────── */}
      <footer className="h-10 shrink-0 bg-[#061722] border-t border-[#123349] px-6 flex items-center justify-between text-[11px] text-slate-400 z-20">
        <div className="flex items-center gap-4">
          <span>Sistem Monitoring Kebersihan PLN Unit Pelaksana Transmisi</span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">Storage: QNAP NAS Engine Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-slate-500">
            Pintasan: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Spasi</kbd> Jeda ·{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">F</kbd> Layar Penuh
          </span>
          <span className="text-[#ffd100] font-bold">Standar 5S Kebersihan BUMN</span>
        </div>
      </footer>

      {/* ────────────────── ROOM DETAIL MODAL ────────────────── */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#081b28] border border-[#143d56] rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  {selectedRoom.code}
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">{selectedRoom.name}</h3>
                <span className="text-xs text-slate-400">{selectedRoom.roomTypeName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slots Detail List */}
            <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Rincian Sesi Checklist:
              </span>
              {selectedRoom.slots?.map((slot: any) => (
                <div
                  key={slot.id}
                  className={`p-3 rounded-xl border ${
                    slot.completed
                      ? slot.inspection?.overallStatus === "ADA_TEMUAN"
                        ? "bg-amber-950/20 border-amber-500/40"
                        : "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">{slot.name}</h4>
                      <span className="text-[10px] text-slate-400 block">{slot.role}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        slot.completed
                          ? slot.inspection?.overallStatus === "ADA_TEMUAN"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {slot.completed
                        ? slot.inspection?.overallStatus === "ADA_TEMUAN"
                          ? "Temuan"
                          : "Selesai Bersih"
                        : "Belum Dikerjakan"}
                    </span>
                  </div>

                  {slot.inspection && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[11px] text-slate-300">
                      <span>Pemeriksa: {slot.inspection.inspectorName}</span>
                      <span className="font-mono text-slate-400">{slot.inspection.displayTime}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
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
