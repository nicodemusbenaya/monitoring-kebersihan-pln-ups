"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  Camera,
  AlertCircle,
  Loader2,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";

export default function ScannerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          setCurrentUser(data.user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleScanSuccess = (decodedText: string) => {
    let token = decodedText.trim();
    if (token.includes("?")) {
      try {
        const url = new URL(token.startsWith("http") ? token : `https://dummy.com/${token}`);
        const room = url.searchParams.get("room");
        const evalParam = url.searchParams.get("evaluate");
        if (room) token = room;
        else if (evalParam) token = evalParam;
      } catch {
        const match = token.match(/[?&](?:room|evaluate)=([^&#]+)/i);
        if (match) token = decodeURIComponent(match[1]).trim();
      }
    }

    if (token.toUpperCase().startsWith("PLNUPS:ROOM:")) {
      token = token.slice(12).trim();
    }

    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch(() => {});
    }

    router.push(`/scanner/room/${encodeURIComponent(token)}`);
  };

  const startScanner = async () => {
    setError("");
    setScanning(true);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        handleScanSuccess,
        () => {}
      );
      setCameraAvailable(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraAvailable(false);
      setScanning(false);
      setError("Tidak dapat mengakses kamera belakang. Silakan gunakan tombol foto atau masukkan kode ruangan di bawah.");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
    }
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScanSuccess(manualToken.trim());
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f3f7f9] text-[#17313d] flex flex-col">
      {/* Topbar Header (GAS style) */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#d9e4e9] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={26}
              height={34}
              priority
            />
            <div className="border-l border-[#d9e4e9] pl-3">
              <h1 className="text-sm font-bold text-[#00577d] leading-tight">Monitoring Kebersihan</h1>
              <span className="text-[11px] text-[#647783] block">PLN UPS · Standar 5S</span>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-[#17313d] block">{currentUser.fullName}</span>
                <span className="text-[10px] text-[#0076a8] font-bold uppercase">{currentUser.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar Akun"
                className="p-2 rounded-xl text-[#647783] hover:text-[#bd2d22] hover:bg-[#fff0ee] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* Welcome Card Banner */}
        <div className="bg-[#00577d] text-white p-6 rounded-2xl shadow-md mb-5 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs text-[#ffd100] font-bold uppercase tracking-wider block mb-1">
              Petugas Operasional
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Halo, {currentUser?.fullName || "Petugas"}!
            </h2>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              Pindai QR Code yang tertempel di dinding ruangan untuk memulai pengisian checklist 5S harian.
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 border-8 border-[#ffd100]/30 rounded-full pointer-events-none" />
        </div>

        {/* Scanner Card */}
        <div className="bg-white border border-[#d9e4e9] rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[#fff0ee] border-l-4 border-[#bd2d22] text-[#872018] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#bd2d22]" />
              <span>{error}</span>
            </div>
          )}

          {/* Camera Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-[#17313d] min-h-[260px] flex items-center justify-center mb-5 border-2 border-dashed border-[#b9cbd3]">
            <div id="reader" className={`w-full ${scanning ? "block" : "hidden"}`} />

            {!scanning && (
              <div className="p-8 text-center text-white">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#ffd100]">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold">Kamera Belum Aktif</h3>
                <p className="text-xs text-white/70 mt-1 max-w-xs">
                  Tekan tombol di bawah untuk mengaktifkan pemindai kamera
                </p>
              </div>
            )}
          </div>

          {/* Actions Button */}
          <div className="space-y-3">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full py-3.5 px-4 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" />
                <span>Aktifkan Kamera Pemindai</span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-3.5 px-4 bg-[#647783] hover:bg-[#17313d] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Hentikan Kamera</span>
              </button>
            )}

            {/* Native Mobile Camera Capture */}
            <label className="w-full py-3.5 px-4 bg-white border border-[#0076a8] text-[#0076a8] hover:bg-[#e8f5fa] font-bold rounded-xl flex items-center justify-center gap-2 text-sm cursor-pointer transition-all">
              <Camera className="w-4 h-4" />
              <span>Foto QR dari Kamera HP</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const html5Qr = new Html5Qrcode("reader");
                    const result = await html5Qr.scanFile(file, true);
                    handleScanSuccess(result);
                  } catch {
                    setError("Gagal mendeteksi QR Code dari foto. Pastikan foto jelas dan cukup cahaya.");
                  }
                }}
              />
            </label>
          </div>

          {/* Manual Input Fallback */}
          <div className="mt-6 pt-5 border-t border-[#d9e4e9]">
            <span className="text-[11px] font-bold text-[#647783] uppercase tracking-wider block mb-2">
              Atau Masukkan Kode / Token Ruangan
            </span>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Contoh: PANTRY atau TOILET_SENIOR_MANAGER"
                className="flex-1 px-3.5 py-2.5 bg-white border border-[#b9cbd3] rounded-xl text-xs text-[#17313d] focus:outline-none focus:border-[#0076a8] font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#17313d] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
