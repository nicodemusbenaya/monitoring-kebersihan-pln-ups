"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Printer, Download, QrCode } from "lucide-react";

export default function QRRuanganPage() {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [evalQrImages, setEvalQrImages] = useState<Record<string, string>>({});
  const [qrType, setQrType] = useState<"inspection" | "evaluation">("evaluation");

  useEffect(() => {
    fetch("/api/admin/rooms")
      .then((r) => r.json())
      .then(async (res) => {
        if (res.ok && res.data.rooms) {
          setRoomsData(res.data.rooms);

          const qrs: Record<string, string> = {};
          const evalQrs: Record<string, string> = {};
          const origin = typeof window !== "undefined" ? window.location.origin : "https://monitoring-kebersihan-pln-ups.vercel.app";

          for (const room of res.data.rooms) {
            try {
              // Direct URLs without legacy redirects
              qrs[room.id] = await QRCode.toDataURL(`${origin}/scanner/room/${room.qrToken}`, {
                width: 350,
                margin: 2,
                color: { dark: "#072d3f", light: "#ffffff" },
              });
              evalQrs[room.id] = await QRCode.toDataURL(`${origin}/evaluate/${room.qrToken}`, {
                width: 350,
                margin: 2,
                color: { dark: "#0076a8", light: "#ffffff" },
              });
            } catch (e) {
              console.error(e);
            }
          }
          setQrImages(qrs);
          setEvalQrImages(evalQrs);
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            OPERASIONAL & AKSES PENGUNJUNG
          </span>
          <h2 className="text-3xl font-black text-[#17313d]">Cetak QR Ruangan</h2>
          <p className="text-xs text-[#647783] mt-1">
            QR Code resmi langsung menuju sistem baru (tanpa Google Apps Script & tanpa batasan izin login).
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="inline-flex p-1 bg-[#e2e8f0] rounded-xl">
            <button
              type="button"
              onClick={() => setQrType("evaluation")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                qrType === "evaluation" ? "bg-white text-[#0076a8] shadow-sm" : "text-[#647783]"
              }`}
            >
              ⭐ QR Evaluasi Pengunjung
            </button>
            <button
              type="button"
              onClick={() => setQrType("inspection")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                qrType === "inspection" ? "bg-white text-[#0076a8] shadow-sm" : "text-[#647783]"
              }`}
            >
              📋 QR Checklist Petugas
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0076a8] hover:bg-[#00577d] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Semua Stiker (Print)</span>
          </button>
        </div>
      </div>

      {/* Instructions Banner (Hidden when printing) */}
      <div className="p-4 bg-[#e8f5fa] border border-[#bae6fd] rounded-2xl text-xs text-[#00577d] flex items-start gap-3 print:hidden">
        <QrCode className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong>Perbedaan Kedua Jenis QR Code:</strong>
          <p>
            • <strong>QR Evaluasi Pengunjung</strong>: Mengarah ke formulir ulasan bintang 1–4 untuk tamu/karyawan (Bisa discan langsung lewat kamera HP / Google Lens tanpa perlu login akun apapun).
          </p>
          <p>
            • <strong>QR Checklist Petugas</strong>: Mengarah ke form pengisian checklist 5S kebersihan harian yang digunakan oleh Petugas Cleaning Service & Supervisor.
          </p>
        </div>
      </div>

      {/* QR Grid (Formatted for both Screen & Print A4 Sticker Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-3 print:gap-4">
        {roomsData.map((room) => {
          const currentQr = qrType === "inspection" ? qrImages[room.id] : evalQrImages[room.id];

          return (
            <div
              key={room.id}
              className="bg-white border-2 border-[#cbd5e1] rounded-2xl p-5 text-center shadow-sm space-y-3 print:border-black print:rounded-xl print:p-4 print:break-inside-avoid"
            >
              {/* Header Sticker */}
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-[#0076a8] uppercase block">
                  PLN PUSAT PENDIDIKAN & PELATIHAN
                </span>
                <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded text-[10px] font-bold inline-block">
                  {room.roomType?.name || "RUANGAN"}
                </span>
                <h4 className="text-sm font-black text-[#17313d] leading-snug line-clamp-2 min-h-[38px] flex items-center justify-center">
                  {room.name}
                </h4>
              </div>

              {/* QR Image */}
              {currentQr ? (
                <img
                  src={currentQr}
                  alt={room.name}
                  className="w-40 h-40 mx-auto rounded-xl border border-[#e2e8f0] p-1.5 bg-white shadow-inner print:border-black print:w-36 print:h-36"
                />
              ) : (
                <div className="w-40 h-40 mx-auto rounded-xl bg-[#f8fafc] flex items-center justify-center text-xs text-[#94a3b8]">
                  Membuat QR...
                </div>
              )}

              {/* Footer Instruction */}
              <div className="text-[10px] text-[#647783] leading-tight space-y-0.5 print:text-black">
                <p className="font-bold">
                  {qrType === "evaluation"
                    ? "Pindai untuk Evaluasi Kebersihan"
                    : "Pindai untuk Checklist Kebersihan"}
                </p>
                <p className="text-[9px] text-[#94a3b8] print:text-gray-600 font-mono">
                  ID: {room.code || room.qrToken}
                </p>
              </div>

              {/* Download button (Hidden when printing) */}
              <a
                href={currentQr}
                download={`${qrType === "evaluation" ? "QR_Evaluasi" : "QR_Checklist"}_${room.code || room.name}.png`}
                className="w-full py-2 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 print:hidden"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PNG</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
