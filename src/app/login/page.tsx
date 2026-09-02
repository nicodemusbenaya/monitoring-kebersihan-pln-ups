"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Username atau password salah.");
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push(redirectUrl === "/" ? "/scanner" : redirectUrl);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <h2>Masuk ke aplikasi</h2>
      <p>Gunakan username dan password yang diberikan administrator.</p>

      {redirectUrl !== "/" && (
        <div style={{ background: "#e8f5fa", border: "1px solid #bae6fd", borderRadius: "12px", padding: "10px 12px", fontSize: "12px", color: "#0369a1", marginBottom: "16px", fontWeight: 600 }}>
          ℹ️ Silakan masuk. Pemeriksaan ruangan Anda akan langsung dilanjutkan setelah login.
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            placeholder="Username akun"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="Password akun"
          />
        </div>

        <button
          id="login-button"
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-block"
        >
          {loading ? "Memverifikasi..." : "Masuk"}
        </button>

        <p style={{ marginTop: "16px", fontSize: "11px", color: "var(--muted)", textAlign: "center", lineHeight: "1.4" }}>
          💡 Sesi Anda tersimpan otomatis. Gunakan menu <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> di Chrome agar tidak perlu login ulang.
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="login-layout">
      {/* Brand Panel (Left on desktop) */}
      <section className="login-brand">
        <div className="brand-mark">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
            alt="Logo PLN"
          />
        </div>

        <div className="login-copy">
          <h1>Ruang bersih, kerja lebih baik.</h1>
          <p>Monitoring kebersihan PLN UPS dengan pemeriksaan terjadwal dan bukti foto.</p>
        </div>

        <div className="room-chip">
          Masuk sekali, lalu pindai QR ruangan dari aplikasi
        </div>
      </section>

      {/* Login Panel (Right on desktop) */}
      <section className="login-panel">
        <Suspense fallback={<div className="login-card"><p>Memuat formulir masuk...</p></div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
