"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock, User, AlertCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";

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
        throw new Error(data.message || "Login gagal.");
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
    <div className="w-full max-w-[430px]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#17313d] tracking-tight">Masuk Sistem</h2>
        <p className="text-sm text-[#647783] mt-1.5 leading-relaxed">
          Gunakan akun resmi petugas kebersihan, pengawas, atau administrator PLN UPS
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-[#fff0ee] border-l-4 border-[#bd2d22] text-[#872018] text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#bd2d22]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#647783]">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: arif / sulaiman / dwi"
              required
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#b9cbd3] rounded-xl text-sm text-[#17313d] placeholder-[#94a3b8] focus:outline-none focus:border-[#0076a8] focus:ring-4 focus:ring-[#0076a8]/15 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#647783]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#b9cbd3] rounded-xl text-sm text-[#17313d] placeholder-[#94a3b8] focus:outline-none focus:border-[#0076a8] focus:ring-4 focus:ring-[#0076a8]/15 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 px-4 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-lg shadow-[#0076a8]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f3f7f9] flex flex-col md:grid md:grid-cols-12 overflow-hidden">
      {/* Left Brand Panel (GAS style split) */}
      <section className="relative overflow-hidden bg-[#00577d] text-white p-8 md:p-16 md:col-span-6 lg:col-span-7 flex flex-col justify-between min-h-[300px] md:min-h-screen">
        {/* Geometric Accents */}
        <div className="absolute -right-28 -bottom-32 w-96 h-96 border-[70px] border-[#ffd100]/90 rounded-full pointer-events-none" />
        <div className="absolute right-16 top-14 w-36 h-36 border-2 border-white/20 rotate-12 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 p-3 px-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl mb-8">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={34}
              height={44}
              priority
              className="drop-shadow"
            />
            <div>
              <span className="text-xs font-black tracking-widest text-[#ffd100] uppercase block">PLN UPS</span>
              <span className="text-[11px] text-white/80 font-medium">Unit Pelaksana Transmisi</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Monitoring Kebersihan Ruangan
          </h1>
          <p className="text-white/80 text-sm md:text-base leading-relaxed">
            Sistem pemantauan standar 5S kebersihan dan sarana prasarana terintegrasi dengan penyimpanan bukti fisik mandiri.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/60 pt-4 border-t border-white/15">
          <span>Versi 2.0 Modern Engine</span>
          <span>PLN UPS 2026</span>
        </div>
      </section>

      {/* Right Login Form Panel */}
      <section className="flex-1 bg-white p-6 md:p-16 md:col-span-6 lg:col-span-5 flex items-center justify-center">
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0076a8]" /></div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
