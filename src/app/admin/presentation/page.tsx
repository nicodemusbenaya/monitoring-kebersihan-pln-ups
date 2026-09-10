"use client";

import { useState, useEffect, useCallback } from "react";
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
  Users,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Building2,
  X,
  Eye,
} from "lucide-react";

// Safe photo URL converter for NAS on-premise storage
const getPhotoUrl = (fileUrl: string) => {
  if (!fileUrl) return "/api/kebersihan/evidence?path=NOT_FOUND";
  return fileUrl.startsWith("http")
    ? fileUrl
    : `/api/kebersihan/evidence?path=${encodeURIComponent(fileUrl)}`;
};

// Format countdown MM:SS
const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function PresentationPage() {
  const [data, setData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // View state: 'OVERVIEW' | 'PERFORMANCE' | 'EVALUATIONS' | 'ROOMS' | 'EVIDENCE'
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PERFORMANCE" | "EVALUATIONS" | "ROOMS" | "EVIDENCE">("OVERVIEW");
  const [autoCycle, setAutoCycle] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-refresh: 10 Menit (600s), DEFAULT: OFF (Hemat Kuota Bandwidth & Neon DB)
  const REFRESH_INTERVAL = 600;
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL);

  // Auto-cycle tab countdown (25s)
  const [cycleCountdown, setCycleCountdown] = useState(25);

  // Evidence photo carousel index (10 photos, 7s cycle)
  const [photoIndex, setPhotoIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<any>(null);
  const [roomFilter, setRoomFilter] = useState<"ALL" | "FINDING" | "INCOMPLETE" | "SPV">("ALL");

  // Fetch both dashboard and performance data
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [dashRes, perfRes] = await Promise.all([
        fetch("/api/admin/dashboard").then((r) => r.json()),
        fetch("/api/admin/performance").then((r) => r.json()),
      ]);
      if (dashRes.ok) setData(dashRes.data);
      if (perfRes.ok) setPerformanceData(perfRes.data);
    } catch (e) {
      console.error("Presentation data fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshCountdown(REFRESH_INTERVAL);
    }
  }, [REFRESH_INTERVAL]);

  // Initial load
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
      // Pause countdown if user paused or tab is hidden in background
      if (isPaused || (typeof document !== "undefined" && document.hidden)) return;

      // Data refresh countdown (ONLY runs when autoRefreshEnabled is TRUE)
      if (autoRefreshEnabled) {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            fetchData(false);
            return REFRESH_INTERVAL;
          }
          return prev - 1;
        });
      }

      // Auto cycle tabs countdown (when enabled)
      if (autoCycle) {
        setCycleCountdown((prev) => {
          if (prev <= 1) {
            setActiveTab((current) => {
              if (current === "OVERVIEW") return "PERFORMANCE";
              if (current === "PERFORMANCE") return "EVALUATIONS";
              if (current === "EVALUATIONS") return "ROOMS";
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
  }, [isPaused, autoRefreshEnabled, autoCycle, fetchData, REFRESH_INTERVAL]);

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
      if (e.key === " " && !selectedRoom && !selectedPhotoModal) {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "f" || e.key === "F") {
        if (!selectedRoom && !selectedPhotoModal) toggleFullscreen();
      } else if (e.key === "Escape") {
        if (selectedPhotoModal) setSelectedPhotoModal(null);
        else if (selectedRoom) setSelectedRoom(null);
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
  }, [selectedRoom, selectedPhotoModal, activeTab, data]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#edf2f6] text-[#17313d] flex flex-col items-center justify-center font-sans">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#0076a8] flex items-center justify-center p-4 shadow-xl border border-white/20">
            <Image
              src="/pln-emblem.svg"
              alt="PLN Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
            />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-[#0076a8]/40 animate-ping" />
        </div>
        <h2 className="text-xl font-black tracking-wide text-[#0076a8]">MODE PRESENTASI MONITORING PLN UPS</h2>
        <p className="text-xs text-[#647783] mt-2 font-medium tracking-wider uppercase">
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
  const officers = performanceData?.officers || [];
  const perfSummary = performanceData?.summary || {};

  // Filtered rooms for Tab 4
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
    <div className="h-screen w-screen bg-[#edf2f6] text-[#17313d] flex flex-col overflow-hidden font-sans select-none relative">
      {/* ────────────────── TOP TV COMMAND HEADER (CYAN PLN COLOR SCHEME - SLEEK & COMPACT) ────────────────── */}
      <header className="h-13 sm:h-14 shrink-0 bg-[#0076a8] border-b border-[#005a82] px-3 sm:px-4 py-1.5 flex flex-nowrap items-center justify-between gap-2.5 z-20 shadow-md text-white">
        {/* Left: PLN Logo & Corporate Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1 bg-white/20 rounded-lg border border-white/30 shadow-xs backdrop-blur-xs">
            <Image
              src="/pln-emblem.svg"
              alt="PLN Logo"
              width={24}
              height={24}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[8px] text-[#072d3f] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#ffd100]">
                MODE TV
              </span>
              <span className="flex items-center gap-1 text-[8px] font-bold text-white bg-white/15 px-1.5 py-0.2 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd100] animate-pulse" />
                LIVE
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1 mt-0.5">
              Monitoring Kebersihan <span className="text-white/40 font-normal">|</span>{" "}
              <span className="text-[#ffd100]">PLN UPS</span>
            </h1>
          </div>
        </div>

        {/* Center: ALL MENU TABS (ALWAYS VISIBLE & COMPACT) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="p-0.5 bg-black/15 border border-white/20 rounded-xl flex items-center gap-1 shrink-0 shadow-inner">
            {/* Tab 1: Ringkasan */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("OVERVIEW");
                setCycleCountdown(25);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "OVERVIEW"
                  ? "bg-[#ffd100] text-[#072d3f] font-black shadow-xs"
                  : "text-white hover:bg-white/10 font-semibold"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Ringkasan</span>
            </button>

            {/* Tab 2: Performa Petugas */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("PERFORMANCE");
                setCycleCountdown(25);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "PERFORMANCE"
                  ? "bg-[#ffd100] text-[#072d3f] font-black shadow-xs"
                  : "text-white hover:bg-white/10 font-semibold"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Performa Petugas</span>
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-md ${activeTab === "PERFORMANCE" ? "bg-[#072d3f]/20 text-[#072d3f]" : "bg-white/20 text-white"}`}>
                {officers.length}
              </span>
            </button>

            {/* Tab 3: Kepuasan Pengguna */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("EVALUATIONS");
                setCycleCountdown(25);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "EVALUATIONS"
                  ? "bg-[#ffd100] text-[#072d3f] font-black shadow-xs"
                  : "text-white hover:bg-white/10 font-semibold"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Kepuasan</span>
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-md ${activeTab === "EVALUATIONS" ? "bg-[#072d3f]/20 text-[#072d3f]" : "bg-white/20 text-white"}`}>
                {totalEvals}
              </span>
            </button>

            {/* Tab 4: Matriks Ruangan */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("ROOMS");
                setCycleCountdown(25);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "ROOMS"
                  ? "bg-[#ffd100] text-[#072d3f] font-black shadow-xs"
                  : "text-white hover:bg-white/10 font-semibold"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriks Ruangan</span>
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-md ${activeTab === "ROOMS" ? "bg-[#072d3f]/20 text-[#072d3f]" : "bg-white/20 text-white"}`}>
                {roomSummaries.length}
              </span>
            </button>

            {/* Tab 5: Galeri Foto */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("EVIDENCE");
                setCycleCountdown(25);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "EVIDENCE"
                  ? "bg-[#ffd100] text-[#072d3f] font-black shadow-xs"
                  : "text-white hover:bg-white/10 font-semibold"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Galeri Foto</span>
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-md ${activeTab === "EVIDENCE" ? "bg-[#072d3f]/20 text-[#072d3f]" : "bg-white/20 text-white"}`}>
                {latestPhotos.length}
              </span>
            </button>
          </div>

          {/* Auto Cycle Toggle */}
          <button
            type="button"
            onClick={() => setAutoCycle(!autoCycle)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 shrink-0 ${
              autoCycle
                ? "bg-[#ffd100] text-[#072d3f] border-[#ffd100]"
                : "bg-white/15 border-white/20 text-white/80 hover:text-white"
            }`}
            title={autoCycle ? "Rotasi slide otomatis aktif (25s)" : "Rotasi slide dinonaktifkan"}
          >
            <Sparkles className={`w-3 h-3 ${autoCycle ? "animate-spin" : ""}`} />
            <span>Rotasi: {autoCycle ? `${cycleCountdown}s` : "Off"}</span>
          </button>
        </div>

        {/* Right: Clock & Executive Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Clock */}
          <div className="text-right hidden 2xl:block">
            <span className="text-[8px] text-white/80 font-bold block uppercase tracking-wider">
              WAKTU REAL-TIME
            </span>
            <span className="text-[11px] font-mono font-bold text-white tracking-wide">{currentTime}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/20">
            {/* Auto-Refresh Toggle Button (Default: OFF, 10 Menit Interval) */}
            {autoRefreshEnabled ? (
              <button
                type="button"
                onClick={() => setAutoRefreshEnabled(false)}
                className="px-2 h-7 rounded-lg bg-[#ffd100] text-[#072d3f] border border-[#ffd100] text-xs font-black flex items-center gap-1 transition-all shadow-xs"
                title="Auto-refresh aktif (10 menit sekali). Klik untuk mematikan."
              >
                <Clock className="w-3 h-3" />
                <span>Auto: ON ({formatCountdown(refreshCountdown)})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAutoRefreshEnabled(true);
                  setRefreshCountdown(REFRESH_INTERVAL);
                }}
                className="px-2 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold flex items-center gap-1 transition-all"
                title="Auto-refresh NONAKTIF (Hemat Kuota Bandwidth & Neon DB). Klik untuk mengaktifkan (10 menit sekali)."
              >
                <Clock className="w-3 h-3 text-white/70" />
                <span>Auto: OFF</span>
              </button>
            )}

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => {
                fetchData(true);
                if (autoRefreshEnabled) setRefreshCountdown(REFRESH_INTERVAL);
              }}
              disabled={loading}
              className="px-2 h-7 rounded-lg bg-white/15 border border-white/25 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 transition-all"
              title="Segarkan data sekarang secara manual"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#ffd100]" : ""}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-7 h-7 rounded-lg bg-white/15 border border-white/25 hover:bg-white/25 text-white flex items-center justify-center transition-all"
              title={isFullscreen ? "Keluar Layar Penuh (F)" : "Layar Penuh (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>

            {/* Back to Admin */}
            <Link
              href="/admin"
              className="px-2 h-7 rounded-lg bg-white text-[#0076a8] hover:bg-white/90 text-xs font-black flex items-center gap-1 transition-all ml-0.5 shadow-xs"
              title="Kembali ke Portal Administrasi"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Auto-cycle Progress Line */}
      {autoCycle && (
        <div className="h-0.5 bg-[#005a82] w-full overflow-hidden">
          <div
            className="h-full bg-[#ffd100] transition-all duration-1000 ease-linear"
            style={{ width: `${((25 - cycleCountdown) / 25) * 100}%` }}
          />
        </div>
      )}

      {/* ────────────────── MAIN STAGE CONTENT (MINIMALIST SCROLLBAR) ────────────────── */}
      <main className="flex-1 p-2.5 sm:p-3 lg:p-3.5 overflow-y-auto minimal-scrollbar relative">
        {/* ════════════════════════════════════════════════════════════
            VIEW 1: OVERVIEW (RINGKASAN & CHART)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-2.5 sm:space-y-3 max-w-[1920px] mx-auto animate-fadeIn">
            {/* ── TOP KPI CARDS (4 COMPACT CARDS) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Card 1: Sesi Hari Ini */}
              <div className="bg-white border border-[#d8e3ea] rounded-xl p-3 shadow-xs relative overflow-hidden group hover:border-[#0076a8] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#647783]">
                    PEMERIKSAAN HARI INI
                  </span>
                  <span className="p-1 rounded-md bg-[#e8f5fa] text-[#0076a8]">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#17313d] tracking-tight">
                    {metrics.inspectionsTodayCount || 0}
                  </span>
                  <span className="text-xs font-semibold text-[#647783]">Sesi Selesai</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold text-[#157a55]">
                    <CheckCircle2 className="w-3 h-3" />
                    {metrics.cleanCount || 0} Bersih
                  </span>
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      (metrics.findingCount || 0) > 0 ? "text-[#ca8a04]" : "text-[#94a3b8]"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {metrics.findingCount || 0} Temuan
                  </span>
                </div>
              </div>

              {/* Card 2: Tingkat Kepatuhan Sesi */}
              <div className="bg-white border border-[#d8e3ea] rounded-xl p-3 shadow-xs relative overflow-hidden group hover:border-[#157a55] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#647783]">
                    KEPATUHAN PEMENUHAN
                  </span>
                  <span className="p-1 rounded-md bg-[#e8f5e9] text-[#157a55]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#157a55] tracking-tight">
                    {summary.completionRate || 0}%
                  </span>
                  <span className="text-xs font-semibold text-[#647783]">
                    {summary.completedSessions || 0}/{summary.totalExpectedSessions || 0} Sesi
                  </span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#f1f5f9]">
                  <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#157a55] h-full transition-all duration-700"
                      style={{ width: `${Math.min(100, summary.completionRate || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Kepuasan Pengguna (CSAT) */}
              <div className="bg-white border border-[#d8e3ea] rounded-xl p-3 shadow-xs relative overflow-hidden group hover:border-[#ca8a04] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#647783]">
                    KEPUASAN PENGGUNA (CSAT)
                  </span>
                  <span className="p-1 rounded-md bg-yellow-50 text-[#ca8a04]">
                    <Star className="w-3.5 h-3.5 fill-[#ca8a04]" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#17313d] tracking-tight flex items-center gap-1">
                    ★ {metrics.averageRating || "0.0"}
                  </span>
                  <span className="text-xs font-semibold text-[#647783]">/ 4.0 Skala</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
                  <span className="text-[#157a55] font-bold">{metrics.satisfactionRate || 0}% Puas</span>
                  <span className="text-[#647783] font-medium">{totalEvals} Ulasan</span>
                </div>
              </div>

              {/* Card 4: Akumulasi Operasional Bulanan */}
              <div className="bg-white border border-[#d8e3ea] rounded-xl p-3 shadow-xs relative overflow-hidden group hover:border-[#7c3aed] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#647783]">
                    AKUMULASI BULAN INI
                  </span>
                  <span className="p-1 rounded-md bg-purple-50 text-[#7c3aed]">
                    <Building2 className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-[#17313d] tracking-tight">
                    {metrics.monthlyInspectionsCount || 0}
                  </span>
                  <span className="text-xs font-semibold text-[#647783]">Total Sesi</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
                  <span className="text-[#647783]">
                    Bersih:{" "}
                    <span className="text-[#157a55] font-bold">
                      {metrics.monthlyInspectionsCount
                        ? Math.round(
                            ((metrics.monthlyCleanCount || 0) / metrics.monthlyInspectionsCount) * 100
                          )
                        : 0}
                      %
                    </span>
                  </span>
                  <span className="text-[#647783]">
                    {metrics.monthlyFindingCount || 0} Temuan
                  </span>
                </div>
              </div>
            </div>

            {/* ── ROW 2: 3 CHARTS (NO UGLY HORIZONTAL SCROLLBAR & SLEEK RATIO) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
              {/* CHART 1: TREN OPERASIONAL & TEMUAN (6 COLS, 100% PROPORTIONAL WIDTH, ZERO SCROLLBAR) */}
              <div className="lg:col-span-6 bg-white border border-[#d8e3ea] rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#e2e8f0]">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#17313d] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0076a8]" />
                      Tren Operasional Harian Bulan Ini
                    </h3>
                    <p className="text-[10px] text-[#647783]">
                      Distribusi checklist (Tgl 1 - {dailyTrend.length})
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="flex items-center gap-1 text-[#17313d] font-bold text-[10px]">
                      <span className="w-2 h-2 rounded-xs bg-[#0076a8]" /> Bersih
                    </span>
                    <span className="flex items-center gap-1 text-[#ca8a04] font-bold text-[10px]">
                      <span className="w-2 h-2 rounded-xs bg-[#eab308]" /> Temuan
                    </span>
                  </div>
                </div>

                {/* Main Daily Bar Chart Area - SLEEK HEIGHT & NO HORIZONTAL SCROLLBAR */}
                <div className="h-32 sm:h-36 pt-2 pb-1 flex items-end gap-0.5 sm:gap-1 w-full overflow-hidden">
                  {dailyTrend.map((item: any) => {
                    const count = item.total || 0;
                    const findingsCount = item.finding || 0;
                    const isToday = item.day === todayDayNumber;
                    const barHeightPct =
                      count > 0 ? Math.min(100, Math.max(8, (count / maxTrendTotal) * 100)) : 3;

                    return (
                      <div
                        key={item.day}
                        className="flex-1 min-w-0 h-full flex flex-col items-center justify-end group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1.5 bg-[#072d3f] text-white text-[10px] font-bold py-1 px-1.5 rounded-md shadow-xl pointer-events-none whitespace-nowrap z-30">
                          <div className="text-[#ffd100] font-black">
                            Tgl {item.day} {isToday ? "(Hari Ini)" : ""}
                          </div>
                          <div>{count} Sesi</div>
                          {findingsCount > 0 ? (
                            <div className="text-amber-300">{findingsCount} Temuan</div>
                          ) : (
                            <div className="text-emerald-300">Bersih</div>
                          )}
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-xs transition-all duration-300 ${
                            isToday
                              ? "ring-1.5 ring-[#0076a8] shadow-xs"
                              : ""
                          } ${
                            findingsCount > 0
                              ? "bg-[#eab308] hover:bg-[#ca8a04]"
                              : count > 0
                              ? "bg-[#0076a8] hover:bg-[#00577d]"
                              : "bg-[#f1f5f9]"
                          }`}
                          style={{ height: `${barHeightPct}%` }}
                        />

                        {/* Day Number Label */}
                        <span
                          className={`text-[8px] sm:text-[9px] mt-0.5 font-mono ${
                            isToday
                              ? "text-[#0076a8] font-black underline"
                              : item.day % 5 === 0 || item.day === 1
                              ? "text-[#647783] font-bold"
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
                <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[10px] text-[#647783]">
                  <span>
                    Hari ini: <strong className="text-[#17313d]">Tgl {todayDayNumber}</strong> ({metrics.inspectionsTodayCount || 0} sesi)
                  </span>
                  <span>
                    Puncak: <strong className="text-[#0076a8]">{maxTrendTotal} Sesi/Hari</strong>
                  </span>
                </div>
              </div>

              {/* CHART 2: DISTRIBUSI KEPUASAN & RATING (3 COLS) */}
              <div className="lg:col-span-3 bg-white border border-[#d8e3ea] rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
                <div className="pb-2 border-b border-[#e2e8f0]">
                  <h3 className="text-xs sm:text-sm font-black text-[#17313d] uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-[#ca8a04] text-[#ca8a04]" />
                    Distribusi Rating & CSAT
                  </h3>
                  <p className="text-[10px] text-[#647783]">Ulasan kepuasan anonim</p>
                </div>

                {/* Score Showcase */}
                <div className="my-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-[#647783] uppercase font-black block">
                      RATA-RATA SKOR
                    </span>
                    <div className="text-xl font-black text-[#17313d] flex items-center gap-1 mt-0.5">
                      <span>★ {metrics.averageRating || "0.0"}</span>
                      <span className="text-[10px] font-semibold text-[#94a3b8]">/ 4.0</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-[#647783] uppercase font-black block">
                      KEPUASAN
                    </span>
                    <span className="text-lg font-black text-[#157a55] block mt-0.5">
                      {metrics.satisfactionRate || 0}%
                    </span>
                  </div>
                </div>

                {/* 4 Star Tier Progress Bars */}
                <div className="space-y-1.5 my-0.5">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-0.5">
                      <span className="text-[#157a55]">★★★★ Sangat Puas</span>
                      <span className="text-[#17313d] font-mono">{star4Count} ({star4Pct}%)</span>
                    </div>
                    <div className="w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#157a55] rounded-full" style={{ width: `${star4Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-0.5">
                      <span className="text-[#0076a8]">★★★ Puas</span>
                      <span className="text-[#17313d] font-mono">{star3Count} ({star3Pct}%)</span>
                    </div>
                    <div className="w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0076a8] rounded-full" style={{ width: `${star3Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-0.5">
                      <span className="text-[#d97706]">★★ Cukup</span>
                      <span className="text-[#17313d] font-mono">{star2Count} ({star2Pct}%)</span>
                    </div>
                    <div className="w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#d97706] rounded-full" style={{ width: `${star2Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-0.5">
                      <span className="text-[#dc2626]">★ Kurang</span>
                      <span className="text-[#17313d] font-mono">{star1Count} ({star1Pct}%)</span>
                    </div>
                    <div className="w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#dc2626] rounded-full" style={{ width: `${star1Pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#e2e8f0] text-[9px] text-[#647783] flex justify-between">
                  <span>Standar 5S PLN</span>
                  <span className="font-bold text-[#17313d]">{totalEvals} Responden</span>
                </div>
              </div>

              {/* CHART 3: KOMPOSISI STATUS RUANGAN (3 COLS) */}
              <div className="lg:col-span-3 bg-white border border-[#d8e3ea] rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
                <div className="pb-2 border-b border-[#e2e8f0]">
                  <h3 className="text-xs sm:text-sm font-black text-[#17313d] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0076a8]" />
                    Status Ruangan Hari Ini
                  </h3>
                  <p className="text-[10px] text-[#647783]">
                    Progres {roomSummaries.length} ruangan aktif
                  </p>
                </div>

                {/* 4 Status Matrix Pill Breakdown */}
                <div className="grid grid-cols-2 gap-1.5 my-1">
                  <div className="bg-[#ecfdf5] border border-emerald-200 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#157a55] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#157a55]" />
                      <span>Lengkap</span>
                    </div>
                    <div className="text-lg font-black text-[#17313d] mt-0.5">
                      {summary.greenCount || 0}
                      <span className="text-[9px] font-normal text-[#647783] ml-0.5">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#f5f3ff] border border-purple-200 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#7c3aed] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                      <span>Tunggu SPV</span>
                    </div>
                    <div className="text-lg font-black text-[#17313d] mt-0.5">
                      {summary.purpleCount || 0}
                      <span className="text-[9px] font-normal text-[#647783] ml-0.5">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#fffbeb] border border-amber-200 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#b45309] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      <span>Sebagian</span>
                    </div>
                    <div className="text-lg font-black text-[#17313d] mt-0.5">
                      {summary.yellowCount || 0}
                      <span className="text-[9px] font-normal text-[#647783] ml-0.5">ruang</span>
                    </div>
                  </div>

                  <div className="bg-[#fef2f2] border border-rose-200 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#be123c] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
                      <span>Belum Mulai</span>
                    </div>
                    <div className="text-lg font-black text-[#17313d] mt-0.5">
                      {summary.redCount || 0}
                      <span className="text-[9px] font-normal text-[#647783] ml-0.5">ruang</span>
                    </div>
                  </div>
                </div>

                {/* Stacked Composition Bar */}
                <div className="mt-0.5">
                  <div className="flex justify-between text-[9px] text-[#647783] mb-0.5">
                    <span>Komposisi</span>
                    <span className="font-bold text-[#17313d]">
                      {summary.greenCount + summary.purpleCount}/{roomSummaries.length} Selesai
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#157a55] h-full transition-all"
                      style={{
                        width: `${((summary.greenCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Lengkap"
                    />
                    <div
                      className="bg-[#7c3aed] h-full transition-all"
                      style={{
                        width: `${((summary.purpleCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Tunggu SPV"
                    />
                    <div
                      className="bg-[#f59e0b] h-full transition-all"
                      style={{
                        width: `${((summary.yellowCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Sebagian"
                    />
                    <div
                      className="bg-[#f43f5e] h-full transition-all"
                      style={{
                        width: `${((summary.redCount || 0) / (roomSummaries.length || 1)) * 100}%`,
                      }}
                      title="Belum Mulai"
                    />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#e2e8f0] text-[9px] text-[#647783] flex justify-between">
                  <span>Target: 100%</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ROOMS")}
                    className="text-[#0076a8] hover:underline font-bold flex items-center gap-0.5"
                  >
                    Matriks Detail <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── ROW 3: LIVE EVIDENCE SHOWCASE & ATTENTION ITEMS FEED (PROPER HEIGHT, NOT CUT OFF) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
              {/* LEFT: 10 EVIDENCE PHOTOS SHOWCASE (7 COLS) */}
              <div className="lg:col-span-7 bg-white border border-[#d8e3ea] rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#0076a8]" />
                    <h3 className="text-xs sm:text-sm font-black text-[#17313d] uppercase tracking-wider">
                      Dokumentasi Foto Evidence Lapangan
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#647783] text-[10px]">
                      Foto <strong className="text-[#17313d]">{photoIndex + 1}</strong> dari{" "}
                      <strong className="text-[#17313d]">{latestPhotos.length}</strong>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoIndex((i) => (i - 1 + latestPhotos.length) % latestPhotos.length)
                        }
                        className="w-5 h-5 rounded-md bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] flex items-center justify-center transition-colors"
                        title="Foto sebelumnya"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i + 1) % latestPhotos.length)}
                        className="w-5 h-5 rounded-md bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] flex items-center justify-center transition-colors"
                        title="Foto berikutnya"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Display Card - FULLY VISIBLE, OBJECT-CONTAIN, CLICK TO ZOOM */}
                {activePhoto ? (
                  <div className="my-1.5 flex flex-col sm:flex-row gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2 sm:p-2.5">
                    {/* Image with Edge CDN Proxy - object-contain ensures no cropping */}
                    <div
                      onClick={() => setSelectedPhotoModal(activePhoto)}
                      className="relative w-full sm:w-44 h-28 sm:h-32 bg-[#072d3f]/5 rounded-lg overflow-hidden shrink-0 border border-[#d8e3ea] cursor-pointer group flex items-center justify-center"
                      title="Klik untuk melihat ukuran penuh"
                    >
                      <img
                        key={activePhoto.id || photoIndex}
                        src={getPhotoUrl(activePhoto.fileUrl)}
                        alt={`Evidence ${activePhoto.roomName}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                        }}
                      />
                      <div className="absolute top-1.5 left-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider shadow-xs ${
                            activePhoto.overallStatus === "ADA_TEMUAN"
                              ? "bg-[#eab308] text-white"
                              : "bg-[#157a55] text-white"
                          }`}
                        >
                          {activePhoto.overallStatus === "ADA_TEMUAN" ? "⚠ Ada Temuan" : "✓ Bersih"}
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-[#0076a8] bg-[#e8f5fa] border border-[#0076a8]/20 px-1.5 py-0.2 rounded">
                            {activePhoto.slotName} ({activePhoto.slotRole})
                          </span>
                          <span className="text-[9px] font-mono text-[#647783]">
                            {activePhoto.displayTime}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-[#17313d] mt-1 line-clamp-1">{activePhoto.roomName}</h4>
                        <p className="text-[11px] text-[#647783] mt-0.5">
                          Pemeriksa: <strong className="text-[#0076a8]">{activePhoto.officerName}</strong>
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-[#e2e8f0] text-[9px] text-[#647783] flex items-center justify-between">
                        <span>Standar 5S Kebersihan PLN</span>
                        <span className="text-[#0076a8] font-medium">QNAP NAS Storage</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-3 text-center text-[#94a3b8] text-xs py-4">
                    Belum ada foto evidence tersimpan hari ini.
                  </div>
                )}

                {/* 10 Photo Thumbnail Strip - COMPACT & VISIBLE */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                  {latestPhotos.map((photo: any, idx: number) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPhotoIndex(idx)}
                      className={`relative w-9 h-7 sm:w-10 sm:h-8 rounded-md overflow-hidden shrink-0 border-2 transition-all bg-[#072d3f]/5 ${
                        idx === photoIndex
                          ? "border-[#0076a8] ring-1 ring-[#0076a8]/40 scale-105"
                          : "border-[#d8e3ea] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={getPhotoUrl(photo.fileUrl)}
                        alt={`Thumb ${idx}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: LIVE ATTENTION ITEMS & ACTIVITY FEED (5 COLS) */}
              <div className="lg:col-span-5 bg-white border border-[#d8e3ea] rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 ${
                        findings.length > 0 ? "text-[#d97706] animate-bounce" : "text-[#157a55]"
                      }`}
                    />
                    <h3 className="text-xs sm:text-sm font-black text-[#17313d] uppercase tracking-wider">
                      {findings.length > 0 ? "Item Perhatian & Temuan" : "Status Bersih & Optimal"}
                    </h3>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      findings.length > 0 ? "bg-amber-100 text-[#b45309]" : "bg-emerald-100 text-[#157a55]"
                    }`}
                  >
                    {findings.length} Catatan
                  </span>
                </div>

                <div className="my-1.5 space-y-1.5 max-h-32 sm:max-h-36 overflow-y-auto minimal-scrollbar pr-1">
                  {findings.length > 0 ? (
                    findings.map((f: any, idx: number) => (
                      <div
                        key={f.id || idx}
                        className="p-2 bg-[#fffbeb] border border-amber-200 rounded-lg text-xs space-y-0.5"
                      >
                        <div className="flex justify-between items-start">
                          <strong className="text-[#b45309] font-bold text-[11px]">{f.roomName}</strong>
                          <span className="text-[9px] text-[#647783] font-mono">{f.time} WIB</span>
                        </div>
                        <p className="text-[#17313d] text-[10px] leading-snug">
                          {f.note || "Perlu perhatian dan tindak lanjut kebersihan."}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-[#647783] pt-0.5">
                          <span>Oleh: {f.officerName}</span>
                          <span className="text-[#ca8a04] font-semibold">{f.slotName}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 px-3 text-center flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-xl bg-[#ecfdf5] border border-emerald-200 flex items-center justify-center text-[#157a55] mb-1 shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-[#17313d]">Semua Ruangan Memenuhi Standar</h4>
                      <p className="text-[10px] text-[#647783] mt-0.5 max-w-xs">
                        Tidak ada temuan kotor atau kerusakan yang belum diselesaikan hari ini.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[9px] text-[#647783]">
                  <span>Sistem Siaga Operasional</span>
                  <span className="text-[#17313d] font-mono font-semibold">Tervalidasi Supervisor</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            VIEW 2: PERFORMA PETUGAS
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "PERFORMANCE" && (
          <div className="space-y-4 max-w-[1920px] mx-auto animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  TOTAL PEMERIKSAAN TIM
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#157a55] my-2 block">
                  {perfSummary?.totalInspections || metrics.monthlyInspectionsCount || 0}
                </strong>
                <span className="text-[11px] text-[#647783]">seluruh petugas • periode bulan ini</span>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  PETUGAS AKTIF MONITORING
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#0076a8] my-2 block">
                  {perfSummary?.activeOfficersCount || officers.length || 0}
                </strong>
                <span className="text-[11px] text-[#647783]">personel kebersihan lapangan</span>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  TINGKAT KEBERSIHAN HASIL TIM
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#17313d] my-2 block">
                  {perfSummary?.cleanlinessRate || 100}%
                </strong>
                <span className="text-[11px] text-[#647783]">
                  {perfSummary?.cleanInspections || 0} sesi tanpa catatan temuan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#17313d] uppercase tracking-wider">
                      Grafik Volume & Status Pemeriksaan Petugas
                    </h3>
                    <p className="text-[11px] text-[#647783]">
                      Panjang bar merepresentasikan perbandingan jumlah pemeriksaan petugas kebersihan.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#0076a8] bg-[#e8f5fa] px-2 py-1 rounded-md">
                    ● Sesi Selesai
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {officers.map((off: any) => {
                    const maxInsp = Math.max(...officers.map((o: any) => o.totalCompleted || 1), 1);
                    const widthPct = Math.min(100, Math.max(12, Math.round(((off.totalCompleted || 0) / maxInsp) * 100)));

                    return (
                      <div key={off.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#0076a8] text-white text-[10px] flex items-center justify-center font-bold">
                              {off.fullName?.charAt(0)}
                            </span>
                            <span className="text-[#17313d]">{off.fullName}</span>
                          </div>
                          <span>
                            <strong className="text-[#17313d]">{off.totalCompleted || 0}</strong> pemeriksaan{" "}
                            <span className="text-[#157a55] font-semibold">({off.cleanPercentage || 100}% bersih)</span>
                          </span>
                        </div>

                        <div className="w-full h-5 bg-[#f1f5f9] rounded-md overflow-hidden relative">
                          {(off.totalCompleted || 0) > 0 ? (
                            <div
                              className="h-full bg-gradient-to-r from-[#0076a8] to-[#0099db] rounded-md flex items-center justify-end pr-2 text-[10px] text-white font-black transition-all"
                              style={{ width: `${widthPct}%` }}
                            >
                              {off.totalCompleted} Sesi
                            </div>
                          ) : (
                            <div className="h-full bg-[#e2e8f0] rounded-md w-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#e2e8f0]">
                  <h3 className="text-sm font-extrabold text-[#17313d] uppercase tracking-wider">
                    Distribusi Shift & Cakupan Ruangan
                  </h3>
                  <p className="text-[11px] text-[#647783]">
                    Rincian pelaksanaan sesi checklist berdasarkan waktu kerja.
                  </p>
                </div>

                <div className="space-y-3">
                  {officers.map((off: any) => (
                    <div
                      key={off.id}
                      className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-[#17313d] font-bold text-sm">{off.fullName}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f5e9] text-[#157a55]">
                          Cakupan: {off.coveragePercentage || 0}% Ruangan
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1 border-t border-[#e2e8f0]">
                        <div className="bg-white p-1.5 rounded-lg border border-[#e2e8f0]">
                          <span className="text-[#647783] block text-[9px] uppercase font-bold">Pagi</span>
                          <strong className="text-[#0076a8]">{off.morningCount || 0}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-[#e2e8f0]">
                          <span className="text-[#647783] block text-[9px] uppercase font-bold">Siang</span>
                          <strong className="text-[#ca8a04]">{off.noonCount || 0}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-[#e2e8f0]">
                          <span className="text-[#647783] block text-[9px] uppercase font-bold">Sore</span>
                          <strong className="text-[#7c3aed]">{off.afternoonCount || 0}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            VIEW 3: KEPUASAN PENGGUNA (CSAT DEEP DIVE)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "EVALUATIONS" && (
          <div className="space-y-4 max-w-[1920px] mx-auto animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  RATA-RATA RATING CSAT
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#ca8a04] my-2 flex items-center gap-1">
                  ★ {metrics.averageRating || "0.0"}
                  <span className="text-sm font-semibold text-[#94a3b8]">/4.0</span>
                </strong>
                <span className="text-[11px] text-[#647783]">Skala kepuasan 4 bintang</span>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  TINGKAT KEPUASAN (CSAT)
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#157a55] my-2 block">
                  {metrics.satisfactionRate || 0}%
                </strong>
                <span className="text-[11px] text-[#647783]">Ulasan Puas & Sangat Puas</span>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  TOTAL ULASAN MASUK
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#0076a8] my-2 block">
                  {totalEvals}
                </strong>
                <span className="text-[11px] text-[#647783]">Responden anonim via QR</span>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-bold text-[#647783] block uppercase tracking-wider">
                  STANDAR MUTU 5S
                </span>
                <strong className="text-3xl sm:text-4xl font-black text-[#17313d] my-2 block">
                  {Number(metrics.averageRating || 0) >= 3.5 ? "Sangat Baik" : "Baik"}
                </strong>
                <span className="text-[11px] text-[#647783]">Kebersihan fasilitas PLN</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#e2e8f0]">
                  <h3 className="text-sm font-extrabold text-[#17313d] uppercase tracking-wider">
                    Distribusi Ulasan Berdasarkan Tingkat Kepuasan
                  </h3>
                  <p className="text-[11px] text-[#647783]">
                    Rincian persentase dan akumulasi suara pengunjung.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-[#157a55] flex items-center gap-1">
                        <span>★★★★</span> <span>Sangat Puas</span>
                      </span>
                      <span className="text-[#17313d] font-mono">{star4Count} ulasan ({star4Pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#157a55] rounded-full transition-all" style={{ width: `${star4Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-[#0076a8] flex items-center gap-1">
                        <span>★★★</span> <span>Puas</span>
                      </span>
                      <span className="text-[#17313d] font-mono">{star3Count} ulasan ({star3Pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0076a8] rounded-full transition-all" style={{ width: `${star3Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-[#d97706] flex items-center gap-1">
                        <span>★★</span> <span>Cukup</span>
                      </span>
                      <span className="text-[#17313d] font-mono">{star2Count} ulasan ({star2Pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#d97706] rounded-full transition-all" style={{ width: `${star2Pct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-[#dc2626] flex items-center gap-1">
                        <span>★</span> <span>Kurang</span>
                      </span>
                      <span className="text-[#17313d] font-mono">{star1Count} ulasan ({star1Pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#dc2626] rounded-full transition-all" style={{ width: `${star1Pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#e2e8f0]">
                  <h3 className="text-sm font-extrabold text-[#17313d] uppercase tracking-wider">
                    Informasi & Ketentuan Evaluasi Kepuasan
                  </h3>
                  <p className="text-[11px] text-[#647783]">
                    Pedoman transparansi feedback pelayanan kebersihan kantor PLN UPS.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-[#647783] leading-relaxed">
                  <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1">
                    <strong className="text-[#17313d] block font-bold">1. Evaluasi Anonim Terbuka</strong>
                    <p>Pengunjung dan pegawai dapat memindai QR Code di setiap ruangan tanpa perlu login akun untuk memberikan rating kebersihan objektif.</p>
                  </div>
                  <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1">
                    <strong className="text-[#17313d] block font-bold">2. Perlindungan Spam & Validasi Waktu</strong>
                    <p>Sistem membatasi evaluasi berkala per perangkat dan per ruangan untuk memastikan keabsahan data umpan balik.</p>
                  </div>
                  <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1">
                    <strong className="text-[#17313d] block font-bold">3. Tindak Lanjut Otomatis</strong>
                    <p>Setiap rating bintang 1 dan 2 akan langsung ditandai dalam ringkasan supervisor untuk dilakukan inspeksi ulang.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            VIEW 4: FULL ROOM MATRIX BOARD
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "ROOMS" && (
          <div className="space-y-4 max-w-[1920px] mx-auto animate-fadeIn">
            {/* Filter Ribbons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#d8e3ea] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#647783] font-bold uppercase tracking-wider">
                  Filter Ruangan:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRoomFilter("ALL")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "ALL"
                        ? "bg-[#0076a8] text-white"
                        : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    Semua ({roomSummaries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("FINDING")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "FINDING"
                        ? "bg-[#ca8a04] text-white"
                        : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    Ada Temuan ({roomSummaries.filter((r: any) => r.hasFindings).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("SPV")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "SPV"
                        ? "bg-[#7c3aed] text-white"
                        : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    Tunggu SPV ({summary.purpleCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomFilter("INCOMPLETE")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      roomFilter === "INCOMPLETE"
                        ? "bg-[#dc2626] text-white"
                        : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    Belum Lengkap ({summary.yellowCount + summary.redCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#647783]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#157a55]" /> Lengkap
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" /> Tunggu SPV
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Sebagian
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> Belum Ada
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
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] flex flex-col justify-between shadow-xs ${
                      isComplete
                        ? "bg-white border-emerald-300 hover:border-emerald-500"
                        : isWaitingSpv
                        ? "bg-white border-purple-300 hover:border-purple-500"
                        : isPartial
                        ? "bg-white border-amber-300 hover:border-amber-500"
                        : "bg-white border-[#d8e3ea] hover:border-slate-400"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-[#647783] uppercase">
                          {room.code}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isComplete
                              ? "bg-[#157a55]"
                              : isWaitingSpv
                              ? "bg-[#7c3aed] animate-pulse"
                              : isPartial
                              ? "bg-[#f59e0b]"
                              : "bg-[#f43f5e]"
                          }`}
                        />
                      </div>
                      <h4 className="text-xs font-black text-[#17313d] mt-1 line-clamp-1 group-hover:text-[#0076a8] transition-colors">
                        {room.name}
                      </h4>
                      <span className="text-[10px] text-[#647783] block">{room.roomTypeName}</span>
                    </div>

                    {/* Slot Chips */}
                    <div className="mt-3 pt-2 border-t border-[#f1f5f9] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#647783]">Progres Sesi</span>
                        <span className="font-mono font-bold text-[#17313d]">
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
                                  ? "bg-amber-100 text-[#b45309] border border-amber-300"
                                  : "bg-emerald-100 text-[#157a55] border border-emerald-300"
                                : "bg-[#f1f5f9] text-[#94a3b8]"
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
            VIEW 5: FULL EVIDENCE THEATER
        ════════════════════════════════════════════════════════════ */}
        {activeTab === "EVIDENCE" && (
          <div className="h-full flex flex-col justify-between max-w-5xl mx-auto animate-fadeIn py-2">
            {activePhoto ? (
              <div className="bg-white border border-[#d8e3ea] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                {/* Large Main Photo */}
                <div className="relative w-full md:w-3/5 h-80 md:h-[450px] bg-[#072d3f]/5 rounded-2xl overflow-hidden border border-[#d8e3ea] flex items-center justify-center">
                  <img
                    src={getPhotoUrl(activePhoto.fileUrl)}
                    alt={activePhoto.roomName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${
                        activePhoto.overallStatus === "ADA_TEMUAN"
                          ? "bg-[#eab308] text-white"
                          : "bg-[#157a55] text-white"
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
                      <span className="text-xs font-mono font-bold text-[#0076a8] tracking-wider">
                        EVIDENCE DETAIL #{photoIndex + 1}
                      </span>
                      <h2 className="text-2xl font-black text-[#17313d] mt-1">{activePhoto.roomName}</h2>
                      <span className="text-xs text-[#647783]">{activePhoto.roomCode}</span>
                    </div>

                    <div className="space-y-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#647783]">Petugas Pemeriksa:</span>
                        <strong className="text-[#0076a8]">{activePhoto.officerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#647783]">Sesi Checklist:</span>
                        <strong className="text-[#17313d]">{activePhoto.slotName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#647783]">Peran Sesi:</span>
                        <strong className="text-[#157a55]">{activePhoto.slotRole}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#647783]">Waktu Pengambilan:</span>
                        <strong className="text-[#17313d] font-mono">{activePhoto.displayTime}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#647783]">Storage Penyimpanan:</span>
                        <strong className="text-[#157a55]">QNAP NAS On-Premise</strong>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-3 pt-4 border-t border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex((i) => (i - 1 + latestPhotos.length) % latestPhotos.length)
                      }
                      className="flex-1 py-2.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Foto Sebelumnya
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => (i + 1) % latestPhotos.length)}
                      className="flex-1 py-2.5 rounded-xl bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      Foto Berikutnya <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-[#94a3b8]">Belum ada foto evidence tersimpan.</div>
            )}

            {/* Thumbnail selector */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-3 no-scrollbar">
              {latestPhotos.map((photo: any, idx: number) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    idx === photoIndex
                      ? "border-[#0076a8] ring-2 ring-[#0076a8]/40 scale-110"
                      : "border-[#d8e3ea] opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getPhotoUrl(photo.fileUrl)}
                    alt={`Thumb ${idx}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ────────────────── BOTTOM STATUS TICKER & SHORTCUTS ────────────────── */}
      <footer className="h-9 shrink-0 bg-white border-t border-[#d8e3ea] px-6 flex items-center justify-between text-[11px] text-[#647783] z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <span>Sistem Monitoring Kebersihan PLN Unit Pelaksana Transmisi</span>
          <span className="hidden md:inline text-[#d8e3ea]">|</span>
          <span className="hidden md:inline">Storage: QNAP NAS Engine Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[#94a3b8]">
            Pintasan: <kbd className="px-1.5 py-0.5 bg-[#f1f5f9] rounded text-[#17313d] font-mono border border-[#d8e3ea]">Spasi</kbd> Jeda ·{" "}
            <kbd className="px-1.5 py-0.5 bg-[#f1f5f9] rounded text-[#17313d] font-mono border border-[#d8e3ea]">F</kbd> Layar Penuh
          </span>
          <span className="text-[#0076a8] font-bold">Standar 5S Kebersihan BUMN</span>
        </div>
      </footer>

      {/* ────────────────── PHOTO MODAL (FULL RESOLUTION ZOOM) ────────────────── */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0076a8] text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-base">{selectedPhotoModal.roomName}</h3>
                <span className="text-xs text-white/80">
                  {selectedPhotoModal.slotName} ({selectedPhotoModal.slotRole}) • {selectedPhotoModal.displayTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full h-[500px] bg-slate-950 flex items-center justify-center">
              <img
                src={getPhotoUrl(selectedPhotoModal.fileUrl)}
                alt={selectedPhotoModal.roomName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="p-4 bg-white flex justify-between items-center text-xs text-[#647783]">
              <span>Petugas: <strong className="text-[#17313d]">{selectedPhotoModal.officerName}</strong></span>
              <span className={`px-2.5 py-1 rounded-md font-bold ${selectedPhotoModal.overallStatus === "ADA_TEMUAN" ? "bg-amber-100 text-[#b45309]" : "bg-emerald-100 text-[#157a55]"}`}>
                {selectedPhotoModal.overallStatus === "ADA_TEMUAN" ? "Ada Temuan" : "Bersih & Sesuai Standar"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ROOM DETAIL MODAL ────────────────── */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d8e3ea] rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-[#e2e8f0]">
              <div>
                <span className="text-xs font-mono font-bold text-[#0076a8] uppercase">
                  {selectedRoom.code}
                </span>
                <h3 className="text-lg font-black text-[#17313d] mt-0.5">{selectedRoom.name}</h3>
                <span className="text-xs text-[#647783]">{selectedRoom.roomTypeName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="w-8 h-8 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slots Detail List */}
            <div className="py-4 space-y-3 max-h-96 overflow-y-auto minimal-scrollbar">
              <span className="text-xs font-bold text-[#17313d] uppercase tracking-wider block">
                Rincian Sesi Checklist:
              </span>
              {selectedRoom.slots?.map((slot: any) => (
                <div
                  key={slot.id}
                  className={`p-3 rounded-xl border ${
                    slot.completed
                      ? slot.inspection?.overallStatus === "ADA_TEMUAN"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-emerald-50 border-emerald-200"
                      : "bg-[#f8fafc] border-[#e2e8f0]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-[#17313d]">{slot.name}</h4>
                      <span className="text-[10px] text-[#647783] block">{slot.role}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        slot.completed
                          ? slot.inspection?.overallStatus === "ADA_TEMUAN"
                            ? "bg-[#eab308] text-white"
                            : "bg-[#157a55] text-white"
                          : "bg-[#e2e8f0] text-[#647783]"
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
                    <div className="mt-2 pt-2 border-t border-black/5 space-y-2 text-[11px] text-[#647783]">
                      <div className="flex justify-between items-center">
                        <span>Pemeriksa: <strong className="text-[#17313d]">{slot.inspection.inspectorName}</strong></span>
                        <span className="font-mono text-[#647783]">{slot.inspection.displayTime}</span>
                      </div>

                      {slot.inspection.photos && slot.inspection.photos.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-bold text-[#647783] block mb-1.5">
                            Foto Bukti ({slot.inspection.photos.length}):
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {slot.inspection.photos.map((photo: any, pIdx: number) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() =>
                                  setSelectedPhotoModal({
                                    roomName: selectedRoom.name,
                                    slotName: slot.name,
                                    slotRole: slot.role,
                                    displayTime: slot.inspection.displayTime,
                                    fileUrl: photo.fileUrl,
                                    officerName: slot.inspection.inspectorName,
                                    overallStatus: slot.inspection.overallStatus,
                                  })
                                }
                                className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-[#d8e3ea] hover:border-[#0076a8] hover:shadow-md transition-all group/p"
                                title="Klik untuk memperbesar foto"
                              >
                                <img
                                  src={getPhotoUrl(photo.fileUrl)}
                                  alt={`Evidence ${pIdx + 1}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover/p:scale-105 transition-transform"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/p:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                                  Lihat
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#e2e8f0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 rounded-xl bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold transition-colors"
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
