"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.user) setCurrentUser(res.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getPageTitle = () => {
    if (pathname === "/admin") return "Ringkasan";
    if (pathname === "/admin/performance") return "Performa Petugas";
    if (pathname === "/admin/evaluations") return "Kepuasan Pengguna";
    if (pathname === "/admin/qr") return "Cetak QR Ruangan";
    if (pathname === "/admin/export") return "Ekspor Laporan Excel";
    if (pathname === "/admin/users") return "Kelola Pengguna";
    if (pathname === "/admin/rooms") return "Pengelolaan Data Ruangan";
    if (pathname === "/admin/config") return "Konfigurasi Sistem & NAS";
    return "Portal Administrasi";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#edf2f6] font-sans text-[#17313d] select-none">
      {/* ────────────────── LEFT SIDEBAR (Dark Navy) ────────────────── */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-[260px]"
        } shrink-0 bg-[#072d3f] text-white flex flex-col justify-between transition-all duration-300 z-30 h-screen shadow-xl border-r border-[#0e3b52] select-none`}
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
                <Link
                  href="/admin"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md shadow-[#ffd100]/10"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Ringkasan</span>}
                </Link>

                <Link
                  href="/admin/performance"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/performance"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Performa petugas</span>}
                </Link>

                <Link
                  href="/admin/evaluations"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/evaluations"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Kepuasan pengguna</span>}
                </Link>
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
                <Link
                  href="/admin/qr"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/qr"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>QR ruangan</span>}
                </Link>

                <Link
                  href="/admin/export"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/export"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Ekspor Excel</span>}
                </Link>
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
                <Link
                  href="/admin/users"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/users"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Pengguna</span>}
                </Link>

                <Link
                  href="/admin/rooms"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/rooms"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Pengelolaan data</span>}
                </Link>

                <Link
                  href="/admin/config"
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname === "/admin/config"
                      ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                      : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Konfigurasi</span>}
                </Link>
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#d8e3ea] px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              PORTAL ADMINISTRASI
            </span>
            <h1 className="text-xl font-black text-[#17313d] capitalize">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right hidden sm:block">
                <strong className="text-xs font-black text-[#17313d] block">{currentUser.fullName}</strong>
                <span className="text-[11px] text-[#718c99]">
                  {currentUser.role === "ADMIN" ? "Administrator" : currentUser.role}
                </span>
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
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#0076a8] shadow-sm flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
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

        {/* Dynamic Page Content */}
        <main className="p-8 max-w-[1500px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
