"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { Star, CheckCircle2, AlertCircle, Loader2, Send, HeartHandshake } from "lucide-react";
import confetti from "canvas-confetti";

export default function AnonymousEvaluationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetch(`/api/evaluations?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          setRoomData(data.data);
        } else {
          setError(data.message || "Tautan evaluasi tidak valid.");
        }
      })
      .catch(() => setError("Gagal memuat form evaluasi."))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleAspect = (code: string) => {
    setSelectedAspects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Pilih rating kepuasan terlebih dahulu.");
      return;
    }

    if (rating <= 2 && (selectedAspects.length === 0 || !comment.trim())) {
      alert("Silakan pilih aspek yang perlu ditingkatkan dan tuliskan alasannya.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          aspectCodes: selectedAspects,
          comment,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal mengirim evaluasi.");
      }

      setSuccess(data.data);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-pln-yellow" />
      </div>
    );
  }

  if (error && !roomData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h1 className="text-lg font-bold">Tautan Tidak Dapat Dibuka</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">Terima Kasih!</h1>
          <p className="text-xs text-slate-300 mt-1">
            Penilaian Anda sangat berharga untuk meningkatkan kualitas kebersihan {success.roomName}.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Penilaian Anda</span>
            <div className="flex justify-center gap-1.5 text-pln-yellow text-xl mb-1">
              {[1, 2, 3, 4].map((star) => (
                <span key={star} className={star <= success.rating ? "opacity-100" : "opacity-30"}>★</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-white">{success.ratingLabel}</span>
          </div>

          <p className="text-[11px] text-slate-500">Evaluasi tersimpan secara anonim tanpa identitas pribadi.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow mb-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={38}
              height={50}
              priority
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-pln-yellow block">Evaluasi Anonim</span>
          <h1 className="text-xl font-bold text-white mt-0.5">Bagaimana kondisi {roomData.room.name}?</h1>
          <p className="text-xs text-slate-400 mt-1">Bantu kami menjaga kebersihan ruangan PLN UPS</p>
        </div>

        {/* Evaluation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Rating Stars / Options */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                Berikan Penilaian <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 1, label: "Sangat Tidak Puas", stars: "★" },
                  { value: 2, label: "Kurang Puas", stars: "★★" },
                  { value: 3, label: "Puas", stars: "★★★" },
                  { value: 4, label: "Sangat Puas", stars: "★★★★" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRating(opt.value)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      rating === opt.value
                        ? "bg-pln-blue/20 border-pln-blue text-white ring-1 ring-pln-blue"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="text-pln-yellow text-base block font-bold mb-0.5">{opt.stars}</span>
                    <strong className="text-xs block font-bold text-white">{opt.label}</strong>
                    <span className="text-[10px] text-slate-400">{opt.value} dari 4</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspects checklist for low rating */}
            {rating > 0 && rating <= 2 && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Apa yang perlu kami tingkatkan?</h3>
                  <p className="text-[11px] text-slate-400">Pilih semua yang sesuai</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roomData.aspects.map((asp: any) => {
                    const isSelected = selectedAspects.includes(asp.code);
                    return (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => toggleAspect(asp.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-200"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {asp.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Field */}
            {rating > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {rating <= 2 ? (
                    <>
                      Jelaskan alasan penilaian <span className="text-red-400">*</span>
                    </>
                  ) : (
                    <>Komentar / Saran Tambahan <span className="text-slate-500 text-[10px] font-normal">(opsional)</span></>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    rating <= 2
                      ? "Ceritakan bagian yang perlu diperhatikan..."
                      : "Ceritakan hal yang sudah baik atau saran singkat..."
                  }
                  required={rating <= 2}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-pln-blue"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full py-3.5 px-4 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Evaluasi</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Data evaluasi dicatat tanpa nama atau akun pribadi.
        </p>
      </div>
    </main>
  );
}
