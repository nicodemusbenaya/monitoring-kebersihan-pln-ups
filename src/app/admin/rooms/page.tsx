"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, EyeOff, Eye, ArrowUpDown, Layers, ClipboardList } from "lucide-react";
import { AppDropdown } from "@/components/AppDropdown";

type TabKey = "RUANGAN" | "DISEMBUNYIKAN" | "TEMPLATE" | "INDIKATOR";

export default function RoomsManagementPage() {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("RUANGAN");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ code: "", name: "", roomTypeId: "", qrToken: "" });
  const [loading, setLoading] = useState(true);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rooms").then((r) => r.json());
      if (res.ok) {
        setRoomsData(res.data.rooms || []);
        setRoomTypes(res.data.roomTypes || []);
        setActivities(res.data.activities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleRooms = useMemo(() => roomsData.filter((r) => !r.hidden), [roomsData]);
  const hiddenRooms = useMemo(() => roomsData.filter((r) => r.hidden), [roomsData]);

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRoom ? `/api/admin/rooms` : `/api/admin/rooms`;
      const method = editingRoom ? "PUT" : "POST";
      const body = editingRoom ? { id: editingRoom.id, ...roomForm } : roomForm;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Gagal menyimpan");
      setShowRoomModal(false);
      setEditingRoom(null);
      await load();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan");
    }
  };

  const handleToggleHidden = async (room: any) => {
    const action = room.hidden ? "menampilkan kembali" : "menyembunyikan";
    if (!confirm(`Yakin ingin ${action} ruangan "${room.name}"? ${!room.hidden ? "Ruangan tetap bisa menerima data tapi dikecualikan dari semua chart Ringkasan." : ""}`)) return;
    setTogglingId(room.id);
    try {
      const res = await fetch("/api/admin/rooms/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: room.id, hidden: !room.hidden }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message);
      await load();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleReorder = async () => {
    setReorderLoading(true);
    try {
      const orderedIds = [...roomsData].sort((a, b) => a.sortOrder - b.sortOrder).map((r) => r.id);
      // compact sortOrder sequentially
      const res = await fetch("/api/admin/rooms/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message);
      await load();
    } catch (err: any) {
      alert(err.message || "Gagal merapikan urutan");
    } finally {
      setReorderLoading(false);
    }
  };

  // Group activities by roomType for Indikator tab
  const activitiesByType = useMemo(() => {
    const map = new Map<string, any[]>();
    roomTypes.forEach((rt) => map.set(rt.id, []));
    activities.forEach((a) => {
      const list = map.get(a.roomTypeId) || [];
      list.push(a);
      map.set(a.roomTypeId, list);
    });
    return map;
  }, [roomTypes, activities]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1a7daa] block mb-1">DATA MASTER</span>
        <h2 className="text-[28px] font-black tracking-tight text-[#17313d] leading-none">Pengelolaan aplikasi</h2>
        <p className="text-[13px] text-[#647783] mt-1.5">Pilih jenis data yang ingin dikelola. Setiap daftar kini memiliki ruang kerja sendiri.</p>
      </div>

      {/* Tabs */}
      <div className="bg-[#eef6fb] border border-[#d8e3ea] rounded-2xl p-1.5 flex flex-wrap gap-1.5">
        {[
          { key: "RUANGAN" as TabKey, label: "Ruangan", count: visibleRooms.length },
          { key: "DISEMBUNYIKAN" as TabKey, label: "Disembunyikan", count: hiddenRooms.length },
          { key: "TEMPLATE" as TabKey, label: "Template", count: roomTypes.length },
          { key: "INDIKATOR" as TabKey, label: "Indikator", count: activities.length },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                isActive
                  ? "bg-white text-[#0f5a7f] shadow-sm border border-[#d8e3ea]"
                  : "text-[#5f7d8e] hover:text-[#17313d] hover:bg-white/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`min-w-[28px] h-6 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-black ${
                  isActive ? "bg-[#1a7daa] text-white" : "bg-[#e1ecf2] text-[#5f7d8e]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content container */}
      <div className="bg-white border border-[#d8e3ea] rounded-3xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eef2f6]">
          <div>
            <h3 className="text-[15px] font-black text-[#17313d]">
              {activeTab === "RUANGAN" && "Daftar ruangan"}
              {activeTab === "DISEMBUNYIKAN" && "Ruangan disembunyikan"}
              {activeTab === "TEMPLATE" && "Daftar template"}
              {activeTab === "INDIKATOR" && "Daftar indikator"}
            </h3>
            <p className="text-xs text-[#8aa0ad] mt-0.5">
              {activeTab === "RUANGAN" && "Ruangan yang dapat dibuka melalui QR dan digunakan pada pemeriksaan."}
              {activeTab === "DISEMBUNYIKAN" && "Ruangan tetap menerima data tetapi dikecualikan dari semua chart Ringkasan & ekspor."}
              {activeTab === "TEMPLATE" && "Template menentukan slot pemeriksaan dan lembar Excel yang dipakai."}
              {activeTab === "INDIKATOR" && `${activities.length} indikator aktif yang dipakai pada checklist kebersihan.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeTab === "RUANGAN" && (
              <>
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={reorderLoading}
                  className="px-4 py-2.5 bg-white border border-[#cbdde6] hover:border-[#1a7daa] hover:text-[#1a7daa] rounded-xl text-xs font-bold text-[#17313d] flex items-center gap-2 transition-all disabled:opacity-60"
                >
                  <ArrowUpDown className={`w-3.5 h-3.5 ${reorderLoading ? "animate-spin" : ""}`} />
                  <span>{reorderLoading ? "Merapikan..." : "Rapikan urutan"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomForm({ code: "", name: "", roomTypeId: roomTypes[0]?.id || "", qrToken: "" });
                    setShowRoomModal(true);
                  }}
                  className="px-5 py-2.5 bg-[#1a7daa] hover:bg-[#14648c] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah ruangan</span>
                </button>
              </>
            )}
            {activeTab === "DISEMBUNYIKAN" && hiddenRooms.length > 0 && (
              <span className="px-3 py-1.5 bg-[#fff7ed] border border-[#fed7aa] rounded-xl text-xs font-bold text-[#9a3412]">{hiddenRooms.length} ruangan disembunyikan</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-[#f8fbfc]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-[#eef4f8] animate-pulse border border-[#e2eef4]" />
              ))}
            </div>
          ) : activeTab === "RUANGAN" ? (
            visibleRooms.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 rounded-2xl bg-[#e8f3f8] text-[#1a7daa] flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#17313d]">Belum ada ruangan aktif</p>
                <p className="text-xs text-[#8aa0ad] mt-1">Tambah ruangan baru atau tampilkan kembali dari tab Disembunyikan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleRooms
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((r) => (
                    <div key={r.id} className="bg-white border border-[#dde8ef] rounded-2xl p-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13px] font-extrabold text-[#17313d] leading-tight truncate">{r.name}</h4>
                        <p className="text-[11px] text-[#8aa0ad] mt-0.5">
                          Urutan {r.sortOrder} · {r.roomType?.name || r.roomTypeId}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0e7a3a] mr-1">
                          <span className="w-2 h-2 rounded-full bg-[#12a74a] shadow-[0_0_0_3px_rgba(16,167,74,0.15)]" />
                          Aktif
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoom(r);
                            setRoomForm({ code: r.code, name: r.name, roomTypeId: r.roomTypeId, qrToken: r.qrToken });
                            setShowRoomModal(true);
                          }}
                          className="px-3 py-1.5 bg-white border border-[#cbdde6] hover:border-[#1a7daa] hover:text-[#1a7daa] text-[#1a5a7d] rounded-full text-xs font-bold transition-colors"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHidden(r)}
                          disabled={togglingId === r.id}
                          className="px-3 py-1.5 bg-white border border-[#cbdde6] hover:border-[#b45309] hover:text-[#92400e] text-[#5f7d8e] rounded-full text-xs font-bold transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          {togglingId === r.id ? "..." : "Sembunyikan"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : activeTab === "DISEMBUNYIKAN" ? (
            hiddenRooms.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] text-[#94a3b8] flex items-center justify-center mx-auto mb-3">
                  <Eye className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#17313d]">Tidak ada ruangan disembunyikan</p>
                <p className="text-xs text-[#8aa0ad] mt-1">Ruangan yang disembunyikan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hiddenRooms
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13px] font-extrabold text-[#78350f] leading-tight truncate">{r.name}</h4>
                        <p className="text-[11px] text-[#a16207] mt-0.5">
                          Urutan {r.sortOrder} · {r.roomType?.name || r.roomTypeId} · Dikecualikan dari Ringkasan
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#92400e] mr-1">
                          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                          Disembunyikan
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleHidden(r)}
                          disabled={togglingId === r.id}
                          className="px-3 py-1.5 bg-white border border-[#f59e0b] text-[#92400e] hover:bg-[#fff7ed] rounded-full text-xs font-bold transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {togglingId === r.id ? "..." : "Tampilkan"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : activeTab === "TEMPLATE" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roomTypes
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((t) => {
                  const roomCount = roomsData.filter((r) => r.roomTypeId === t.id).length;
                  const actCount = activities.filter((a) => a.roomTypeId === t.id).length;
                  return (
                    <div key={t.id} className="bg-white border border-[#dde8ef] rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#e8f3f8] text-[#1a7daa] flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${t.active ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                          {t.active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-[#17313d] mt-3">{t.name}</h4>
                      <p className="text-xs text-[#8aa0ad] mt-0.5">Sheet: {t.templateSheet} · {t.workDays} hari kerja</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#475569] text-xs font-bold">{roomCount} ruangan</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#475569] text-xs font-bold">{actCount} indikator</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            // INDIKATOR
            <div className="space-y-6">
              {roomTypes.map((rt) => {
                const list = activitiesByType.get(rt.id) || [];
                if (list.length === 0) return null;
                return (
                  <div key={rt.id} className="bg-white border border-[#dde8ef] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-[#f8fbfc] border-b border-[#eef2f6] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-[#1a7daa]" />
                        <h4 className="text-sm font-black text-[#17313d]">{rt.name}</h4>
                        <span className="px-2 py-0.5 bg-white border border-[#dde8ef] rounded-full text-xs font-bold text-[#5f7d8e]">{list.length} indikator</span>
                      </div>
                      <span className="text-[11px] text-[#8aa0ad]">{rt.templateSheet}</span>
                    </div>
                    <div className="divide-y divide-[#f1f5f9]">
                      {list
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((a, idx) => (
                          <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[#f8fbfc]">
                            <span className="w-6 h-6 rounded-full bg-[#eef6fb] text-[#1a7daa] flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-[#17313d] leading-tight">{a.name}</p>
                              <p className="text-[11px] text-[#8aa0ad] mt-0.5 truncate">
                                {a.standardCategory ? `${a.standardCategory} · ` : ""}
                                {a.standardText || `${a.qualityPositive}/${a.qualityNegative} · ${a.functionPositive}/${a.functionNegative}`}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${a.active ? "bg-[#f1f5f9] text-[#475569]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>{a.active ? "Aktif" : "Nonaktif"}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
              {activities.length === 0 && <p className="text-center py-10 text-sm text-[#8aa0ad]">Belum ada indikator.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Modal Room Form (shared for Ruangan tab) */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#17313d]">{editingRoom ? "Ubah Ruangan" : "Tambah Ruangan Baru"}</h3>
            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#647783] block mb-1">Kode Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.code}
                  onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                  placeholder="Contoh: R-01"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-[#647783] block mb-1">Nama Ruangan</label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Contoh: Ruang Senior Manager"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold"
                />
              </div>
              <AppDropdown
                label="Tipe Ruangan"
                value={roomForm.roomTypeId}
                onChange={(v) => setRoomForm({ ...roomForm, roomTypeId: v })}
                options={roomTypes.map((t: any) => ({ value: t.id, label: t.name }))}
                placeholder="Pilih tipe"
              />
              <div>
                <label className="font-bold text-[#647783] block mb-1">Token QR</label>
                <input
                  type="text"
                  value={roomForm.qrToken}
                  onChange={(e) => setRoomForm({ ...roomForm, qrToken: e.target.value })}
                  placeholder="Kosongkan untuk auto-generate"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowRoomModal(false)} className="px-4 py-2 bg-[#f1f5f9] text-[#647783] rounded-xl font-bold">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1a7daa] hover:bg-[#14648c] text-white rounded-xl font-bold shadow-md">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
