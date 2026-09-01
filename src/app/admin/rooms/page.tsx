"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function RoomsManagementPage() {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ code: "", name: "", roomTypeId: "", qrToken: "" });

  const loadRooms = async () => {
    try {
      const res = await fetch("/api/admin/rooms").then((r) => r.json());
      if (res.ok) {
        setRoomsData(res.data.rooms);
        setRoomTypes(res.data.roomTypes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await fetch(`/api/admin/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomForm),
        });
      } else {
        await fetch("/api/admin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roomForm),
        });
      }
      setShowRoomModal(false);
      loadRooms();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan ruangan ini?")) return;
    try {
      await fetch(`/api/admin/rooms/${id}`, { method: "DELETE" });
      loadRooms();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            ADMINISTRASI
          </span>
          <h2 className="text-3xl font-black text-[#17313d]">Pengelolaan Data Ruangan</h2>
          <p className="text-xs text-[#647783] mt-1">
            Master 26 ruangan PLN Unit Pelaksana Transmisi (UPS), tipe ruangan, dan token QR.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingRoom(null);
            setRoomForm({ code: "", name: "", roomTypeId: roomTypes[0]?.id || "", qrToken: "" });
            setShowRoomModal(true);
          }}
          className="px-4 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Ruangan</span>
        </button>
      </div>

      {/* Rooms Table */}
      <div className="bg-white border border-[#d8e3ea] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8fafc] border-b border-[#d8e3ea] text-[#647783] font-bold">
            <tr>
              <th className="p-4 w-12 text-center">No</th>
              <th className="p-4">Kode Ruangan</th>
              <th className="p-4">Nama Ruangan</th>
              <th className="p-4">Tipe / Template</th>
              <th className="p-4">Token QR</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {roomsData.map((r, idx) => (
              <tr key={r.id} className="hover:bg-[#f8fafc]">
                <td className="p-4 text-center text-[#94a3b8] font-bold">{idx + 1}</td>
                <td className="p-4 font-mono font-bold text-[#0076a8]">{r.code}</td>
                <td className="p-4 font-bold text-[#17313d]">{r.name}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#e8f5fa] text-[#0076a8]">
                    {r.roomType?.name}
                  </span>
                </td>
                <td className="p-4 font-mono text-[11px] text-[#647783]">{r.qrToken}</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#157a55]">
                    <span className="w-2 h-2 rounded-full bg-[#157a55]"></span>
                    <span>Aktif</span>
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoom(r);
                        setRoomForm({ code: r.code, name: r.name, roomTypeId: r.roomTypeId, qrToken: r.qrToken });
                        setShowRoomModal(true);
                      }}
                      className="p-1.5 text-[#0076a8] hover:bg-[#e8f5fa] rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(r.id)}
                      className="p-1.5 text-[#bd2d22] hover:bg-[#fff0ee] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Room Form */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#17313d]">
              {editingRoom ? "Edit Ruangan" : "Tambah Ruangan Baru"}
            </h3>

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

              <div>
                <label className="font-bold text-[#647783] block mb-1">Tipe Ruangan</label>
                <select
                  value={roomForm.roomTypeId}
                  onChange={(e) => setRoomForm({ ...roomForm, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold"
                >
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#647783] block mb-1">Token QR</label>
                <input
                  type="text"
                  required
                  value={roomForm.qrToken}
                  onChange={(e) => setRoomForm({ ...roomForm, qrToken: e.target.value })}
                  placeholder="Contoh: qr_r01"
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 bg-[#f1f5f9] text-[#647783] rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl font-bold shadow-md"
                >
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
