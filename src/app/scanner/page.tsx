"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QrCode, Camera, LogOut, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Sparkles, Building } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const startCameraScanner = async () => {
    setScanning(true);
    setError("");

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        qrScannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            scanner.stop().then(() => {
              setScanning(false);
              handleQrDetected(decodedText);
            }).catch(() => {});
          },
          () => {}
        );
      } catch (err: any) {
        console.warn("Camera start error:", err);
        setError("Kamera tidak dapat diakses atau browser memblokir izin kamera.");
        setScanning(false);
      }
    }, 200);
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch {}
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-file-processor");
    html5QrCode
      .scanFile(file, true)
      .then((decodedText) => {
        handleQrDetected(decodedText);
      })
      .catch((err) => {
        setError("QR Code tidak terdeteksi dari foto. Pastikan pencahayaan cukup dan foto tidak buram.");
      })
      .finally(() => {
        e.target.value = "";
      });
  };

  const handleQrDetected = (payload: string) => {
    let token = payload.trim();
    // Parse if format is PLNUPS:ROOM:token or URL
    if (token.includes("?room=")) {
      const url = new URL(token);
      token = url.searchParams.get("room") || token;
    } else if (token.startsWith("PLNUPS:ROOM:")) {
      token = token.replace("PLNUPS:ROOM:", "");
    }
    router.push(`/scanner/room/${encodeURIComponent(token)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-pln-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={28}
              height={36}
              priority
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Monitoring Kebersihan</h1>
              <p className="text-[11px] text-slate-400 font-medium">{user?.fullName || "Petugas"} · {user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-center">
        {/* Banner Card */}
        <div className="bg-gradient-to-br from-pln-blue to-pln-blue-dark rounded-3xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pln-yellow text-slate-950 text-xs font-bold mb-3 shadow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CHECKLIST HARIAN</span>
          </div>
          <h2 className="text-xl font-bold">Pindai QR Ruangan</h2>
          <p className="text-xs text-blue-100 mt-1 leading-relaxed">
            Arahkan kamera ke QR Code yang terpasang di ruangan untuk membuka formulir pemeriksaan.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={startCameraScanner}
            className="w-full py-4 px-5 bg-pln-yellow hover:bg-pln-yellow-dark text-slate-950 font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <Camera className="w-5 h-5 text-slate-950" />
            <span className="text-base">Buka Kamera Pemindai</span>
          </button>

          <label
            htmlFor="native-qr-input"
            className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-center gap-3 text-slate-200 text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4 text-pln-yellow" />
            <span>Ambil Foto QR (Kamera Bawaan)</span>
          </label>
          <input
            id="native-qr-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeFileUpload}
            className="hidden"
          />
        </div>

        {/* Hidden processor element */}
        <div id="qr-file-processor" className="hidden" />

        {/* Helper Note */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Pastikan QR Code bersih dan berada dalam pencahayaan yang cukup saat memindai.
          </p>
        </div>
      </main>

      {/* Live Camera Scanner Modal */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white pt-2">
            <span className="text-sm font-bold">Arahkan Kamera ke QR</span>
            <button
              onClick={stopCameraScanner}
              className="px-3 py-1.5 rounded-xl bg-white/20 text-xs font-semibold hover:bg-white/30"
            >
              Tutup
            </button>
          </div>

          <div className="relative my-auto flex flex-col items-center">
            <div
              id="qr-reader"
              className="w-full max-w-xs overflow-hidden rounded-3xl border-2 border-pln-yellow shadow-2xl"
            />
          </div>

          <div className="text-center pb-6">
            <p className="text-xs text-slate-400">Posisikan QR Code di dalam kotak kuning</p>
          </div>
        </div>
      )}
    </div>
  );
}
