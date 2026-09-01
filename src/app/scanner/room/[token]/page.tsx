"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  X,
  Upload,
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  Send,
  Sparkles,
  ChevronDown,
  Info,
  ShieldCheck,
} from "lucide-react";

interface Activity {
  id: string;
  name: string;
  standardCategory: string | null;
  standardText: string | null;
  qualityApplicable: boolean;
  qualityPositive: string;
  qualityNegative: string;
  functionApplicable: boolean;
  functionPositive: string;
  functionNegative: string;
}

interface Slot {
  id: string;
  code: string;
  name: string;
  role: string;
  available: boolean;
  completed: boolean;
  completedAt?: string;
}

interface RoomData {
  room: {
    id: string;
    code: string;
    name: string;
    roomType: { id: string; name: string };
  };
  currentUser: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
  slots: Slot[];
  activities: Activity[];
  dateKey: string;
  scanTime: string;
  existingInspections: any[];
}

export default function RoomInspectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const token = decodeURIComponent(resolvedParams.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<RoomData | null>(null);

  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [checklist, setChecklist] = useState<
    Record<
      string,
      {
        quality: string;
        function: string;
        note: string;
      }
    >
  >({});
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/scan?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Gagal memuat data ruangan.");
        }
        setData(json);

        // Default slot selection
        const availableSlot =
          json.slots.find((s: Slot) => s.available && !s.completed) ||
          json.slots.find((s: Slot) => s.available) ||
          json.slots[0];

        if (availableSlot) {
          setSelectedSlotId(availableSlot.id);
        }

        // Initialize checklist state
        const initialChecklist: Record<string, any> = {};
        json.activities.forEach((act: Activity) => {
          initialChecklist[act.id] = {
            quality: act.qualityApplicable ? "POSITIVE" : "NA",
            function: act.functionApplicable ? "POSITIVE" : "NA",
            note: "",
          };
        });
        setChecklist(initialChecklist);
      })
      .catch((err: any) => {
        setError(err.message || "Gagal memindai token ruangan.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleQualityToggle = (actId: string, val: string) => {
    setChecklist((prev) => ({
      ...prev,
      [actId]: { ...prev[actId], quality: val },
    }));
  };

  const handleFunctionToggle = (actId: string, val: string) => {
    setChecklist((prev) => ({
      ...prev,
      [actId]: { ...prev[actId], function: val },
    }));
  };

  const handleNoteChange = (actId: string, note: string) => {
    setChecklist((prev) => ({
      ...prev,
      [actId]: { ...prev[actId], note },
    }));
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const dirtyCount = Object.values(checklist).filter(
    (item) => item.quality === "NEGATIVE" || item.function === "NEGATIVE"
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !selectedSlotId) return;

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("roomId", data.room.id);
      formData.append("slotId", selectedSlotId);
      formData.append("dateKey", data.dateKey);

      const items = data.activities.map((act) => {
        const state = checklist[act.id] || { quality: "POSITIVE", function: "POSITIVE", note: "" };
        return {
          activityId: act.id,
          qualityResult: state.quality,
          qualityLabel: state.quality === "POSITIVE" ? act.qualityPositive : act.qualityNegative,
          functionResult: state.function,
          functionLabel: state.function === "POSITIVE" ? act.functionPositive : act.functionNegative,
          note: state.note,
        };
      });

      formData.append("items", JSON.stringify(items));
      photos.forEach((p) => {
        formData.append("photos", p.file);
      });

      const res = await fetch("/api/inspections/submit", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.ok) {
        throw new Error(resData.message || "Gagal menyimpan checklist.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/scanner");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat submit data.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-2xl border border-[#d9e4e9] p-3 shadow-md flex items-center justify-center mb-4 relative overflow-hidden">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
            alt="Logo PLN"
            width={38}
            height={48}
            priority
          />
          <div className="absolute inset-x-2 top-0 h-1 bg-[#ffd100] rounded-full animate-bounce" />
        </div>
        <h2 className="text-lg font-bold text-[#17313d]">Memuat Form Checklist...</h2>
        <p className="text-xs text-[#647783] mt-1">Mengidentifikasi ruangan dan indikator 5S</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#d9e4e9] rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 bg-[#fff0ee] text-[#bd2d22] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#17313d]">QR Code Tidak Dikenali</h2>
          <p className="text-xs text-[#647783] mt-2 mb-6 leading-relaxed">
            {error || "Ruangan tidak ditemukan dalam database."}
          </p>
          <button
            onClick={() => router.push("/scanner")}
            className="w-full py-3 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl text-sm transition-all"
          >
            Kembali ke Scanner
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f3f7f9] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#d9e4e9] rounded-2xl p-8 shadow-md">
          <div className="w-16 h-16 bg-[#e7f6ef] text-[#157a55] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-[#17313d]">Checklist Tersimpan!</h2>
          <p className="text-xs text-[#647783] mt-2 mb-6">
            Data kebersihan untuk <strong>{data.room.name}</strong> berhasil direkam dan foto telah disinkronkan.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f5fa] text-[#00577d] rounded-xl text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Mengarahkan kembali...</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedSlot = data.slots.find((s) => s.id === selectedSlotId);

  return (
    <div className="min-h-screen bg-[#f3f7f9] text-[#17313d] pb-28">
      {/* Topbar Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#d9e4e9] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/scanner")}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#00577d] hover:text-[#0076a8]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#17313d]">{data.currentUser.fullName}</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#e8f5fa] text-[#0076a8] font-bold rounded-full uppercase">
              {data.currentUser.role}
            </span>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Room Header Banner (GAS style) */}
        <div className="bg-[#00577d] text-white p-6 rounded-2xl shadow-md mb-6 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold text-[#ffd100] mb-2 uppercase tracking-wide">
                <span>{data.room.roomType.name}</span>
                <span>•</span>
                <span>{data.room.code}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.room.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#ffd100]" />
                  <span>{data.dateKey}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#ffd100]" />
                  <span>Scan: {data.scanTime}</span>
                </span>
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-white/20 pt-3 md:pt-0 md:pl-6 text-left md:text-right">
              <span className="text-[11px] text-white/70 block uppercase font-semibold">Total Indikator</span>
              <strong className="text-2xl font-black text-[#ffd100]">{data.activities.length} Butir 5S</strong>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-36 h-36 border-8 border-[#ffd100]/20 rounded-full pointer-events-none" />
        </div>

        {/* Slot Selector Pills (GAS style) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[#304b57] uppercase tracking-wider mb-2.5">
            Pilih Sesi / Slot Waktu Pemeriksaan:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {data.slots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              const isOfficerSlot = slot.role === "PETUGAS";
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? "bg-[#0076a8] text-white border-[#0076a8] shadow-md ring-2 ring-[#0076a8]/20"
                      : slot.completed
                      ? "bg-[#e7f6ef] border-[#a3e6cb] text-[#157a55]"
                      : "bg-white border-[#d9e4e9] text-[#17313d] hover:border-[#0076a8]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold block uppercase tracking-wider ${
                      isSelected ? "text-[#ffd100]" : "text-[#647783]"
                    }`}
                  >
                    {slot.role}
                  </span>
                  <strong className="text-sm font-bold block mt-0.5">{slot.name}</strong>
                  {slot.completed && (
                    <span
                      className={`text-[10px] font-bold mt-1 inline-flex items-center gap-1 ${
                        isSelected ? "text-white" : "text-[#157a55]"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Selesai</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklist 5S Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {data.activities.map((act, index) => {
              const state = checklist[act.id] || {
                quality: "POSITIVE",
                function: "POSITIVE",
                note: "",
              };
              const isDirty = state.quality === "NEGATIVE" || state.function === "NEGATIVE";

              return (
                <div
                  key={act.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
                    isDirty ? "border-[#bd2d22]/40 bg-[#fffbfb]" : "border-[#d9e4e9]"
                  }`}
                >
                  {/* Activity Head */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#e8f5fa] text-[#00577d] font-black text-sm flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#17313d] leading-snug">{act.name}</h3>

                      {/* 5S Standard Indicator Box (GAS style) */}
                      {act.standardText && (
                        <div className="mt-2 p-2.5 bg-[#f5fafc] border-l-4 border-[#ffd100] rounded-r-xl text-xs text-[#405b67]">
                          <span className="font-bold text-[#00577d] block text-[11px] mb-0.5">
                            {act.standardCategory || "Standar 5S"}:
                          </span>
                          <p className="leading-relaxed">{act.standardText}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2-Way Toggles: Kualitas & Fungsi (GAS style) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#f1f5f9]">
                    {/* Quality Toggle */}
                    {act.qualityApplicable && (
                      <div>
                        <span className="block text-[11px] font-bold text-[#647783] uppercase mb-1.5">
                          Kualitas Fisik:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQualityToggle(act.id, "POSITIVE")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              state.quality === "POSITIVE"
                                ? "bg-[#e7f6ef] border-[#157a55] text-[#157a55] shadow-sm font-black"
                                : "bg-white border-[#d9e4e9] text-[#647783] hover:border-[#157a55]"
                            }`}
                          >
                            ✓ {act.qualityPositive}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQualityToggle(act.id, "NEGATIVE")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              state.quality === "NEGATIVE"
                                ? "bg-[#fff0ee] border-[#bd2d22] text-[#bd2d22] shadow-sm font-black"
                                : "bg-white border-[#d9e4e9] text-[#647783] hover:border-[#bd2d22]"
                            }`}
                          >
                            ✕ {act.qualityNegative}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Function Toggle */}
                    {act.functionApplicable && (
                      <div>
                        <span className="block text-[11px] font-bold text-[#647783] uppercase mb-1.5">
                          Fungsi Sarana:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleFunctionToggle(act.id, "POSITIVE")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              state.function === "POSITIVE"
                                ? "bg-[#e7f6ef] border-[#157a55] text-[#157a55] shadow-sm font-black"
                                : "bg-white border-[#d9e4e9] text-[#647783] hover:border-[#157a55]"
                            }`}
                          >
                            ✓ {act.functionPositive}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFunctionToggle(act.id, "NEGATIVE")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              state.function === "NEGATIVE"
                                ? "bg-[#fff0ee] border-[#bd2d22] text-[#bd2d22] shadow-sm font-black"
                                : "bg-white border-[#d9e4e9] text-[#647783] hover:border-[#bd2d22]"
                            }`}
                          >
                            ✕ {act.functionNegative}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Finding Note (Shows when dirty/rusak) */}
                  {isDirty && (
                    <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
                      <label className="block text-xs font-bold text-[#bd2d22] mb-1">
                        Catatan Temuan / Kerusakan:
                      </label>
                      <input
                        type="text"
                        value={state.note}
                        onChange={(e) => handleNoteChange(act.id, e.target.value)}
                        placeholder="Deskripsikan temuan agar segera ditindaklanjuti..."
                        className="w-full px-3.5 py-2 bg-white border border-[#bd2d22]/40 rounded-xl text-xs text-[#17313d] focus:outline-none focus:ring-2 focus:ring-[#bd2d22]/20"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Photo Evidence Section */}
          <div className="bg-white border border-[#d9e4e9] rounded-2xl p-5 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17313d]">Foto Bukti Lapangan (Evidence)</h3>
                <p className="text-xs text-[#647783] mt-0.5">
                  Lampirkan foto kondisi ruangan sebelum atau sesudah dibersihkan
                </p>
              </div>
              <span className="text-xs font-bold text-[#0076a8] bg-[#e8f5fa] px-2.5 py-1 rounded-full">
                {photos.length} Foto
              </span>
            </div>

            {/* Photo Grid Preview */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#d9e4e9] group">
                  <img src={photo.preview} alt="Evidence" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-[#bd2d22] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#b9cbd3] hover:border-[#0076a8] hover:bg-[#e8f5fa] flex flex-col items-center justify-center text-[#647783] hover:text-[#0076a8] transition-all gap-1"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-bold">Ambil Foto</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoAdd}
              className="hidden"
            />
          </div>

          {/* Sticky Bottom Submit Bar (GAS style) */}
          <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#d9e4e9] p-4 shadow-xl z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#17313d]">
                    Sesi: <strong className="text-[#0076a8]">{selectedSlot?.name || "-"}</strong>
                  </span>
                  {dirtyCount > 0 ? (
                    <span className="text-[11px] font-bold text-[#bd2d22] bg-[#fff0ee] px-2 py-0.5 rounded-full">
                      {dirtyCount} Temuan
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#157a55] bg-[#e7f6ef] px-2 py-0.5 rounded-full">
                      Semua Bersih ✓
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#647783] block mt-0.5">
                  Foto akan otomatis tersimpan di NAS PLN
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="py-3.5 px-6 bg-[#0076a8] hover:bg-[#00577d] text-white font-bold rounded-xl shadow-lg shadow-[#0076a8]/20 flex items-center gap-2 text-sm transition-all active:scale-[0.99] disabled:opacity-60 shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Checklist</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
