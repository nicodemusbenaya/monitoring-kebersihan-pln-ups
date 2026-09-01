"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import {
  LayoutDashboard,
  Users,
  Building,
  QrCode,
  FileSpreadsheet,
  HardDrive,
  Tv,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Star,
  Download,
  Plus,
  Edit2,
  RefreshCw,
  Search,
  ShieldAlert,
  Loader2,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [nasStatus, setNasStatus] = useState<any>(null);
  const [nasTesting, setNasTesting] = useState(false);

  // Modals & form state
  const [searchRoom, setSearchRoom] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [evalQrImages, setEvalQrImages] = useState<Record<string, string>>({});

  // Room modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ code: "", name: "", roomTypeId: "", qrToken: "" });

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: "", fullName: "", role: "PETUGAS", password: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, perfRes, roomsRes, usersRes] = await Promise.all([
        fetch("/api/admin/dashboard").then((r) => r.json()),
        fetch("/api/admin/performance").then((r) => r.json()),
        fetch("/api/admin/rooms").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
      ]);

      if (dashRes.ok) setDashboardData(dashRes.data);
      if (perfRes.ok) setPerformanceData(perfRes.data);
      if (roomsRes.ok) {
        setRoomsData(roomsRes.data.rooms);
        setRoomTypes(roomsRes.data.roomTypes);
        // Generate QRs
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
      loadData();
    } catch (err) {
      alert("Gagal menyimpan ruangan");
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
      loadData();
    } catch (err) {
      alert("Gagal menyimpan pengguna");
    }
  };

  const filteredRooms = roomsData.filter(
    (r) =>
      r.name.toLowerCase().includes(searchRoom.toLowerCase()) ||
      r.code.toLowerCase().includes(searchRoom.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={26}
              height={34}
              priority
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Admin Kebersihan</h1>
              <p className="text-[10px] text-pln-yellow font-semibold uppercase tracking-wider">PLN UPS · Next.js</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1">
          {[
            { id: "dashboard", label: "Ringkasan Operasional", icon: LayoutDashboard },
            { id: "performance", label: "Performa Petugas", icon: Users },
            { id: "qr", label: "Cetak QR Ruangan", icon: QrCode },
            { id: "export", label: "Ekspor Excel", icon: FileSpreadsheet },
            { id: "rooms", label: "Kelola Ruangan", icon: Building },
            { id: "users", label: "Kelola Pengguna", icon: Users },
            { id: "nas", label: "Integrasi QNAP NAS", icon: HardDrive },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-pln-blue text-white shadow-md shadow-pln-blue/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TV Presentation Mode link */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <button
            onClick={() => window.open("/admin/presentation", "_blank")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-pln-yellow" />
              <span>Mode Display TV</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">16:9</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-pln-blue" />
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD RINGKASAN */}
            {activeTab === "dashboard" && dashboardData && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 font-medium">Total Ruangan</span>
                    <h3 className="text-2xl font-bold text-white mt-1">{dashboardData.metrics.totalRooms}</h3>
                    <span className="text-[11px] text-emerald-400 font-medium mt-1 block">Aktif Termonitor</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 font-medium">Pemeriksaan Hari Ini</span>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {dashboardData.metrics.inspectionsTodayCount}
                    </h3>
                    <span className="text-[11px] text-blue-400 font-medium mt-1 block">
                      {dashboardData.metrics.cleanCount} Bersih · {dashboardData.metrics.findingCount} Temuan
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 font-medium">Kepuasan Pengguna</span>
                    <h3 className="text-2xl font-bold text-pln-yellow mt-1 flex items-center gap-1.5">
                      <Star className="w-5 h-5 fill-pln-yellow text-pln-yellow" />
                      <span>{dashboardData.metrics.averageRating}</span>
                      <span className="text-xs text-slate-400 font-normal">/ 4.0</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                      {dashboardData.metrics.totalEvaluations} Ulasan Masuk
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 font-medium">Tingkat Kepuasan</span>
                    <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                      {dashboardData.metrics.satisfactionRate}%
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium mt-1 block">Rating Bintang 3 & 4</span>
                  </div>
                </div>

                {/* Attention Items if any */}
                {dashboardData.attentionItems && dashboardData.attentionItems.length > 0 && (
                  <div className="bg-amber-950/20 border border-amber-500/40 rounded-3xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <h2 className="text-sm font-bold text-amber-200">Perlu Perhatian (Ada Temuan Hari Ini)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dashboardData.attentionItems.map((item: any) => (
                        <div key={item.inspectionId} className="p-3.5 bg-slate-900/90 rounded-2xl border border-amber-500/30 text-xs">
                          <div className="flex justify-between font-bold text-white mb-1">
                            <span>{item.roomName}</span>
                            <span className="text-amber-400">{item.slotName}</span>
                          </div>
                          <p className="text-slate-400">Petugas: {item.officerName} · {item.dirtyCount} temuan</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Room Status Matrix */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Status Monitoring Ruangan Hari Ini</h2>
                      <p className="text-xs text-slate-400">Pemenuhan jadwal pemeriksaan seluruh ruangan aktif</p>
                    </div>
                    <button
                      onClick={loadData}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  {/* 4 Status Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <span className="text-slate-400">Merah: Belum ada sesi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-400">Kuning: Sesi petugas sebagian</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="text-slate-400">Ungu: Petugas selesai, tunggu SPV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-400">Hijau: Selesai lengkap (Petugas & SPV)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dashboardData.roomSummaries.map((r: any) => {
                      const isComplete = r.status === "COMPLETE";
                      const isWaitingSpv = r.status === "WAITING_SPV";
                      const isPartial = r.status === "PARTIAL";

                      return (
                        <div
                          key={r.id}
                          className={`p-3.5 rounded-2xl bg-slate-950 border flex items-center justify-between transition-all ${
                            isComplete
                              ? "border-emerald-500/30 bg-emerald-950/10"
                              : isWaitingSpv
                              ? "border-purple-500/40 bg-purple-950/20"
                              : isPartial
                              ? "border-amber-500/30 bg-amber-950/10"
                              : "border-slate-800"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{r.roomTypeName}</span>
                            <h4 className="text-xs font-bold text-white leading-tight">{r.name}</h4>
                            <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                              Slot: {r.completedSlots}/{r.totalSlots} (Petugas: {r.petugasFinished}/{r.petugasTotal}, SPV: {r.spvFinished}/{r.spvTotal})
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                              isComplete
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : isWaitingSpv
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : isPartial
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {isComplete
                              ? "Lengkap"
                              : isWaitingSpv
                              ? "Tunggu SPV"
                              : isPartial
                              ? "Sebagian"
                              : "Belum Ada"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PERFORMA PETUGAS */}
            {activeTab === "performance" && performanceData && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <h2 className="text-base font-bold text-white mb-1">Rekapitulasi Kinerja Petugas Kebersihan</h2>
                  <p className="text-xs text-slate-400 mb-6">Bulan: {performanceData.month}</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Nama Petugas</th>
                          <th className="px-4 py-3">Peran</th>
                          <th className="px-4 py-3 text-center">Pemeriksaan</th>
                          <th className="px-4 py-3 text-center">Bersih</th>
                          <th className="px-4 py-3 text-center">Temuan</th>
                          <th className="px-4 py-3 text-center">Coverage Ruangan</th>
                          <th className="px-4 py-3 text-right">Skor Kebersihan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {performanceData.officers.map((off: any) => (
                          <tr key={off.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-white">{off.fullName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-[10px] rounded-md font-medium">
                                {off.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{off.totalInspections}</td>
                            <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{off.cleanCount}</td>
                            <td className="px-4 py-3 text-center text-amber-400 font-semibold">{off.findingCount}</td>
                            <td className="px-4 py-3 text-center">{off.distinctRooms} Ruangan</td>
                            <td className="px-4 py-3 text-right font-bold text-pln-yellow">
                              {off.cleanPercentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QR RUANGAN */}
            {activeTab === "qr" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <div>
                      <h2 className="text-base font-bold text-white">Cetak QR Code Ruangan</h2>
                      <p className="text-xs text-slate-400">QR Code untuk Checklist Petugas & QR Evaluasi Pengguna</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchRoom}
                        onChange={(e) => setSearchRoom(e.target.value)}
                        placeholder="Cari ruangan..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRooms.map((room) => (
                      <div key={room.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                        <span className="text-[10px] text-pln-yellow uppercase font-bold px-2 py-0.5 rounded bg-pln-yellow/10 mb-1">
                          {room.roomType?.name}
                        </span>
                        <h3 className="text-sm font-bold text-white mb-2">{room.name}</h3>

                        {qrImages[room.id] ? (
                          <div className="p-2 bg-white rounded-xl shadow mb-3">
                            <img src={qrImages[room.id]} alt={room.name} className="w-32 h-32" />
                          </div>
                        ) : (
                          <div className="w-32 h-32 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                          </div>
                        )}

                        <div className="flex gap-2 w-full mt-auto">
                          <a
                            href={qrImages[room.id]}
                            download={`QR-PETUGAS-${room.code}.png`}
                            className="flex-1 py-2 px-2 bg-pln-blue hover:bg-pln-blue-dark text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>QR Petugas</span>
                          </a>
                          <a
                            href={evalQrImages[room.id]}
                            download={`QR-EVALUASI-${room.code}.png`}
                            className="flex-1 py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>QR Evaluasi</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EKSPOR EXCEL */}
            {activeTab === "export" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-xl">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Ekspor Rekap Bulanan Semua Ruangan</h2>
                <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
                  Unduh berkas Excel resmi format PLN UPS dengan matriks status 31 hari kalender untuk seluruh ruangan.
                </p>

                <a
                  href="/api/admin/export"
                  download
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Rekap Bulanan (.xlsx)</span>
                </a>
              </div>
            )}

            {/* TAB 5: KELOLA RUANGAN */}
            {activeTab === "rooms" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-base font-bold text-white">Kelola Ruangan</h2>
                      <p className="text-xs text-slate-400">Tambah atau sesuaikan daftar ruangan PLN UPS</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingRoom(null);
                        setRoomForm({ code: "", name: "", roomTypeId: roomTypes[0]?.id || "", qrToken: "" });
                        setShowRoomModal(true);
                      }}
                      className="py-2.5 px-4 bg-pln-blue hover:bg-pln-blue-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Ruangan</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Kode</th>
                          <th className="px-4 py-3">Nama Ruangan</th>
                          <th className="px-4 py-3">Tipe</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {roomsData.map((room) => (
                          <tr key={room.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-bold text-pln-yellow">{room.code}</td>
                            <td className="px-4 py-3 font-semibold text-white">{room.name}</td>
                            <td className="px-4 py-3">{room.roomType?.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${room.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                {room.active ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingRoom(room);
                                  setRoomForm({ code: room.code, name: room.name, roomTypeId: room.roomTypeId, qrToken: room.qrToken || "" });
                                  setShowRoomModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: KELOLA PENGGUNA */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-base font-bold text-white">Kelola Akun Pengguna</h2>
                      <p className="text-xs text-slate-400">Akun Petugas, Supervisor, dan Admin</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ username: "", fullName: "", role: "PETUGAS", password: "" });
                        setShowUserModal(true);
                      }}
                      className="py-2.5 px-4 bg-pln-blue hover:bg-pln-blue-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Pengguna</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Username</th>
                          <th className="px-4 py-3">Nama Lengkap</th>
                          <th className="px-4 py-3">Peran</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {usersData.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-bold text-white">{u.username}</td>
                            <td className="px-4 py-3">{u.fullName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold">
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                {u.active ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({ username: u.username, fullName: u.fullName, role: u.role, password: "" });
                                  setShowUserModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: INTEGRASI QNAP NAS */}
            {activeTab === "nas" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pln-blue/20 text-pln-blue rounded-2xl flex items-center justify-center">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Status QNAP NAS Gateway</h2>
                    <p className="text-xs text-slate-400">Penyimpanan mandiri evidence & snapshot</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Endpoint:</span>
                    <span className="text-white">http://nasups01.myqnapcloud.com:18080</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Container Port:</span>
                    <span className="text-white">18081 / 18080</span>
                  </div>
                </div>

                <button
                  onClick={handleTestNas}
                  disabled={nasTesting}
                  className="w-full py-3 px-4 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                >
                  {nasTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Tes Koneksi Gateway NAS</span>
                </button>

                {nasStatus && (
                  <div className={`p-4 rounded-2xl text-xs font-semibold ${nasStatus.ok ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
                    {nasStatus.ok ? "✓ Gateway NAS Terhubung & Siap Menerima File" : `⚠ ${nasStatus.message}`}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingRoom ? "Edit Ruangan" : "Tambah Ruangan"}
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Kode Ruangan</label>
                <input
                  type="text"
                  value={roomForm.code}
                  disabled={Boolean(editingRoom)}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  placeholder="Contoh: UPS, TOILET_01"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Ruangan</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Contoh: Ruang Senior Manager"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tipe Ruangan</label>
                <select
                  value={roomForm.roomTypeId}
                  onChange={(e) => setRoomForm({ ...roomForm, roomTypeId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Token QR Code (Opsional)</label>
                <input
                  type="text"
                  value={roomForm.qrToken || ""}
                  onChange={(e) => setRoomForm({ ...roomForm, qrToken: e.target.value })}
                  placeholder="Bisa gunakan token QR lama dari Spreadsheet (cth: ROOM-UPS-01)"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Jika ingin memakai stiker QR yang sudah tercetak di dinding, samakan token ini.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  value={userForm.username}
                  disabled={Boolean(editingUser)}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Contoh: arif"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Lengkap</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Contoh: Arif Budi Hartono"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Peran</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="PETUGAS">PETUGAS (Petugas Kebersihan)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Inspeksi & Pengawas)</option>
                  <option value="ADMIN">ADMIN (Administrator)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  {editingUser ? "Ganti Password (Kosongkan jika tidak diubah)" : "Password Awal"}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  required={!editingUser}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-xl"
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
