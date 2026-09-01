"use client";

import { useEffect, useState, use } from "react";

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
        setRoomData(json.data || json);
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

  if (error || !roomData) {
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
                <span>Evaluasi</span>
              </div>
            </div>
          </div>
        </header>
        <main className="page" style={{ maxWidth: "600px" }}>
          <div className="form-error">{error}</div>
        </main>
      </div>
    );
  }

  if (submitted) {
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
                <span>Ulasan Terkirim</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page" style={{ maxWidth: "520px", paddingTop: "60px", textAlign: "center" }}>
          <section className="panel">
            <div className="panel-body">
              <div style={{ fontSize: "48px", color: "var(--success)", marginBottom: "16px" }}>●</div>
              <h2>Terima Kasih Atas Penilaian Anda!</h2>
              <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>
                Ulasan Anda untuk <strong>{roomData.room.name}</strong> sangat berarti untuk menjaga standar kebersihan di lingkungan PLN UPS.
              </p>
              <div className="notice notice-success">Penilaian telah tersimpan.</div>
            </div>
          </section>
        </main>
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
              <span>Penilaian Pengunjung</span>
            </div>
          </div>
        </div>
      </header>

      <main className="page" style={{ maxWidth: "620px" }}>
        <section className="room-banner">
          <div>
            <div className="eyebrow" style={{ color: "#ffd100" }}>
              EVALUASI KEBERSIHAN
            </div>
            <h1>{roomData.room.name}</h1>
            <p>Bagikan penilaian dan saran Anda terkait kondisi kebersihan ruangan ini.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Bagaimana kondisi kebersihan ruangan ini?</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "8px" }}>
                  {ratingOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRating(opt.value)}
                      className={`btn ${rating === opt.value ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        flexDirection: "column",
                        minHeight: "72px",
                        padding: "8px",
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>{opt.emoji}</span>
                      <span style={{ fontSize: "11px" }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {roomData.aspects && roomData.aspects.length > 0 && (
                <div className="field" style={{ marginTop: "24px" }}>
                  <label>Aspek yang perlu diperhatikan / ditingkatkan:</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {roomData.aspects.map((asp: Aspect) => {
                      const isSelected = selectedAspects.includes(asp.code);
                      return (
                        <button
                          key={asp.id}
                          type="button"
                          onClick={() => toggleAspect(asp.code)}
                          className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                          style={{ borderRadius: "20px" }}
                        >
                          {asp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="field" style={{ marginTop: "24px" }}>
                <label htmlFor="comment">Saran / Masukan Tambahan:</label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tuliskan saran perbaikan jika ada..."
                />
              </div>

              <div style={{ marginTop: "28px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-block"
                >
                  {submitting ? "Mengirim..." : "Kirim Penilaian"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
