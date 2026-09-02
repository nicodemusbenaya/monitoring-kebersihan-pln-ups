"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import Image from "next/image";
import { Camera, X, Upload, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { extractQrToken } from "@/lib/utils";

export default function ScannerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          setCurrentUser(data.user);
        } else {
          router.replace("/login?redirect=/scanner");
        }
      })
      .catch(() => router.replace("/login?redirect=/scanner"));

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  const handleScanSuccess = (decodedText: string) => {
    console.log("Raw QR scanned:", decodedText);
    const token = extractQrToken(decodedText);
    console.log("Extracted token:", token);

    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch(() => {});
    }

    if (!token) {
      setError("Format QR Code tidak dikenali.");
      return;
    }

    router.push(`/scanner/room/${encodeURIComponent(token)}`);
  };

  const startQrScanner = async () => {
    setError("");
    setScanning(true);

    setTimeout(async () => {
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode("qr-reader-container");
        }

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minDim * 0.75);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        };

        try {
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            () => {}
          );
        } catch (backCamErr) {
          console.warn("Back camera failed, trying any available camera:", backCamErr);
          await html5QrCodeRef.current.start(
            { facingMode: "user" },
            config,
            handleScanSuccess,
            () => {}
          );
        }
      } catch (err: any) {
        console.error("Camera start error:", err);
        setScanning(false);
        setError("Tidak dapat membuka kamera. Pastikan izin akses kamera aktif atau gunakan tombol pilih foto / kode manual.");
      }
    }, 100);
  };

  const stopQrScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    setScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      let qrEngine = html5QrCodeRef.current;
      if (!qrEngine) {
        qrEngine = new Html5Qrcode("qr-reader-hidden");
        html5QrCodeRef.current = qrEngine;
      }
      const result = await qrEngine.scanFile(file, true);
      handleScanSuccess(result);
    } catch (err) {
      console.error("File QR scan error:", err);
      setError("Gagal mendeteksi QR Code dari foto. Pastikan gambar fokus, terang, dan tidak buram.");
    }
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

  const roleLabel = (role: string) => {
    if (role === "ADMIN") return "Administrator";
    if (role === "SUPERVISOR") return "Pengawas Kebersihan";
    return "Petugas Kebersihan";
  };

  return (
    <div className="min-h-screen bg-[#edf2f6] text-[#17313d] font-sans flex flex-col">
      {/* Hidden container for file scanning fallback */}
      <div id="qr-reader-hidden" className="hidden" />

      {/* ────────────────── TOPBAR HEADER ────────────────── */}
      <header className="bg-white border-b border-[#d8e3ea] px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Image
            src="/pln-emblem.svg"
            alt="PLN"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded-lg shadow-sm"
            priority
          />
          <div className="h-6 w-[1px] bg-[#cbd5e1]"></div>
          <div>
            <strong className="text-xs font-black text-[#17313d] block leading-tight">
              Monitoring Kebersihan PLN UPS
            </strong>
            <span className="text-[11px] text-[#647783]">Pemindaian Ruangan</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="text-right hidden sm:block">
              <strong className="text-xs font-black text-[#17313d] block">{currentUser.fullName}</strong>
              <span className="text-[10px] text-[#647783] font-bold">{roleLabel(currentUser.role)}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] hover:border-[#dc2626] text-[#647783] hover:text-[#dc2626] rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* ────────────────── MAIN CONTENT ────────────────── */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* HERO CARD / CAMERA SCANNER CONTAINER */}
        {!scanning ? (
          /* Normal State: Hero Banner */
          <section className="bg-gradient-to-br from-[#072d3f] to-[#0d4661] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="space-y-2 max-w-md">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd100] block">
                CHECKLIST HARIAN
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Buka checklist ruangan
              </h1>
              <p className="text-xs text-[#b8d1df] leading-relaxed">
                Arahkan kamera langsung ke QR Code stiker fisik yang tertempel di ruangan untuk mengisi formulir checklist kebersihan.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={startQrScanner}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#ffd100] hover:bg-[#ffc400] text-[#072d3f] rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera Pemindai</span>
              </button>
              <span className="text-[11px] text-[#93b7cb]">Kamera langsung dari browser perangkat</span>
            </div>
          </section>
        ) : (
          /* Active State: Camera Replaces Hero Card */
          <section className="bg-[#072d3f] text-white rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping"></span>
                <h3 className="text-sm font-black text-white">Kamera Pemindai Aktif</h3>
              </div>
              <button
                type="button"
                onClick={stopQrScanner}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Tutup Kamera</span>
              </button>
            </div>

            {/* Live Camera Feed Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#ffd100]/40 shadow-inner max-w-sm mx-auto aspect-square flex items-center justify-center">
              <div id="qr-reader-container" className="w-full h-full object-cover" />
            </div>

            <p className="text-center text-[11px] text-[#93b7cb]">
              Posisikan QR Code di dalam kotak pemindaian kamera.
            </p>
          </section>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Alternative Methods Panel (Upload Foto & Input Manual) - Available on Mobile & Desktop */}
        <section className="bg-white border border-[#d8e3ea] rounded-3xl p-6 shadow-sm space-y-5">
          <div>
            <h4 className="text-sm font-extrabold text-[#17313d]">Pilihan Cadangan (Ketik Kode / Galeri)</h4>
            <p className="text-xs text-[#647783] mt-0.5">
              Gunakan jika kamera HP buram, izin ditolak, atau ruangan gelap. Anda dapat mengetik kode ruangan langsung.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Manual Code Input Form */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Ketik kode ruangan (contoh: PANTRY / RAPAT / ADMIN)"
                className="flex-1 px-4 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-2xl text-xs font-bold text-[#17313d] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0076a8]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Native Photo File Upload */}
            <div>
              <label className="w-full py-3 px-4 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#cbd5e1] rounded-2xl text-xs font-bold text-[#17313d] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                <Upload className="w-4 h-4 text-[#0076a8]" />
                <span>Pilih Foto QR dari Galeri / Kamera</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </section>

        {/* PWA / Shortcut Tips Banner */}
        <div className="p-4 bg-[#f8fafc] border border-[#cbd5e1] rounded-2xl flex items-start gap-3 text-xs text-[#475569]">
          <span className="text-base leading-none mt-0.5">💡</span>
          <div>
            <strong className="text-[#17313d] block font-bold">Tips Operasional Petugas:</strong>
            Agar sesi login tetap aktif dan tidak perlu login berulang kali, buka web ini di Google Chrome, tekan menu titik tiga di kanan atas, lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot; (Add to Home Screen)</strong>.
          </div>
        </div>
      </main>
    </div>
  );
}
