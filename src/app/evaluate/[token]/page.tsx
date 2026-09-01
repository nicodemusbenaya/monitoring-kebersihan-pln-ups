"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare,
  Sparkles,
  Smile,
  Heart,
  ThumbsUp,
} from "lucide-react";

interface Aspect {
  id: string;
  code: string;
  label: string;
}

export default function GuestEvaluationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = decodeURIComponent(resolvedParams.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomData, setRoomData] = useState<any>(null);

  const [rating, setRating] = useState<number>(4);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/evaluate?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Gagal memuat ruangan.");
        }
        setRoomData(json);
      })
      .catch((err: any) => {
        setError(err.message || "Ruangan tidak ditemukan.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const toggleAspect = (code: string) => {
    setSelectedAspects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomData) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomData.room.id,
          roomTypeId: roomData.room.roomTypeId,
          rating,
          aspectCodes: selectedAspects,
          comment,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Gagal mengirim ulasan.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengirim penilaian.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white rounded-2xl border border-[#d9e4e9] p-3 shadow-md flex items-center justify-center mb-3">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
            alt="Logo PLN"
            width={32}
            height={40}
            priority
          />
        </div>
        <h2 className="text-sm font-bold text-[#17313d]">Memuat Form Ulasan...</h2>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#d9e4e9] rounded-2xl p-8 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#bd2d22] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#17313d]">Ruangan Tidak Ditemukan</h2>
          <p className="text-xs text-[#647783] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#d9e4e9] rounded-2xl p-8 text-center shadow-md">
          <div className="w-16 h-16 bg-[#e7f6ef] text-[#157a55] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-[#17313d]">Terima Kasih!</h2>
          <p className="text-xs text-[#647783] mt-2 leading-relaxed">
            Ulasan dan masukan Anda untuk <strong>{roomData.room.name}</strong> sangat berharga untuk meningkatkan standar kebersihan fasilitas kami.
          </p>
        </div>
      </div>
    );
  }

  const ratingOptions = [
    { value: 4, emoji: "🤩", label: "Sangat Baik" },
    { value: 3, emoji: "😊", label: "Baik" },
    { value: 2, emoji: "😐", label: "Cukup" },
    { value: 1, emoji: "😞", label: "Kurang" },
  ];

  return (
    <main className="min-h-screen bg-[#f3f7f9] py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-[#d9e4e9] rounded-2xl shadow-md overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#00577d] text-white p-6 relative overflow-hidden text-center">
          <div className="inline-flex items-center gap-2 p-2 px-3 bg-white/10 rounded-xl mb-3">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
              width={22}
              height={28}
            />
            <span className="text-xs font-bold text-[#ffd100] uppercase tracking-wider">PLN UPS</span>
          </div>
          <h1 className="text-xl font-bold">{roomData.room.name}</h1>
          <p className="text-xs text-white/80 mt-1">Bagikan Penilaian & Tingkat Kepuasan Anda</p>
          <div className="absolute -right-8 -bottom-8 w-24 h-24 border-8 border-[#ffd100]/20 rounded-full pointer-events-none" />
        </div>

        {/* Rating Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-2.5 text-center">
              Bagaimana Kondisi Ruangan Ini?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ratingOptions.map((opt) => {
                const isSelected = rating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRating(opt.value)}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#e8f5fa] border-[#0076a8] text-[#00577d] shadow-sm font-bold scale-105 ring-2 ring-[#0076a8]/20"
                        : "bg-white border-[#d9e4e9] text-[#647783] hover:border-[#0076a8]"
                    }`}
                  >
                    <span className="text-2xl mb-1">{opt.emoji}</span>
                    <span className="text-[10px] leading-tight text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Badges */}
          {roomData.aspects && roomData.aspects.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-2">
                Aspek yang Perlu Ditingkatkan / Dipertahankan:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {roomData.aspects.map((asp: Aspect) => {
                  const isSelected = selectedAspects.includes(asp.code);
                  return (
                    <button
                      key={asp.id}
                      type="button"
                      onClick={() => toggleAspect(asp.code)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-[#0076a8] border-[#0076a8] text-white shadow-sm"
                          : "bg-[#f8fafb] border-[#d9e4e9] text-[#49616c] hover:border-[#0076a8]"
                      }`}
                    >
                      {asp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Box */}
          <div>
            <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-1.5">
              Saran & Masukan Tambahan:
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Tuliskan saran kebersihan atau fasilitas..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#b9cbd3] rounded-xl text-xs text-[#17313d] focus:outline-none focus:border-[#0076a8] focus:ring-2 focus:ring-[#0076a8]/15 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-lg shadow-[#0076a8]/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Ulasan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Penilaian</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
