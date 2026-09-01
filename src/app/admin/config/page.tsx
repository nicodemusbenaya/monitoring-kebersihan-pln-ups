"use client";

import { useState } from "react";
import { HardDrive, CheckCircle2, RefreshCw } from "lucide-react";

export default function ConfigPage() {
  const [testingNas, setTestingNas] = useState(false);
  const [nasResult, setNasResult] = useState<any>(null);

  const testNasConnection = async () => {
    setTestingNas(true);
    setNasResult(null);
    try {
      const res = await fetch("/api/admin/nas/test").then((r) => r.json());
      setNasResult(res);
    } catch (e: any) {
      setNasResult({ ok: false, message: e.message || "Gagal menghubungkan NAS." });
    } finally {
      setTestingNas(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
          ADMINISTRASI
        </span>
        <h2 className="text-3xl font-black text-[#17313d]">Konfigurasi Sistem</h2>
        <p className="text-xs text-[#647783] mt-1">
          Pengaturan server penyimpanan file bukti foto NAS QNAP dan integrasi sistem.
        </p>
      </div>

      {/* NAS Config Card */}
      <section className="bg-white border border-[#d8e3ea] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e8f5fa] text-[#0076a8] flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-[#17313d]">Penyimpanan NAS QNAP Cloud</h4>
            <p className="text-xs text-[#647783]">Endpoint API WebDAV / File Station untuk menyimpan seluruh foto evidence.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-[#647783] block mb-1">Host URL NAS</label>
            <input
              type="text"
              readOnly
              value="http://nasups01.myqnapcloud.com:18080"
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-mono font-bold text-[#17313d]"
            />
          </div>

          <div>
            <label className="font-bold text-[#647783] block mb-1">Folder Penyimpanan</label>
            <input
              type="text"
              readOnly
              value="/Public/Checklist_Evidence"
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl font-mono font-bold text-[#17313d]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#157a55]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Driver WebDAV & Local Fallback Aktif</span>
          </div>

          <button
            type="button"
            onClick={testNasConnection}
            disabled={testingNas}
            className="px-5 py-2.5 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingNas ? "animate-spin" : ""}`} />
            <span>{testingNas ? "Menguji koneksi..." : "Uji Koneksi NAS"}</span>
          </button>
        </div>

        {nasResult && (
          <div
            className={`p-4 rounded-xl text-xs font-bold ${
              nasResult.ok
                ? "bg-[#e7f6ef] text-[#157a55] border border-[#a7f3d0]"
                : "bg-[#fff0ee] text-[#bd2d22] border border-[#fecaca]"
            }`}
          >
            {nasResult.message || (nasResult.ok ? "Koneksi ke NAS QNAP Berhasil!" : "Gagal terhubung ke NAS.")}
          </div>
        )}
      </section>
    </div>
  );
}
