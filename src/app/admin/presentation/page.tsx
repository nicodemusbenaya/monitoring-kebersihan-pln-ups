"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star, ShieldAlert, CheckCircle2, Clock, Sparkles } from "lucide-react";

export default function PresentationPage() {
  const [data, setData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const dataTimer = setInterval(fetchData, 20000); // 20s auto-refresh
    return () => clearInterval(dataTimer);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now) + " WIB"
      );
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold text-xl">
        Memuat Dashboard Monitor Display PLN UPS...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col justify-between overflow-hidden select-none">
      {/* Top TV Bar */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={42}
              height={55}
              priority
            />
          </div>
          <div>
            <span className="text-xs text-pln-yellow font-bold uppercase tracking-widest block">
              LIVE MONITORING DISPLAY
            </span>
            <h1 className="text-2xl font-black text-white">Monitoring Kebersihan PLN UPS</h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium block">Waktu Operasional Real-time</span>
          <span className="text-lg font-mono font-bold text-emerald-400">{currentTime}</span>
        </div>
      </header>

      {/* Center Display Grid */}
      <main className="flex-1 grid grid-cols-12 gap-6 my-6">
        {/* Left 4 Cols: Big KPIs */}
        <div className="col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pemeriksaan Hari Ini</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black text-white">{data.metrics.inspectionsTodayCount}</span>
              <span className="text-sm text-slate-400 font-semibold">Sesi Tersimpan</span>
            </div>
            <div className="mt-3 flex gap-3 text-xs font-semibold">
              <span className="text-emerald-400">✓ {data.metrics.cleanCount} Bersih</span>
              <span className="text-amber-400">⚠ {data.metrics.findingCount} Temuan</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kepuasan Pengguna</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black text-pln-yellow flex items-center gap-2">
                <Star className="w-8 h-8 fill-pln-yellow text-pln-yellow" />
                <span>{data.metrics.averageRating}</span>
              </span>
              <span className="text-sm text-slate-400 font-semibold">/ 4.0 Skala</span>
            </div>
            <span className="text-xs text-slate-400 mt-2 block">
              {data.metrics.totalEvaluations} ulasan anonim bulan ini
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tingkat Kepuasan</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black text-emerald-400">{data.metrics.satisfactionRate}%</span>
              <span className="text-sm text-slate-400 font-semibold">Puas & Sangat Puas</span>
            </div>
            <span className="text-xs text-slate-400 mt-2 block">Standar 5S Kebersihan PLN</span>
          </div>
        </div>

        {/* Right 8 Cols: Live Room Status Grid */}
        <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pln-yellow" />
              <span>Matriks Pemenuhan Ruangan</span>
            </h2>
            {/* 4 Status Legend */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Belum</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Petugas Sebagian</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Tunggu SPV</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Lengkap</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 overflow-hidden flex-1 content-start">
            {data.roomSummaries?.slice(0, 18).map((room: any) => {
              const isComplete = room.status === "COMPLETE";
              const isWaitingSpv = room.status === "WAITING_SPV";
              const isPartial = room.status === "PARTIAL";

              return (
                <div
                  key={room.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isComplete
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : isWaitingSpv
                      ? "bg-purple-950/20 border-purple-500/40"
                      : isPartial
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-bold text-white truncate max-w-[150px]">{room.name}</h3>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isComplete
                          ? "bg-emerald-400 animate-pulse"
                          : isWaitingSpv
                          ? "bg-purple-400 animate-pulse"
                          : isPartial
                          ? "bg-amber-400"
                          : "bg-red-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>{room.roomTypeName}</span>
                    <span className="font-mono font-bold text-slate-200">
                      {room.completedSlots}/{room.totalSlots}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
        <span>Sistem Monitoring Kebersihan PLN Unit Pelaksana Transmisi</span>
        <span>Terhubung ke Storage QNAP NAS On-Premise · Auto-Refresh 20s</span>
      </footer>
    </div>
  );
}
