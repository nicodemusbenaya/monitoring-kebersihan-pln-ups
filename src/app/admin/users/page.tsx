"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { AppDropdown } from "@/components/AppDropdown";

export default function UsersManagementPage() {
  const [usersData, setUsersData] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: "", fullName: "", role: "PETUGAS", password: "" });

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users").then((r) => r.json());
      if (res.ok && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.users || [];
        setUsersData(list);
      }
    } catch (e) {
      console.error("Gagal memuat pengguna:", e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (editingUser) {
        res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        }).then((r) => r.json());
      } else {
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userForm),
        }).then((r) => r.json());
      }

      if (res && res.ok) {
        alert(editingUser ? "Data & password pengguna berhasil diperbarui!" : "Pengguna baru berhasil ditambahkan!");
        setShowUserModal(false);
        loadUsers();
      } else {
        alert(res?.message || "Gagal menyimpan pengguna.");
      }
    } catch (e) {
      console.error("Gagal menyimpan pengguna:", e);
      alert("Terjadi kesalahan koneksi saat menyimpan pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan pengguna ini?")) return;
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (e) {
      console.error("Gagal menghapus pengguna:", e);
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
          <h2 className="text-3xl font-black text-[#17313d]">Kelola Pengguna</h2>
          <p className="text-xs text-[#647783] mt-1">
            Daftar akun petugas kebersihan, supervisor pengawas, dan administrator.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setUserForm({ username: "", fullName: "", role: "PETUGAS", password: "" });
            setShowUserModal(true);
          }}
          className="px-4 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#d8e3ea] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8fafc] border-b border-[#d8e3ea] text-[#647783] font-bold">
            <tr>
              <th className="p-4">Nama Lengkap</th>
              <th className="p-4">Username</th>
              <th className="p-4">Peran (Role)</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {(usersData || []).map((u) => (
              <tr key={u.id} className="hover:bg-[#f8fafc]">
                <td className="p-4 font-bold text-[#17313d]">{u.fullName}</td>
                <td className="p-4 font-mono text-[#647783]">{u.username}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      u.role === "ADMIN"
                        ? "bg-[#072d3f] text-[#ffd100]"
                        : u.role === "SUPERVISOR"
                        ? "bg-[#f3e8ff] text-[#7e22ce]"
                        : "bg-[#e8f5fa] text-[#0076a8]"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
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
                        setEditingUser(u);
                        setUserForm({ username: u.username, fullName: u.fullName, role: u.role, password: "" });
                        setShowUserModal(true);
                      }}
                      className="p-1.5 text-[#0076a8] hover:bg-[#e8f5fa] rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
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

      {/* Modal User Form */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#17313d]">
              {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#647783] block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#647783] block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold font-mono"
                />
              </div>

              <AppDropdown
                label="Peran (Role)"
                value={userForm.role}
                onChange={(v) => setUserForm({ ...userForm, role: v })}
                options={[
                  { value: "PETUGAS", label: "PETUGAS (Cleaning Service)" },
                  { value: "SUPERVISOR", label: "SUPERVISOR (Pengawas)" },
                  { value: "ADMIN", label: "ADMIN (Administrator)" },
                ]}
              />

              <div>
                <label className="font-bold text-[#647783] block mb-1">
                  Password {editingUser && "(kosongkan bila tidak diubah)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
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
