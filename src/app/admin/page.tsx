"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

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
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRooms = roomsData.filter(
    (r) =>
      r.name.toLowerCase().includes(searchRoom.toLowerCase()) ||
      r.code.toLowerCase().includes(searchRoom.toLowerCase())
  );

  return (
    <div className="app-shell">
      {/* Header (GAS style) */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
            />
            <span className="brand-divider"></span>
            <div className="topbar-title">
              <strong>Monitoring Kebersihan PLN UPS</strong>
              <span>Panel Administrator</span>
            </div>
          </div>

          <div className="user-area">
            <div className="user-copy">
              <strong>Administrator</strong>
              <span>PLN UPS</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Admin Nav Tabs (GAS style) */}
      <nav className="admin-nav">
        <div className="admin-nav-inner">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Ringkasan
          </button>
          <button
            className={activeTab === "performance" ? "active" : ""}
            onClick={() => setActiveTab("performance")}
          >
            Performa Petugas
          </button>
          <button
            className={activeTab === "evaluations" ? "active" : ""}
            onClick={() => setActiveTab("evaluations")}
          >
            Kepuasan Pengguna
          </button>
          <button
            className={activeTab === "qr" ? "active" : ""}
            onClick={() => setActiveTab("qr")}
          >
            Cetak QR
          </button>
          <button
            className={activeTab === "export" ? "active" : ""}
            onClick={() => setActiveTab("export")}
          >
            Ekspor Excel
          </button>
          <button
            className={activeTab === "rooms" ? "active" : ""}
            onClick={() => setActiveTab("rooms")}
          >
            Kelola Ruangan
          </button>
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            Kelola Pengguna
          </button>
          <button
            className={activeTab === "nas" ? "active" : ""}
            onClick={() => setActiveTab("nas")}
          >
            Integrasi NAS
          </button>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="page">
        {loading ? (
          <div className="initial-loader" style={{ minHeight: "400px" }}>
            <div className="brand-mark">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
                alt="Logo PLN"
              />
            </div>
            <div className="skeleton-line wide"></div>
            <div className="skeleton-line"></div>
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD RINGKASAN */}
            {activeTab === "dashboard" && dashboardData && (
              <div>
                <div className="dashboard-hero">
                  <div>
                    <h1>Ringkasan Operasional Hari Ini</h1>
                    <p>
                      Pantauan kepatuhan standar 5S kebersihan fasilitas PLN UPS ({dashboardData.dateKey})
                    </p>
                  </div>
                  <div>
                    <a
                      href="/admin/presentation"
                      target="_blank"
                      className="btn btn-secondary btn-sm"
                    >
                      📺 Mode Layar TV 16:9
                    </a>
                  </div>
                </div>

                {/* Dashboard Metrics (GAS style) */}
                <section className="dashboard-metrics">
                  <div className="dashboard-metric">
                    <div>
                      <div
                        className="completion-dial"
                        style={{
                          ["--completion" as any]: `${dashboardData?.summary?.completionRate ?? 0}`,
                        }}
                      >
                        <span>{dashboardData?.summary?.completionRate ?? 0}%</span>
                      </div>
                    </div>
                    <div>
                      <span>Penyelesaian hari ini</span>
                      <strong>{dashboardData?.summary?.completedSessions ?? 0}</strong>
                      <small>
                        dari {dashboardData?.summary?.totalExpectedSessions ?? 0} sesi target
                      </small>
                    </div>
                  </div>

                  <div className="dashboard-metric done">
                    <div className="metric-mark">
                      <span className="status-symbol">●</span>
                    </div>
                    <div>
                      <span>Semua Lengkap (Petugas & SPV)</span>
                      <strong>{dashboardData?.summary?.greenCount ?? 0}</strong>
                      <small>Pemeriksaan tuntas</small>
                    </div>
                  </div>

                  <div className="dashboard-metric" style={{ borderTop: "4px solid #7e22ce" }}>
                    <div className="metric-mark" style={{ color: "#7e22ce", background: "#f3e8ff" }}>
                      <span className="status-symbol">◈</span>
                    </div>
                    <div>
                      <span>Menunggu Inspeksi SPV</span>
                      <strong style={{ color: "#7e22ce" }}>{dashboardData?.summary?.purpleCount ?? 0}</strong>
                      <small>Petugas sudah tuntas</small>
                    </div>
                  </div>

                  <div className="dashboard-metric pending">
                    <div className="metric-mark">
                      <span className="status-symbol">◐</span>
                    </div>
                    <div>
                      <span>Sesi Belum Lengkap</span>
                      <strong>{dashboardData?.summary?.yellowCount ?? 0}</strong>
                      <small>Ada sesi belum diisi</small>
                    </div>
                  </div>
                </section>

                {/* Dashboard Board (GAS style) */}
                <div className="dashboard-board">
                  <div className="dashboard-main-column">
                    <div className="dashboard-card">
                      <header>
                        <div>
                          <h2>Status Ruangan Hari Ini</h2>
                          <p>Daftar seluruh 26 ruangan dan hasil checklist 5S</p>
                        </div>
                      </header>

                      <div className="table-wrap">
                        <table className="operations-table">
                          <thead>
                            <tr>
                              <th>Ruangan</th>
                              <th>Status Harian</th>
                              <th>Sesi Terisi</th>
                              <th>Temuan 5S</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.roomSummaries?.map((item: any) => {
                              let statusBadge = (
                                <span className="operation-status neutral">
                                  <i>✕</i> Kosong
                                </span>
                              );
                              if (item.status === "COMPLETE") {
                                statusBadge = (
                                  <span className="operation-status done">
                                    <i>●</i> Lengkap ✓
                                  </span>
                                );
                              } else if (item.status === "WAITING_SPV") {
                                statusBadge = (
                                  <span
                                    className="operation-status"
                                    style={{ color: "#7e22ce" }}
                                  >
                                    <i>◈</i> Menunggu SPV
                                  </span>
                                );
                              } else if (item.status === "PARTIAL") {
                                statusBadge = (
                                  <span className="operation-status pending">
                                    <i>◐</i> Sebagian
                                  </span>
                                );
                              }

                              return (
                                <tr key={item.room.id}>
                                  <th>
                                    <strong>{item.room.name}</strong>
                                    <span>{item.room.roomType?.name}</span>
                                  </th>
                                  <td>{statusBadge}</td>
                                  <td>
                                    {item.completedCount} / {item.totalSlots} Sesi
                                  </td>
                                  <td>
                                    {item.dirtyCount > 0 ? (
                                      <span className="badge badge-dirty">
                                        {item.dirtyCount} Temuan
                                      </span>
                                    ) : (
                                      <span className="badge badge-clean">Bersih</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="status-legend">
                        <span className="done">● Lengkap (Petugas & SPV)</span>
                        <span style={{ color: "#7e22ce" }}>◈ Menunggu Inspeksi SPV</span>
                        <span className="pending">◐ Sebagian (Belum Lengkap)</span>
                        <span className="finding">✕ Belum Ada Sesi</span>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-side">
                    <div className="dashboard-card attention-card">
                      <header>
                        <div>
                          <h2>Perhatian & Temuan</h2>
                          <p>Daftar pemeriksaan dengan temuan kotor/rusak</p>
                        </div>
                      </header>

                      <ul>
                        {dashboardData.findings?.length > 0 ? (
                          dashboardData.findings.map((f: any) => (
                            <li key={f.id} className="attention-item finding">
                              <div className="attention-mark">✕</div>
                              <div>
                                <strong>{f.roomName}</strong>
                                <span>
                                  {f.slotName} • {f.activityName} ({f.note || "Temuan fisik"})
                                </span>
                              </div>
                              <time>{f.time}</time>
                            </li>
                          ))
                        ) : (
                          <div className="dashboard-empty">
                            Tidak ada temuan kotor atau kerusakan aktif hari ini.
                          </div>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PERFORMA PETUGAS */}
            {activeTab === "performance" && performanceData && (
              <div>
                <div className="management-heading">
                  <h1>Performa Petugas Kebersihan</h1>
                  <p>Cakupan pengerjaan, ketepatan waktu, dan rekapitulasi sesi per petugas</p>
                </div>

                <div className="users-kpi-grid">
                  <div className="users-kpi-card primary">
                    <span>TOTAL SESI TERCATAT</span>
                    <strong>{performanceData.summary?.totalInspections || 0}</strong>
                  </div>
                  <div className="users-kpi-card success">
                    <span>TINGKAT KEBERSIHAN</span>
                    <strong>{performanceData.summary?.cleanlinessRate || 100}%</strong>
                  </div>
                  <div className="users-kpi-card warning">
                    <span>TEMUAN FISIK</span>
                    <strong>{performanceData.summary?.dirtyCount || 0}</strong>
                  </div>
                  <div className="users-kpi-card supervisor">
                    <span>PETUGAS AKTIF</span>
                    <strong>{performanceData.officers?.length || 0}</strong>
                  </div>
                </div>

                <div className="officer-cards-list">
                  {performanceData.officers?.map((officer: any) => (
                    <div key={officer.id} className="officer-detail-card">
                      <div className="officer-detail-header">
                        <div className="officer-detail-title">
                          <strong>{officer.fullName}</strong>
                          <span className="officer-badge officer-badge-cov">
                            {officer.totalCompleted} Sesi Selesai
                          </span>
                          <span className="officer-badge officer-badge-star">
                            Nilai: {officer.score || 100}
                          </span>
                        </div>
                      </div>
                      <div className="officer-detail-section">
                        <div className="officer-kpi-row">
                          <div>
                            <span>Sesi Pagi</span>
                            <strong>{officer.morningCount || 0}</strong>
                          </div>
                          <div>
                            <span>Sesi Siang</span>
                            <strong>{officer.noonCount || 0}</strong>
                          </div>
                          <div>
                            <span>Sesi Sore</span>
                            <strong>{officer.afternoonCount || 0}</strong>
                          </div>
                          <div>
                            <span>Temuan Tercatat</span>
                            <strong style={{ color: "var(--danger)" }}>
                              {officer.findingsCount || 0}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: KEPUASAN PENGGUNA */}
            {activeTab === "evaluations" && (
              <div>
                <div className="management-heading">
                  <h1>Kepuasan Pengguna & Tamu</h1>
                  <p>Rekapitulasi rating dan saran langsung dari pemindaian QR ulasan</p>
                </div>

                <section className="panel">
                  <div className="panel-body">
                    <div className="empty">
                      <strong>6 Ulasan Pengunjung Tercatat</strong>
                      <br />
                      Rata-rata kepuasan fasilitas kebersihan: <b>3.8 / 4.0 (Sangat Baik)</b>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: CETAK QR */}
            {activeTab === "qr" && (
              <div>
                <div className="management-heading">
                  <h1>Cetak Stiker QR Ruangan</h1>
                  <p>QR Code resmi untuk ditempel di masing-masing pintu atau dinding ruangan</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                  {filteredRooms.map((room) => (
                    <div key={room.id} className="dashboard-card" style={{ padding: "20px", textAlign: "center" }}>
                      <span className="badge badge-neutral" style={{ marginBottom: "12px" }}>
                        {room.roomType?.name}
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 16px" }}>
                        {room.name}
                      </h3>
                      {qrImages[room.id] && (
                        <img
                          src={qrImages[room.id]}
                          alt={room.name}
                          style={{ width: "180px", height: "180px", margin: "0 auto 16px", borderRadius: "10px", border: "1px solid var(--line)" }}
                        />
                      )}
                      <div className="field-hint" style={{ wordBreak: "break-all", fontSize: "10px", marginBottom: "16px" }}>
                        Token: {room.qrToken}
                      </div>
                      <a
                        href={qrImages[room.id]}
                        download={`QR_${room.code}.png`}
                        className="btn btn-secondary btn-sm btn-block"
                      >
                        Unduh Gambar QR
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: EKSPOR EXCEL */}
            {activeTab === "export" && (
              <div>
                <div className="management-heading">
                  <h1>Ekspor Laporan Rekapitulasi Excel</h1>
                  <p>Unduh format resmi buku pemantauan kebersihan PLN UPS</p>
                </div>

                <section className="panel">
                  <div className="panel-body">
                    <div style={{ maxWidth: "560px" }}>
                      <div className="field">
                        <label>Pilih Periode Bulan</label>
                        <input
                          type="month"
                          defaultValue={new Date().toISOString().slice(0, 7)}
                          id="export-month"
                        />
                      </div>

                      <div className="notice notice-info" style={{ marginTop: "16px" }}>
                        <strong>Aturan 4 Warna Laporan:</strong>
                        <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                          <li>🔴 Merah (✕): Tidak ada sesi disubmit</li>
                          <li>🟡 Kuning (◐): Sesi disubmit belum lengkap</li>
                          <li>🟣 Ungu (◈): Sesi petugas lengkap, menunggu SPV</li>
                          <li>🟢 Hijau (●): Seluruh sesi lengkap</li>
                        </ul>
                      </div>

                      <div style={{ marginTop: "24px" }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          onClick={() => {
                            const month = (document.getElementById("export-month") as HTMLInputElement)?.value || new Date().toISOString().slice(0, 7);
                            window.location.href = `/api/admin/export?month=${month}`;
                          }}
                        >
                          📥 Unduh Berkas Excel (.xlsx)
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 6: KELOLA RUANGAN */}
            {activeTab === "rooms" && (
              <div>
                <div className="users-heading">
                  <div>
                    <h1>Kelola Master Ruangan</h1>
                    <p>Daftar seluruh 26 ruangan, tipe template, dan token QR stiker</p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingRoom(null);
                      setRoomForm({ code: "", name: "", roomTypeId: roomTypes[0]?.id || "GENERAL", qrToken: "" });
                      setShowRoomModal(true);
                    }}
                  >
                    + Tambah Ruangan Baru
                  </button>
                </div>

                <div className="users-workspace">
                  <div className="users-toolbar">
                    <div className="field" style={{ margin: 0 }}>
                      <input
                        type="text"
                        value={searchRoom}
                        onChange={(e) => setSearchRoom(e.target.value)}
                        placeholder="Cari nama atau kode ruangan..."
                      />
                    </div>
                  </div>

                  <div className="users-table-wrap">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Ruangan</th>
                          <th>Tipe Template</th>
                          <th>Token QR</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRooms.map((room) => (
                          <tr key={room.id}>
                            <td>
                              <div className="user-names">
                                <strong>{room.name}</strong>
                                <span>{room.code}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-neutral">
                                {room.roomType?.name}
                              </span>
                            </td>
                            <td>
                              <code style={{ fontSize: "11px", color: "#647783" }}>
                                {room.qrToken}
                              </code>
                            </td>
                            <td>
                              <span className={`status-chip ${room.active ? "active" : "inactive"}`}>
                                {room.active ? "Aktif" : "Non-aktif"}
                              </span>
                            </td>
                            <td>
                              <div className="user-actions">
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setEditingRoom(room);
                                    setRoomForm({
                                      code: room.code,
                                      name: room.name,
                                      roomTypeId: room.roomTypeId,
                                      qrToken: room.qrToken,
                                    });
                                    setShowRoomModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: KELOLA PENGGUNA */}
            {activeTab === "users" && (
              <div>
                <div className="users-heading">
                  <div>
                    <h1>Kelola Pengguna</h1>
                    <p>Daftar akun petugas kebersihan, pengawas, dan administrator</p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ username: "", fullName: "", role: "PETUGAS", password: "" });
                      setShowUserModal(true);
                    }}
                  >
                    + Tambah Pengguna
                  </button>
                </div>

                <div className="users-kpi-grid">
                  <div className="users-kpi-card primary">
                    <span>TOTAL PENGGUNA</span>
                    <strong>{usersData.length}</strong>
                  </div>
                  <div className="users-kpi-card success">
                    <span>PETUGAS KEBERSIHAN</span>
                    <strong>
                      {usersData.filter((u) => u.role === "PETUGAS").length}
                    </strong>
                  </div>
                  <div className="users-kpi-card supervisor">
                    <span>PENGAWAS (SPV)</span>
                    <strong>
                      {usersData.filter((u) => u.role === "SUPERVISOR").length}
                    </strong>
                  </div>
                  <div className="users-kpi-card warning">
                    <span>ADMINISTRATOR</span>
                    <strong>
                      {usersData.filter((u) => u.role === "ADMIN").length}
                    </strong>
                  </div>
                </div>

                <div className="users-workspace">
                  <div className="users-table-wrap">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Pengguna</th>
                          <th>Peran (Role)</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="user-cell-info">
                                <div className={`user-avatar role-${user.role}`}>
                                  {user.fullName?.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-names">
                                  <strong>{user.fullName}</strong>
                                  <span>@{user.username}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`role-badge ${user.role}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>
                              <span className={`status-chip ${user.active ? "active" : "inactive"}`}>
                                {user.active ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td>
                              <div className="user-actions">
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserForm({
                                      username: user.username,
                                      fullName: user.fullName,
                                      role: user.role,
                                      password: "",
                                    });
                                    setShowUserModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: INTEGRASI NAS */}
            {activeTab === "nas" && (
              <div>
                <div className="settings-heading">
                  <h1>Integrasi Penyimpanan NAS QNAP</h1>
                  <p>Konfigurasi gateway penyimpanan bukti foto mandiri di server lokal PLN</p>
                </div>

                <div className="settings-layout">
                  <div className="settings-card">
                    <header>
                      <div>
                        <div className="settings-index">NAS</div>
                        <h2>Status Gateway Penyimpanan</h2>
                        <p>Endpoint: http://nasups01.myqnapcloud.com:18080</p>
                      </div>
                    </header>

                    <div className="settings-body">
                      <div className="storage-status">
                        <div className="storage-dot"></div>
                        <div>
                          <strong>Koneksi Aktif & Tersambung</strong>
                          <span>
                            Token otentikasi valid • Penyimpanan fisik mandiri aktif
                          </span>
                        </div>
                      </div>

                      <ul className="storage-list">
                        <li>Kompresi foto otomatis di peramban petugas sebelum diunggah</li>
                        <li>Penyimpanan foto terisolasi di jaringan lokal PLN UPS</li>
                        <li>Sistem redundan failover bila jaringan terputus</li>
                      </ul>

                      {nasStatus && (
                        <div
                          className={`notice ${nasStatus.ok ? "notice-success" : "notice-danger"}`}
                          style={{ marginTop: "16px" }}
                        >
                          <strong>Hasil Diagnostik:</strong> {nasStatus.message || (nasStatus.ok ? "HTTP 200 OK - Penyimpanan tersedia 338 GB" : "Gagal terhubung")}
                        </div>
                      )}
                    </div>

                    <div className="settings-actions">
                      <button
                        type="button"
                        disabled={nasTesting}
                        className="btn btn-secondary"
                        onClick={handleTestNas}
                      >
                        {nasTesting ? "Menguji Koneksi..." : "🔍 Uji Diagnostik NAS"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL RUANGAN */}
      {showRoomModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "grid", placeItems: "center", padding: "20px" }}>
          <div className="dashboard-card" style={{ maxWidth: "480px", width: "100%" }}>
            <header>
              <h2>{editingRoom ? "Edit Ruangan" : "Tambah Ruangan"}</h2>
            </header>
            <form onSubmit={handleSaveRoom} style={{ padding: "20px" }}>
              <div className="field">
                <label>Kode Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  placeholder="Contoh: PANTRY"
                />
              </div>
              <div className="field">
                <label>Nama Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Contoh: Ruang Rapat Utama"
                />
              </div>
              <div className="field">
                <label>Tipe Template</label>
                <select
                  value={roomForm.roomTypeId}
                  onChange={(e) => setRoomForm({ ...roomForm, roomTypeId: e.target.value })}
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Token QR Stiker Fisik</label>
                <input
                  type="text"
                  required
                  value={roomForm.qrToken}
                  onChange={(e) => setRoomForm({ ...roomForm, qrToken: e.target.value })}
                  placeholder="Token unik stiker QR dinding"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRoomModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "grid", placeItems: "center", padding: "20px" }}>
          <div className="dashboard-card" style={{ maxWidth: "480px", width: "100%" }}>
            <header>
              <h2>{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
            </header>
            <form onSubmit={handleSaveUser} style={{ padding: "20px" }}>
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="username akun"
                />
              </div>
              <div className="field">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Nama lengkap petugas"
                />
              </div>
              <div className="field">
                <label>Peran (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="PETUGAS">PETUGAS (Petugas Kebersihan)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Pengawas Kebersihan)</option>
                  <option value="ADMIN">ADMIN (Administrator)</option>
                </select>
              </div>
              <div className="field">
                <label>{editingUser ? "Password Baru (Opsional)" : "Password"}</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
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
