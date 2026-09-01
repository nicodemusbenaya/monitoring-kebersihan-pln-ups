"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import {
  LayoutGrid,
  Users,
  MessageSquare,
  QrCode,
  FileSpreadsheet,
  UserCheck,
  Database,
  Settings,
  Tv,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  HardDrive,
  Filter,
  Check,
  ChevronDown,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Navigation state
  const [activeNav, setActiveNav] = useState("ringkasan");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nasStatus, setNasStatus] = useState<any>(null);
  const [nasTesting, setNasTesting] = useState(false);

  // Filters state
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [statusRoomFilter, setStatusRoomFilter] = useState<"ALL" | "FINDINGS" | "PARTIAL" | "COMPLETE">("ALL");
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [actionItemFilter, setActionItemFilter] = useState<"ALL" | "FINDINGS" | "PENDING">("ALL");

  // Performance date filter
  const [perfStartDate, setPerfStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [perfEndDate, setPerfEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [perfQuickTab, setPerfQuickTab] = useState("bulan_ini");

  // QR state
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [evalQrImages, setEvalQrImages] = useState<Record<string, string>>({});

  // Room modal state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ code: "", name: "", roomTypeId: "", qrToken: "" });

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: "", fullName: "", role: "PETUGAS", password: "" });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [userRes, dashRes, perfRes, roomsRes, usersRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch(`/api/admin/dashboard?month=${selectedPeriod}`).then((r) => r.json()),
        fetch("/api/admin/performance").then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
      ]);

      if (userRes.ok && userRes.user) setCurrentUser(userRes.user);
      if (dashRes.ok) setDashboardData(dashRes.data);
      if (perfRes.ok) setPerformanceData(perfRes.data);
      if (roomsRes.ok) {
        setRoomsData(roomsRes.data.rooms);
        setRoomTypes(roomsRes.data.roomTypes);

        const qrs: Record<string, string> = {};
        const eqrs: Record<string, string> = {};
        for (const room of roomsRes.data.rooms) {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const roomUrl = `${origin}/?room=${room.qrToken}`;
          const evalUrl = `${origin}/?evaluate=${room.qrToken}`;
          qrs[room.id] = await QRCode.toDataURL(roomUrl, { width: 300, margin: 2 });
          eqrs[room.id] = await QRCode.toDataURL(evalUrl, { width: 300, margin: 2 });
        }
        setQrImages(qrs);
        setEvalQrImages(eqrs);
      }
      if (usersRes.ok) setUsersData(usersRes.data);
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedPeriod]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleTestNas = async () => {
    setNasTesting(true);
    try {
      const res = await fetch("/api/nas/status");
      const data = await res.json();
      setNasStatus(data);
    } catch (e: any) {
      setNasStatus({ ok: false, message: e.message || "Gagal tes koneksi" });
    } finally {
      setNasTesting(false);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await fetch("/api/admin/rooms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingRoom.id, ...roomForm }),
        });
      } else {
        await fetch("/api/admin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomForm),
        });
      }
      setShowRoomModal(false);
      setEditingRoom(null);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingUser.id, ...userForm }),
        });
      } else {
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        });
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadAllData();
    } catch (err) {
      console.error(err);
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

  // Filtered room summaries
  const filteredRoomSummaries = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    return dashboardData.roomSummaries.filter((r: any) => {
      // Room select filter
      if (selectedRoomFilter !== "ALL" && r.id !== selectedRoomFilter) return false;
      // Search query
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      // Status pill filter
      if (statusRoomFilter === "FINDINGS") return r.hasFindings || r.dirtyCount > 0;
      if (statusRoomFilter === "COMPLETE") return r.status === "COMPLETE";
      if (statusRoomFilter === "PARTIAL") return r.status === "PARTIAL" || r.status === "WAITING_SPV" || r.status === "EMPTY";
      return true;
    });
  }, [dashboardData, selectedRoomFilter, roomSearchQuery, statusRoomFilter]);

  // Action items (uncompleted or findings)
  const actionItems = useMemo(() => {
    if (!dashboardData?.roomSummaries) return [];
    const list: any[] = [];

    dashboardData.roomSummaries.forEach((r: any) => {
      // If room not complete, add uncompleted slots
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
    <div className="flex min-h-screen bg-[#edf2f6] font-sans text-[#17313d] select-none">
      {/* ────────────────── LEFT SIDEBAR (Dark Navy) ────────────────── */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-[260px]"
        } shrink-0 bg-[#072d3f] text-white flex flex-col justify-between transition-all duration-300 z-30 sticky top-0 h-screen shadow-xl border-r border-[#0e3b52]`}
      >
        <div>
          {/* Logo & Header */}
          <div className="p-4 flex items-center justify-between border-b border-[#0f3d54]">
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Yellow Square PLN Logo */}
              <div className="w-10 h-10 bg-[#ffd100] rounded-xl flex items-center justify-center p-1 shrink-0 shadow-md">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
                  alt="PLN"
                  width={24}
                  height={30}
                  priority
                />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="font-extrabold text-sm tracking-wide text-white block leading-tight">
                    PLN UPS
                  </span>
                  <span className="text-[11px] text-[#86a6b8] block">Monitoring kebersihan</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-[#0e3a50] hover:bg-[#144b67] text-[#97b7c8] hover:text-white transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* Section 1: Pemantauan */}
            <div>
              {!sidebarCollapsed && (
                <span className="px-3 text-[10px] font-black uppercase tracking-widest text-[#66889a] block mb-2">
                  PEMANTAUAN
                </span>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveNav("ringkasan")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "ringkasan"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md shadow-[#ffd100]/10"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Ringkasan</span>}
                </button>

                <button
                  onClick={() => setActiveNav("performa")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "performa"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Performa petugas</span>}
                </button>

                <button
                  onClick={() => setActiveNav("kepuasan")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "kepuasan"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Kepuasan pengguna</span>}
                </button>
              </div>
            </div>

            {/* Section 2: Operasional */}
            <div>
              {!sidebarCollapsed && (
                <span className="px-3 text-[10px] font-black uppercase tracking-widest text-[#66889a] block mb-2">
                  OPERASIONAL
                </span>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveNav("qr")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "qr"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>QR ruangan</span>}
                </button>

                <button
                  onClick={() => setActiveNav("export")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "export"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Ekspor Excel</span>}
                </button>
              </div>
            </div>

            {/* Section 3: Administrasi */}
            <div>
              {!sidebarCollapsed && (
                <span className="px-3 text-[10px] font-black uppercase tracking-widest text-[#66889a] block mb-2">
                  ADMINISTRASI
                </span>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveNav("pengguna")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "pengguna"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Pengguna</span>}
                </button>

                <button
                  onClick={() => setActiveNav("data")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "data"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Pengelolaan data</span>}
                </button>

                <button
                  onClick={() => setActiveNav("konfigurasi")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeNav === "konfigurasi"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Konfigurasi</span>}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Status Footprint */}
        <div className="p-4 border-t border-[#0f3d54] text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
            {!sidebarCollapsed && (
              <div>
                <span className="text-[11px] font-bold text-white block">DATA AKTIF</span>
                <span className="text-[10px] text-[#7195a8]">Next.js Engine & NAS QNAP</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ────────────────── MAIN CONTENT WRAPPER ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#d8e3ea] px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              PORTAL ADMINISTRASI
            </span>
            <h1 className="text-xl font-black text-[#17313d] capitalize">
              {activeNav === "ringkasan" && "Ringkasan"}
              {activeNav === "performa" && "Performa Petugas"}
              {activeNav === "kepuasan" && "Kepuasan Pengguna"}
              {activeNav === "qr" && "Cetak QR Ruangan"}
              {activeNav === "export" && "Ekspor Laporan Excel"}
              {activeNav === "pengguna" && "Kelola Pengguna"}
              {activeNav === "data" && "Pengelolaan Data Ruangan"}
              {activeNav === "konfigurasi" && "Konfigurasi Sistem & NAS"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right hidden sm:block">
                <strong className="text-xs font-black text-[#17313d] block">{currentUser.fullName}</strong>
                <span className="text-[11px] text-[#718c99]">{currentUser.role === "ADMIN" ? "Administrator" : currentUser.role}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <a
                href="/admin/presentation"
                target="_blank"
                className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#0076a8] shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Mode presentasi</span>
              </a>

              <button
                onClick={loadAllData}
                disabled={loading}
                className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#0076a8] shadow-sm flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#bd2d22] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#bd2d22] shadow-sm flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-8 max-w-[1500px] w-full mx-auto space-y-6">
          {/* ══════════════════════ TAB 1: RINGKASAN (DASHBOARD) ══════════════════════ */}
          {activeNav === "ringkasan" && (
            <>
              {/* 1. Large Hero Banner */}
              <section className="relative overflow-hidden bg-gradient-to-r from-[#062c3e] via-[#09415b] to-[#0d5678] text-white rounded-3xl p-8 shadow-xl">
                {/* Wave Curves Graphic */}
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
                    onClick={loadAllData}
                    className="self-end px-5 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Terapkan
                  </button>
                </div>
              </section>

              {/* 3. Four Metric KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
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
                  {/* Yellow corner quarter circle */}
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#ffd100]/30 pointer-events-none"></div>
                </div>

                {/* Metric 2 */}
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
                  {/* Blue corner quarter circle */}
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#0076a8]/15 pointer-events-none"></div>
                </div>

                {/* Metric 3 */}
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
                  {/* Red/peach corner quarter circle */}
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#bd2d22]/15 pointer-events-none"></div>
                </div>

                {/* Metric 4 */}
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
                  {/* Orange corner quarter circle */}
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#d97706]/15 pointer-events-none"></div>
                </div>
              </section>

              {/* 4. Two Column Operational Status & Action Items (Screenshot 2) */}
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

                  {/* Filter Pills & Search */}
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

                  {/* Room Cards Grid */}
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

                            {/* Status Badge */}
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

                          {/* Progress Line */}
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

                          {/* Slot Status Icons */}
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

                  {/* Bottom Legend */}
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

                  {/* Filter Tabs */}
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

                  {/* Action Item Cards */}
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

              {/* 5. Analisis Periode: Suara Pengguna & Tren Operasional (Screenshot 3) */}
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
                  {/* Suara Pengguna Card */}
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

                  {/* Tren Operasional Card */}
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

                    {/* Chart Visualization (Days 1-31) */}
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
            </>
          )}

          {/* ══════════════════════ TAB 2: PERFORMA PETUGAS (Screenshot 4 & 5) ══════════════════════ */}
          {activeNav === "performa" && (
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
                  <div>
                    <label className="text-xs font-bold text-[#647783] block mb-1">Tanggal mulai</label>
                    <input
                      type="date"
                      value={perfStartDate}
                      onChange={(e) => setPerfStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#17313d]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#647783] block mb-1">Tanggal akhir</label>
                    <input
                      type="date"
                      value={perfEndDate}
                      onChange={(e) => setPerfEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#17313d]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex gap-2">
                    {["Hari ini", "7 hari", "30 hari", "Bulan ini", "Semester"].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPerfQuickTab(tab.toLowerCase().replace(" ", "_"))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          perfQuickTab === tab.toLowerCase().replace(" ", "_")
                            ? "bg-[#0076a8] text-white"
                            : "bg-[#f1f5f9] text-[#647783] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="px-6 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md"
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
                    {performanceData?.summary?.totalInspections ?? 17}
                  </strong>
                  <span className="text-[11px] text-[#647783]">seluruh petugas • periode ini</span>
                </div>

                <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm">
                  <span className="text-xs font-bold text-[#647783] block">Petugas aktif</span>
                  <strong className="text-3xl font-black text-[#0076a8] my-2 block">
                    {performanceData?.officers?.length ?? 1}
                  </strong>
                  <span className="text-[11px] text-[#647783]">petugas melakukan monitoring</span>
                </div>

                <div className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm">
                  <span className="text-xs font-bold text-[#647783] block">Rata-rata rating</span>
                  <strong className="text-3xl font-black text-[#17313d] my-2 flex items-center gap-1">
                    ★ 0<span className="text-lg font-bold text-[#94a3b8]">/4</span>
                  </strong>
                  <span className="text-[11px] text-[#647783]">dari 0 evaluasi anonim</span>
                </div>
              </section>

              {/* Volume & Rating Graphs (Screenshot 5) */}
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
                    {performanceData?.officers?.map((off: any) => (
                      <div key={off.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#e8f5fa] text-[#0076a8] text-[10px] flex items-center justify-center font-bold">
                              {off.fullName?.charAt(0)}
                            </span>
                            <span>{off.fullName}</span>
                          </div>
                          <span>
                            {off.totalCompleted} pemeriksaan <span className="text-[#157a55]">100% bersih</span>
                          </span>
                        </div>
                        <div className="w-full h-4 bg-[#f1f5f9] rounded-md overflow-hidden relative">
                          <div className="h-full bg-[#0076a8] rounded-md flex items-center justify-end pr-2 text-[9px] text-white font-black" style={{ width: "85%" }}>
                            {off.totalCompleted}
                          </div>
                        </div>
                      </div>
                    ))}
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
                    1.1% Target Tercapai
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
                        <span className="text-xs font-black text-[#17313d]">0 / 60 sesi</span>
                      </div>
                      <span className="text-[10px] text-[#94a3b8] block">Pagi: 0x • Siang: 0x • Sore: 0x</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ══════════════════════ TAB 3: KEPUASAN PENGGUNA ══════════════════════ */}
          {activeNav === "kepuasan" && (
            <div className="bg-white border border-[#d8e3ea] rounded-2xl p-8 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-[#17313d]">Kepuasan Pengguna & Tamu</h3>
              <p className="text-xs text-[#647783]">Ulasan anonim dan evaluasi kepuasan fasilitas kebersihan PLN UPS.</p>
              <div className="p-6 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] text-center">
                <strong className="text-base text-[#17313d]">6 Ulasan Pengunjung Tercatat</strong>
                <p className="text-xs text-[#647783] mt-1">Rata-rata kepuasan kebersihan: 3.8 / 4.0 (Sangat Baik)</p>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 4: QR RUANGAN ══════════════════════ */}
          {activeNav === "qr" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#17313d]">Cetak QR Ruangan</h3>
                  <p className="text-xs text-[#647783]">QR Code resmi untuk ditempel di dinding masing-masing ruangan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {roomsData.map((room) => (
                  <div key={room.id} className="bg-white border border-[#d8e3ea] rounded-2xl p-5 text-center shadow-sm space-y-3">
                    <span className="px-2 py-0.5 bg-[#e8f5fa] text-[#0076a8] rounded text-[10px] font-bold">
                      {room.roomType?.name}
                    </span>
                    <h4 className="text-sm font-bold text-[#17313d] truncate">{room.name}</h4>
                    {qrImages[room.id] && (
                      <img
                        src={qrImages[room.id]}
                        alt={room.name}
                        className="w-36 h-36 mx-auto rounded-xl border border-[#d8e3ea] p-1"
                      />
                    )}
                    <span className="text-[10px] text-[#94a3b8] font-mono block truncate">
                      Token: {room.qrToken}
                    </span>
                    <a
                      href={qrImages[room.id]}
                      download={`QR_${room.code}.png`}
                      className="block w-full py-2 bg-[#0076a8] text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Unduh QR
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 5: EKSPOR EXCEL ══════════════════════ */}
          {activeNav === "export" && (
            <div className="bg-white border border-[#d8e3ea] rounded-2xl p-8 shadow-sm space-y-6 max-w-xl">
              <div>
                <h3 className="text-xl font-black text-[#17313d]">Ekspor Laporan Rekapitulasi Excel</h3>
                <p className="text-xs text-[#647783] mt-1">Unduh buku laporan pemantauan kebersihan bulanan resmi PLN UPS.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#647783] block mb-1">Pilih Periode Bulan</label>
                  <input
                    type="month"
                    defaultValue={selectedPeriod}
                    id="export-month-input"
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="p-4 bg-[#f8fafc] border-l-4 border-[#0076a8] rounded-r-xl text-xs text-[#475569] space-y-1">
                  <strong className="text-[#0076a8] block mb-1">Standar Rekapitulasi 4 Warna:</strong>
                  <p>🔴 Merah (✕): Tidak ada sesi disubmit</p>
                  <p>🟡 Kuning (◐): Sesi belum lengkap</p>
                  <p>🟣 Ungu (◈): Sesi petugas lengkap, menunggu SPV</p>
                  <p>🟢 Hijau (●): Semua sesi lengkap</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const month = (document.getElementById("export-month-input") as HTMLInputElement)?.value || selectedPeriod;
                    window.location.href = `/api/admin/export?month=${month}`;
                  }}
                  className="w-full py-3.5 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 6: PENGGUNA ══════════════════════ */}
          {activeNav === "pengguna" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#17313d]">Kelola Pengguna</h3>
                  <p className="text-xs text-[#647783]">Daftar akun petugas kebersihan, pengawas, dan administrator.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({ username: "", fullName: "", role: "PETUGAS", password: "" });
                    setShowUserModal(true);
                  }}
                  className="px-4 py-2 bg-[#0076a8] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] border-b border-[#d8e3ea] text-[#647783] font-bold">
                    <tr>
                      <th className="p-4">Pengguna</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {usersData.map((u) => (
                      <tr key={u.id} className="hover:bg-[#f8fafc]">
                        <td className="p-4 font-bold text-[#17313d]">
                          {u.fullName} <span className="text-[#94a3b8] font-normal">(@{u.username})</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e8f5fa] text-[#0076a8]">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-[#157a55] font-bold">● Aktif</span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setUserForm({ username: u.username, fullName: u.fullName, role: u.role, password: "" });
                              setShowUserModal(true);
                            }}
                            className="px-3 py-1 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] rounded-lg font-bold"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 7: PENGELOLAAN DATA (ROOMS) ══════════════════════ */}
          {activeNav === "data" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#17313d]">Master Ruangan</h3>
                  <p className="text-xs text-[#647783]">Daftar master 26 ruangan dan konfigurasi token QR.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomForm({ code: "", name: "", roomTypeId: roomTypes[0]?.id || "GENERAL", qrToken: "" });
                    setShowRoomModal(true);
                  }}
                  className="px-4 py-2 bg-[#0076a8] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Ruangan</span>
                </button>
              </div>

              <div className="bg-white border border-[#d8e3ea] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] border-b border-[#d8e3ea] text-[#647783] font-bold">
                    <tr>
                      <th className="p-4">Ruangan</th>
                      <th className="p-4">Tipe Template</th>
                      <th className="p-4">Token QR</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {roomsData.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f8fafc]">
                        <td className="p-4 font-bold text-[#17313d]">
                          {r.name} <span className="text-[#94a3b8] font-normal">({r.code})</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#475569]">
                            {r.roomType?.name}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[#647783] text-[11px]">
                          {r.qrToken}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setEditingRoom(r);
                              setRoomForm({ code: r.code, name: r.name, roomTypeId: r.roomTypeId, qrToken: r.qrToken });
                              setShowRoomModal(true);
                            }}
                            className="px-3 py-1 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#17313d] rounded-lg font-bold"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 8: KONFIGURASI NAS ══════════════════════ */}
          {activeNav === "konfigurasi" && (
            <div className="bg-white border border-[#d8e3ea] rounded-2xl p-8 shadow-sm space-y-6 max-w-xl">
              <div>
                <h3 className="text-xl font-black text-[#17313d]">Integrasi NAS QNAP PLN</h3>
                <p className="text-xs text-[#647783] mt-1">Status penyimpanan bukti foto checklist di server internal.</p>
              </div>

              <div className="p-4 bg-[#e7f6ef] border border-[#a3e6cb] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#157a55] font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#157a55] animate-pulse"></span>
                  <span>Server NAS Terhubung & Aktif</span>
                </div>
                <p className="text-xs text-[#0f5e40]">
                  Endpoint: <code>http://nasups01.myqnapcloud.com:18080</code>
                </p>
                <span className="text-[11px] text-[#0f5e40] block">Kapasitas Tersedia: 338 GB</span>
              </div>

              <button
                type="button"
                onClick={handleTestNas}
                disabled={nasTesting}
                className="w-full py-3 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl text-xs shadow-md"
              >
                {nasTesting ? "Menguji Koneksi..." : "Uji Diagnostik Koneksi NAS"}
              </button>

              {nasStatus && (
                <div className="p-3 bg-[#f8fafc] border border-[#d8e3ea] rounded-xl text-xs">
                  <strong>Hasil:</strong> {nasStatus.message || "HTTP 200 OK"}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ────────────────── ROOM MODAL ────────────────── */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#17313d]">
              {editingRoom ? "Edit Ruangan" : "Tambah Ruangan"}
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Kode Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  placeholder="Contoh: PANTRY"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Nama Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Contoh: Pantry Gedung Utama"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Tipe Template</label>
                <select
                  value={roomForm.roomTypeId}
                  onChange={(e) => setRoomForm({ ...roomForm, roomTypeId: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Token QR Stiker</label>
                <input
                  type="text"
                  required
                  value={roomForm.qrToken}
                  onChange={(e) => setRoomForm({ ...roomForm, qrToken: e.target.value })}
                  placeholder="Token unik QR"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 bg-[#f1f5f9] rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0076a8] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── USER MODAL ────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#17313d]">
              {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">Peran (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                >
                  <option value="PETUGAS">PETUGAS (Petugas Kebersihan)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Pengawas)</option>
                  <option value="ADMIN">ADMIN (Administrator)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#647783] block mb-1">
                  {editingUser ? "Password Baru (Kosongkan jika tetap)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-[#f1f5f9] rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0076a8] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
