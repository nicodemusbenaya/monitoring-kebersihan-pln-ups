"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

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

  const startQrScanner = async () => {
    setError("");
    setScanning(true);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-container");
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
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanning(false);
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan pilihan foto/kode manual.");
    }
  };

  const stopQrScanner = async () => {
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

  const roleLabel = (role: string) => {
    if (role === "ADMIN") return "Administrator";
    if (role === "SUPERVISOR") return "Pengawas Kebersihan";
    return "Petugas Kebersihan";
  };

  return (
    <div className="app-shell">
      {/* Topbar Header (GAS style) */}
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
              <span>Pemindaian ruangan</span>
            </div>
          </div>

          <div className="user-area">
            {currentUser && (
              <div className="user-copy">
                <strong>{currentUser.fullName}</strong>
                <span>{roleLabel(currentUser.role)}</span>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="page">
        {/* Room Banner */}
        <section className="room-banner">
          <div>
            <div className="eyebrow" style={{ color: "#ffd100" }}>
              CHECKLIST HARIAN
            </div>
            <h1>Buka checklist ruangan</h1>
            <p>Arahkan kamera langsung ke QR yang ditempel di ruangan untuk membuka checklist.</p>
          </div>
          <div className="scan-box">
            {!scanning ? (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={startQrScanner}
              >
                Baca QR Ruangan
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={stopQrScanner}
              >
                Tutup Kamera
              </button>
            )}
            <span style={{ marginTop: "9px" }}>Kamera langsung dari perangkat</span>
          </div>
        </section>

        {error && <div className="notice notice-danger">{error}</div>}

        {/* Scanner Panel */}
        <section className="panel">
          <div className="panel-body">
            <div
              id="qr-reader-container"
              style={{
                display: scanning ? "block" : "none",
                maxWidth: "480px",
                margin: "0 auto 20px",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            />

            {!scanning && (
              <div className="empty">
                <strong>Belum ada ruangan terbuka.</strong>
                <br />
                Tekan <b>Baca QR Ruangan</b>, lalu izinkan kamera untuk memindai QR.
                <div className="field-hint" style={{ marginTop: "12px" }}>
                  Pemindaian QR hanya menggunakan kamera langsung.
                </div>
              </div>
            )}

            {/* Native Mobile Camera Upload Fallback */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                  <span>📷 Foto QR dari Galeri / Kamera HP</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const html5Qr = new Html5Qrcode("qr-reader-container");
                        const result = await html5Qr.scanFile(file, true);
                        handleScanSuccess(result);
                      } catch {
                        setError("Gagal mendeteksi QR Code dari foto. Pastikan foto fokus dan jelas.");
                      }
                    }}
                  />
                </label>
              </div>

              {/* Manual Input Fallback */}
              <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "8px", flex: "1", maxWidth: "420px" }}>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Kode ruangan manual (contoh: PANTRY)"
                  style={{ flex: 1, minHeight: "36px", padding: "6px 12px", fontSize: "13px" }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Buka
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
