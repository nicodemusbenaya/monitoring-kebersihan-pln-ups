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
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return null;
        }
        return r.json();
      })
      .then((res) => {
        if (!res) return;
        if (res.ok && res.user) {
          if (res.user.role !== "ADMIN") {
            router.replace("/scanner");
            return;
          }
          setCurrentUser(res.user);
        } else {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, router]);

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
      {/* ────────────────── LEFT SIDEBAR (Hidden in Presentation Mode) ────────────────── */}
      {!isPresentationMode && (
        <aside
          className={`${
            sidebarCollapsed ? "w-[72px]" : "w-[260px]"
          } shrink-0 bg-[#072d3f] text-white flex flex-col justify-between transition-all duration-300 z-30 h-screen shadow-xl border-r border-[#0e3b52] select-none`}
        >
          <div>
            {/* Logo & Header */}
            {sidebarCollapsed ? (
              <div className="py-3 px-2 flex flex-col items-center gap-2 border-b border-[#0f3d54]">
                <Image
                  src="/pln-emblem.svg"
                  alt="PLN"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain rounded-lg shadow-sm"
                  priority
                />
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-6 h-6 rounded-md bg-[#0e3a50] hover:bg-[#144b67] text-[#97b7c8] hover:text-white transition-colors flex items-center justify-center shadow-inner"
                  title="Buka menu navigasi"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between border-b border-[#0f3d54]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Image
                    src="/pln-emblem.svg"
                    alt="PLN"
                    width={34}
                    height={34}
                    className="w-8 h-8 object-contain shrink-0 rounded-lg shadow-sm"
                    priority
                  />
                  <div className="truncate">
                    <span className="font-extrabold text-sm tracking-wide text-white block leading-tight">
                      PLN UPS
                    </span>
                    <span className="text-[11px] text-[#86a6b8] block">Monitoring kebersihan</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-7 h-7 rounded-lg bg-[#0e3a50] hover:bg-[#144b67] text-[#97b7c8] hover:text-white transition-colors flex items-center justify-center shrink-0"
                  title="Ciutkan menu"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Navigation Menu */}
            <nav className={`overflow-y-auto max-h-[calc(100vh-140px)] ${sidebarCollapsed ? "p-2 space-y-3" : "p-3 space-y-5"}`}>
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
                    title="Ringkasan"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md shadow-[#ffd100]/10"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md shadow-[#ffd100]/10"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <LayoutGrid className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Ringkasan</span>}
                  </Link>

                  <Link
                    href="/admin/performance"
                    title="Performa Petugas"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/performance"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/performance"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Performa petugas</span>}
                  </Link>

                  <Link
                    href="/admin/evaluations"
                    title="Kepuasan Pengguna"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/evaluations"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/evaluations"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
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
                    title="QR Ruangan"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/qr"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/qr"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>QR ruangan</span>}
                  </Link>

                  <Link
                    href="/admin/export"
                    title="Ekspor Excel"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/export"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/export"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
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
                    title="Pengguna"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/users"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/users"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Pengguna</span>}
                  </Link>

                  <Link
                    href="/admin/rooms"
                    title="Pengelolaan Data"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/rooms"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/rooms"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <Database className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Pengelolaan data</span>}
                  </Link>

                  <Link
                    href="/admin/config"
                    title="Konfigurasi"
                    className={
                      sidebarCollapsed
                        ? `w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                            pathname === "/admin/config"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                        : `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            pathname === "/admin/config"
                              ? "bg-[#093950] text-[#ffd100] border border-[#ffd100] shadow-md"
                              : "text-[#b2c8d4] hover:bg-[#0c364d] hover:text-white"
                          }`
                    }
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Konfigurasi</span>}
                  </Link>
                </div>
              </div>
            </nav>
          </div>

          {/* Bottom Status Footprint */}
          <div className={sidebarCollapsed ? "p-3 flex justify-center border-t border-[#0f3d54]" : "p-4 border-t border-[#0f3d54] text-xs"}>
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
      )}

      {/* ────────────────── MAIN CONTENT WRAPPER ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar (Switches layout dynamically in Presentation Mode) */}
        <header className="bg-white border-b border-[#d8e3ea] px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          {/* Left Title */}
          <div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest block ${
                isPresentationMode ? "text-[#0076a8]" : "text-[#718c99]"
              }`}
            >
              {isPresentationMode ? "MODE PRESENTASI AKTIF" : "PORTAL ADMINISTRASI"}
            </span>
            <h1 className="text-xl font-black text-[#17313d] capitalize">
              {isPresentationMode
                ? pathname === "/admin/performance"
                  ? "Performa Petugas"
                  : "Dashboard Operasional"
                : getPageTitle()}
            </h1>
          </div>

          {/* Center Tabs (Presentation Mode Only - Screenshots 1 & 2) */}
          {isPresentationMode && (
            <div className="inline-flex p-1 bg-[#e2e8f0] rounded-2xl">
              <Link
                href="/admin"
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  pathname === "/admin"
                    ? "bg-[#0076a8] text-white shadow-md"
                    : "text-[#647783] hover:text-[#17313d]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Dashboard Operasional</span>
              </Link>
              <Link
                href="/admin/performance"
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  pathname === "/admin/performance"
                    ? "bg-[#0076a8] text-white shadow-md"
                    : "text-[#647783] hover:text-[#17313d]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Performa Petugas</span>
              </Link>
            </div>
          )}

          {/* Right Action Buttons */}
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
              {isPresentationMode ? (
                <button
                  type="button"
                  onClick={() => setIsPresentationMode(false)}
                  className="px-3.5 py-2 bg-[#fffdf5] border border-[#ffd100] hover:bg-[#fff9db] rounded-xl text-xs font-bold text-[#9a6500] shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Tv className="w-3.5 h-3.5 text-[#ffd100]" />
                  <span>Keluar presentasi</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPresentationMode(true)}
                  className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#0076a8] shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Mode presentasi</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-white border border-[#b9cbd3] hover:border-[#0076a8] rounded-xl text-xs font-bold text-[#17313d] hover:text-[#0076a8] shadow-sm flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
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
        <main
          className={`w-full mx-auto space-y-6 transition-all ${
            isPresentationMode ? "p-8 max-w-[1700px]" : "p-8 max-w-[1500px]"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
