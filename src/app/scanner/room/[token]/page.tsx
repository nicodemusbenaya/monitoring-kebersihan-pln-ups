"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";

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
  officerName?: string;
  overallStatus?: string;
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

        // Auto select slot
        const availableSlot =
          json.slots.find((s: Slot) => s.available && !s.completed) ||
          json.slots.find((s: Slot) => s.available) ||
          json.slots[0];

        if (availableSlot) {
          setSelectedSlotId(availableSlot.id);
        }

        // Initialize checklist
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

  const handleQualityChange = (actId: string, val: string) => {
    setChecklist((prev) => ({
      ...prev,
      [actId]: { ...prev[actId], quality: val },
    }));
  };

  const handleFunctionChange = (actId: string, val: string) => {
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

async function compressImageFile(file: File, maxWidth = 1280, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles = Array.from(e.target.files);
    try {
      const compressedList = await Promise.all(rawFiles.map((f) => compressImageFile(f)));
      const newPhotos = compressedList.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      console.error("Compression error:", err);
      const fallbackPhotos = rawFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPhotos((prev) => [...prev, ...fallbackPhotos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

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

      let resData: any = {};
      try {
        resData = await res.json();
      } catch {
        if (res.status === 413) {
          throw new Error("Ukuran foto terlalu besar. Sistem telah mengompresi foto otomatis, silakan coba unggah kembali.");
        }
        throw new Error(`Server merespons status ${res.status}`);
      }

      if (!res.ok || !resData.ok) {
        throw new Error(resData.message || "Gagal menyimpan checklist.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/scanner");
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat submit data.");
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="initial-loader">
          <div className="brand-mark">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
            />
          </div>
          <div className="skeleton-line wide"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-shell">
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
                <span>Kesalahan</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page">
          <section className="panel">
            <div className="panel-body">
              <div className="form-error">{error || "Ruangan tidak ditemukan."}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push("/scanner")}
              >
                Kembali ke Pemindai
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="app-shell">
        <main className="page" style={{ maxWidth: "480px", paddingTop: "80px", textAlign: "center" }}>
          <section className="panel">
            <div className="panel-body" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => router.push("/scanner")}
                aria-label="Tutup"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: "32px",
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: "48px", color: "var(--success)", marginBottom: "16px" }}>●</div>
              <h2>Pemeriksaan Berhasil Disimpan!</h2>
              <p style={{ color: "var(--muted)", margin: "8px 0 24px" }}>
                Data checklist untuk <strong>{data.room.name}</strong> telah berhasil direkam ke dalam sistem dan foto evidence tersimpan di NAS.
              </p>
              <div className="notice notice-success">Otomatis kembali ke pemindai dalam 5 detik — atau tekan Tutup.</div>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/scanner")}>
                Tutup & Kembali ke Pemindai
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const selectedSlot = data.slots.find((s) => s.id === selectedSlotId);
  const dirtyCount = Object.values(checklist).filter(
    (item) => item.quality === "NEGATIVE" || item.function === "NEGATIVE"
  ).length;

  return (
    <div className="app-shell">
      {/* Header (GAS style) */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
              alt="Logo PLN"
            />
            <span className="brand-divider"></span>
            <div className="topbar-title">
              <strong>{data.room.name}</strong>
              <span>{selectedSlot ? `${selectedSlot.name} • ${data.dateKey}` : data.dateKey}</span>
            </div>
          </div>

          <div className="user-area">
            <div className="user-copy">
              <strong>{data.currentUser.fullName}</strong>
              <span>{data.currentUser.role}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push("/scanner")}>
              Ganti Ruangan
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="page">
        {/* Room Banner (GAS style) */}
        <section className="room-banner">
          <div>
            <div className="eyebrow" style={{ color: "#ffd100" }}>
              {(data.room.roomType?.name || data.room.name || "RUANGAN").toUpperCase()}
            </div>
            <h1>{data.room.name}</h1>
            <p>Pilih slot waktu pemeriksaan untuk memulai checklist standar 5S.</p>
          </div>
          <div className="scan-box">
            <span>Waktu Scan</span>
            <strong>{data.scanTime}</strong>
          </div>
        </section>

        {error && <div className="notice notice-danger">{error}</div>}

        {/* Slot Choice Panel (GAS style) */}
        <section className="panel">
          <div className="panel-head">
            <h2>Pilih slot waktu</h2>
          </div>
          <div className="panel-body">
            <div className="slot-choice-list">
              {data.slots.map((slot) => {
                const isSelected = slot.id === selectedSlotId;
                const done = slot.completed;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`slot-choice ${done ? "completed" : "available"}`}
                    style={
                      isSelected
                        ? { borderColor: "var(--pln-blue)", background: "var(--pln-blue-soft)" }
                        : {}
                    }
                  >
                    <span className="slot-choice-copy">
                      <strong>{slot.name}</strong>
                      <small>
                        {done
                          ? `Sudah diisi • ${slot.role}`
                          : `Tersedia untuk ${slot.role}`}
                      </small>
                    </span>
                    <span className="slot-choice-end">
                      {done ? (
                        <span className="badge badge-clean">Selesai</span>
                      ) : (
                        <>
                          <strong>Isi sekarang</strong>
                          <span aria-hidden="true">→</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Checklist Form */}
        <form onSubmit={handleSubmit}>
          <div className="checklist">
            {data.activities.map((act, index) => {
              const state = checklist[act.id] || {
                quality: "POSITIVE",
                function: "POSITIVE",
                note: "",
              };
              const isDirty = state.quality === "NEGATIVE" || state.function === "NEGATIVE";

              return (
                <section
                  key={act.id}
                  className={`activity-card ${isDirty ? "is-dirty" : ""}`}
                  data-activity-id={act.id}
                >
                  <div className="activity-head">
                    <div className="activity-number">{index + 1}</div>
                    <div className="activity-heading-copy">
                      <div className="activity-name">{act.name}</div>
                      {act.standardText && (
                        <div className="activity-standard">
                          <div className="activity-standard-label">
                            {act.standardCategory || "Standar 5S"}
                            <span>• Standar Kebersihan</span>
                          </div>
                          <p>{act.standardText}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2-Way Toggles (GAS style) */}
                  <div className="activity-choices">
                    {/* Quality Choice */}
                    {act.qualityApplicable && (
                      <div className="choice-row">
                        <span className="choice-label">Aktivitas / kualitas</span>
                        <div className="choice-group">
                          <div className="choice clean">
                            <input
                              type="radio"
                              id={`q-pos-${act.id}`}
                              name={`quality-${act.id}`}
                              checked={state.quality === "POSITIVE"}
                              onChange={() => handleQualityChange(act.id, "POSITIVE")}
                            />
                            <label htmlFor={`q-pos-${act.id}`}>{act.qualityPositive}</label>
                          </div>
                          <div className="choice dirty">
                            <input
                              type="radio"
                              id={`q-neg-${act.id}`}
                              name={`quality-${act.id}`}
                              checked={state.quality === "NEGATIVE"}
                              onChange={() => handleQualityChange(act.id, "NEGATIVE")}
                            />
                            <label htmlFor={`q-neg-${act.id}`}>{act.qualityNegative}</label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Function Choice */}
                    {act.functionApplicable && (
                      <div className="choice-row">
                        <span className="choice-label">Fungsi / kondisi</span>
                        <div className="choice-group">
                          <div className="choice clean">
                            <input
                              type="radio"
                              id={`f-pos-${act.id}`}
                              name={`func-${act.id}`}
                              checked={state.function === "POSITIVE"}
                              onChange={() => handleFunctionChange(act.id, "POSITIVE")}
                            />
                            <label htmlFor={`f-pos-${act.id}`}>{act.functionPositive}</label>
                          </div>
                          <div className="choice dirty">
                            <input
                              type="radio"
                              id={`f-neg-${act.id}`}
                              name={`func-${act.id}`}
                              checked={state.function === "NEGATIVE"}
                              onChange={() => handleFunctionChange(act.id, "NEGATIVE")}
                            />
                            <label htmlFor={`f-neg-${act.id}`}>{act.functionNegative}</label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Finding Note (GAS style finding-fields) */}
                  <div className="finding-fields">
                    <div className="field" style={{ gridColumn: "1 / -1", margin: 0 }}>
                      <label>Catatan temuan</label>
                      <textarea
                        value={state.note}
                        onChange={(e) => handleNoteChange(act.id, e.target.value)}
                        placeholder="Deskripsikan temuan agar segera ditindaklanjuti..."
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Photo Evidence Panel (GAS style) */}
          <section className="panel" style={{ marginTop: "24px" }}>
            <div className="panel-head">
              <h2>Foto bukti pemeriksaan</h2>
              <span className="badge badge-neutral">{photos.length} Foto</span>
            </div>
            <div className="panel-body">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      width: "100px",
                      height: "100px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <img
                      src={photo.preview}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        border: 0,
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Tambah Foto Evidence
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoAdd}
                style={{ display: "none" }}
              />
            </div>
          </section>

          {/* Sticky Submit Bar (GAS style) */}
          <div className="submit-bar">
            <div>
              <p>
                Sesi: <strong>{selectedSlot?.name || "-"}</strong> •{" "}
                {dirtyCount > 0 ? `${dirtyCount} temuan kotor/rusak` : "Semua bersih"}
              </p>
              <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                Semua foto otomatis tersimpan aman di NAS PLN
              </small>
            </div>

            <button
              id="submit-button"
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? "Menyimpan..." : "Simpan Pemeriksaan"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
