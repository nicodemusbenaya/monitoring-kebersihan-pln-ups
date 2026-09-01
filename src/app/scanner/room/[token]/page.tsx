"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Send,
  Loader2,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";

interface Activity {
  activityId: string;
  name: string;
  standardCategory?: string;
  standardText?: string;
  qualityApplicable: boolean;
  qualityPositive: string;
  qualityNegative: string;
  functionApplicable: boolean;
  functionPositive: string;
  functionNegative: string;
}

interface Slot {
  slotId: string;
  code: string;
  name: string;
  role: string;
  completed: any;
}

export default function RoomChecklistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  const [roomData, setRoomData] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form states
  const [answers, setAnswers] = useState<Record<string, { quality: string; function: string; note: string }>>({});
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          setRoomData(data.data);
          // Pre-populate initial answers
          const initialAnswers: any = {};
          data.data.activities.forEach((act: Activity) => {
            initialAnswers[act.activityId] = {
              quality: act.qualityApplicable ? "POSITIVE" : "NA",
              function: act.functionApplicable ? "POSITIVE" : "NA",
              note: "",
            };
          });
          setAnswers(initialAnswers);
        } else {
          setError(data.message || "Ruangan tidak valid.");
        }
      })
      .catch((err) => setError("Gagal memuat data ruangan."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDimensionChange = (activityId: string, dimension: "quality" | "function", value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [dimension]: value,
      },
    }));
  };

  const handleNoteChange = (activityId: string, note: string) => {
    setAnswers((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        note,
      },
    }));
  };

  // Image compressor
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 8) {
      alert("Maksimal 8 foto per slot pemeriksaan.");
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
        setPhotos((prev) => [...prev, compressedDataUrl]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Pilih slot waktu pemeriksaan terlebih dahulu.");
      return;
    }

    if (photos.length === 0) {
      alert("Minimal 1 foto bukti fisik wajib dilampirkan.");
      return;
    }

    // Validate notes on findings
    for (const act of roomData.activities) {
      const ans = answers[act.activityId];
      if (ans) {
        const hasFinding = ans.quality === "NEGATIVE" || ans.function === "NEGATIVE";
        if (hasFinding && !ans.note.trim()) {
          alert(`Catatan temuan wajib diisi pada indikator: ${act.name}`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const payloadAnswers = roomData.activities.map((act: Activity) => ({
        activityId: act.activityId,
        qualityResult: answers[act.activityId]?.quality || "NA",
        functionResult: answers[act.activityId]?.function || "NA",
        note: answers[act.activityId]?.note || "",
      }));

      const res = await fetch("/api/inspections/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId: roomData.scan?.scanId,
          roomId: roomData.room.id,
          slotId: selectedSlot.slotId,
          answers: payloadAnswers,
          photos: photos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Gagal menyimpan pemeriksaan.");
      }

      setSuccessData(data.data);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-pln-blue" />
      </div>
    );
  }

  if (error && !roomData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h1 className="text-lg font-bold">Terjadi Kesalahan</h1>
        <p className="text-sm text-slate-400 text-center mt-1 max-w-xs">{error}</p>
        <button
          onClick={() => router.push("/scanner")}
          className="mt-6 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-xl"
        >
          Kembali ke Pemindai
        </button>
      </div>
    );
  }

  // Success Screen
  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Pemeriksaan Berhasil!</h1>
          <p className="text-xs text-slate-400 mt-1">Data pemeriksaan & bukti foto telah tersimpan aman.</p>

          <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Ruangan:</span>
              <span className="font-semibold text-white">{successData.roomName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Slot:</span>
              <span className="font-semibold text-white">{successData.slotName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Waktu:</span>
              <span className="font-semibold text-white">{successData.displayTime}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              <span
                className={`font-semibold ${
                  successData.overallStatus === "BERSIH" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {successData.overallStatus === "BERSIH" ? "✓ Bersih / Normal" : `⚠ Ada ${successData.dirtyCount} Temuan`}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/scanner")}
            className="w-full py-3.5 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-xl transition-all"
          >
            Pindai Ruangan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/scanner")}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{roomData.room.name}</span>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* Room Header Info */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pln-yellow px-2 py-0.5 rounded-md bg-pln-yellow/10 border border-pln-yellow/20">
                {roomData.room.roomTypeName}
              </span>
              <h1 className="text-xl font-bold text-white mt-1.5 leading-tight">{roomData.room.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Kode: {roomData.room.code}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Scan Terverifikasi</span>
              <span className="text-xs font-semibold text-white">{roomData.scan?.displayTime}</span>
            </div>
          </div>
        </div>

        {/* Slot Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Pilih Slot Pemeriksaan <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {roomData.slots.map((slot: Slot) => {
              const isCompleted = Boolean(slot.completed);
              const isSelected = selectedSlot?.slotId === slot.slotId;

              return (
                <button
                  key={slot.slotId}
                  type="button"
                  disabled={isCompleted}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3.5 rounded-2xl text-left border transition-all ${
                    isCompleted
                      ? "bg-slate-900/50 border-slate-800/60 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-pln-blue/20 border-pln-blue text-white shadow-lg ring-1 ring-pln-blue"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{slot.name}</span>
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : isSelected ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-pln-blue" />
                    ) : null}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {isCompleted ? `Selesai (${slot.completed.officerName})` : "Belum diisi"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prior results for supervisors */}
        {roomData.petugasResults && roomData.petugasResults.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Hasil Petugas Hari Ini</h3>
            <div className="space-y-1.5">
              {roomData.petugasResults.map((pr: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60 last:border-0">
                  <span className="text-slate-300">{pr.slotName} ({pr.officerName})</span>
                  <span className={pr.overallStatus === "BERSIH" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {pr.overallStatus === "BERSIH" ? "Bersih" : `Ada ${pr.dirtyCount} Temuan`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Checklist */}
        {selectedSlot && (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Indikator 5S & Checklist</h2>
              <span className="text-xs text-slate-400 font-medium">{roomData.activities.length} Indikator</span>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-3">
              {roomData.activities.map((act: Activity, idx: number) => {
                const ans = answers[act.activityId] || { quality: "POSITIVE", function: "POSITIVE", note: "" };
                const hasFinding = ans.quality === "NEGATIVE" || ans.function === "NEGATIVE";

                return (
                  <div
                    key={act.activityId}
                    className={`p-4 rounded-2xl border transition-all ${
                      hasFinding ? "bg-amber-950/20 border-amber-500/40" : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{act.name}</h3>
                        {act.standardText && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{act.standardText}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {/* Quality */}
                      {act.qualityApplicable && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Kualitas / Kebersihan</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(act.activityId, "quality", "POSITIVE")}
                              className={`py-2 px-2.5 rounded-xl font-semibold border text-center transition-all ${
                                ans.quality === "POSITIVE"
                                  ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {act.qualityPositive || "Bersih"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(act.activityId, "quality", "NEGATIVE")}
                              className={`py-2 px-2.5 rounded-xl font-semibold border text-center transition-all ${
                                ans.quality === "NEGATIVE"
                                  ? "bg-rose-600/30 border-rose-500 text-rose-200"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {act.qualityNegative || "Kotor"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Function */}
                      {act.functionApplicable && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-1">Fungsi / Kondisi</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(act.activityId, "function", "POSITIVE")}
                              className={`py-2 px-2.5 rounded-xl font-semibold border text-center transition-all ${
                                ans.function === "POSITIVE"
                                  ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {act.functionPositive || "Normal"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(act.activityId, "function", "NEGATIVE")}
                              className={`py-2 px-2.5 rounded-xl font-semibold border text-center transition-all ${
                                ans.function === "NEGATIVE"
                                  ? "bg-rose-600/30 border-rose-500 text-rose-200"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {act.functionNegative || "Rusak"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Note on findings */}
                    {hasFinding && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                          Catatan Temuan <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={ans.note}
                          onChange={(e) => handleNoteChange(act.activityId, e.target.value)}
                          placeholder="Jelaskan kondisi atau temuan yang ada..."
                          required
                          className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Photo Evidence Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Bukti Foto (Evidence) <span className="text-red-400">*</span>
                </h3>
                <span className="text-[11px] text-slate-400">{photos.length}/8 Foto</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Minimal 1 foto wajib diambil langsung menggunakan kamera HP.
              </p>

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 8 && (
                <label
                  htmlFor="evidence-camera-input"
                  className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-pln-yellow cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto Langsung</span>
                </label>
              )}
              <input
                id="evidence-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-5 bg-pln-blue hover:bg-pln-blue-dark text-white font-bold rounded-2xl shadow-xl shadow-pln-blue/25 flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan ke Database & NAS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Laporan Pemeriksaan</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
