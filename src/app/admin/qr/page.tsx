"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function QRRuanganPage() {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [evalQrImages, setEvalQrImages] = useState<Record<string, string>>({});
  const [qrType, setQrType] = useState<"inspection" | "evaluation">("inspection");

  useEffect(() => {
    fetch("/api/admin/rooms")
      .then((r) => r.json())
      .then(async (res) => {
        if (res.ok && res.data.rooms) {
          setRoomsData(res.data.rooms);

          const qrs: Record<string, string> = {};
          const evalQrs: Record<string, string> = {};
          const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

          for (const room of res.data.rooms) {
            try {
              qrs[room.id] = await QRCode.toDataURL(`${origin}/checklist/${room.qrToken}`, { width: 300, margin: 2 });
              evalQrs[room.id] = await QRCode.toDataURL(`${origin}/evaluasi/${room.qrToken}`, { width: 300, margin: 2 });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
            OPERASIONAL
          </span>
          <h2 className="text-3xl font-black text-[#17313d]">Cetak QR Ruangan</h2>
          <p className="text-xs text-[#647783] mt-1">
            QR Code resmi untuk ditempel di masing-masing ruangan (Petugas & Pengunjung).
          </p>
        </div>

        <div className="inline-flex p-1 bg-[#e2e8f0] rounded-xl">
          <button
            type="button"
            onClick={() => setQrType("inspection")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              qrType === "inspection" ? "bg-white text-[#0076a8] shadow-sm" : "text-[#647783]"
            }`}
          >
            QR Checklist Petugas
          </button>
          <button
            type="button"
            onClick={() => setQrType("evaluation")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              qrType === "evaluation" ? "bg-white text-[#0076a8] shadow-sm" : "text-[#647783]"
            }`}
          >
            QR Evaluasi Pengunjung
          </button>
        </div>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {roomsData.map((room) => {
          const currentQr = qrType === "inspection" ? qrImages[room.id] : evalQrImages[room.id];

          return (
            <div key={room.id} className="bg-white border border-[#d8e3ea] rounded-2xl p-5 text-center shadow-sm space-y-3">
              <span className="px-2 py-0.5 bg-[#e8f5fa] text-[#0076a8] rounded text-[10px] font-bold">
                {room.roomType?.name}
              </span>
              <h4 className="text-sm font-bold text-[#17313d] truncate">{room.name}</h4>
              {currentQr && (
                <img
                  src={currentQr}
                  alt={room.name}
                  className="w-36 h-36 mx-auto rounded-xl border border-[#d8e3ea] p-1 bg-white"
                />
              )}
              <span className="text-[10px] text-[#94a3b8] font-mono block truncate">
                Token: {room.qrToken}
              </span>
              <a
                href={currentQr}
                download={`${qrType === "inspection" ? "QR_Checklist" : "QR_Evaluasi"}_${room.code}.png`}
                className="block w-full py-2 bg-[#0076a8] hover:bg-[#00577d] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Unduh QR
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
