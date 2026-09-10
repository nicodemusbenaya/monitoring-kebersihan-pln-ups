"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, X } from "lucide-react";
import { AttentionFindingItem, RoomSummaryItem } from "@/types/dashboard";
import { getEvidencePhotoUrl } from "@/lib/evidence";

interface FindingsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  findings: AttentionFindingItem[];
  roomsData: any[];
  onSelectRoomById: (room: RoomSummaryItem) => void;
  onApplyAttentionFilter: () => void;
}

export function FindingsDetailModal({
  isOpen,
  onClose,
  findings,
  roomsData,
  onSelectRoomById,
  onApplyAttentionFilter,
}: FindingsDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-[#d8e3ea] rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between gap-4 bg-gradient-to-r from-[#fff5f5] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#17313d]">
                  Daftar Temuan Rusak & Kotor Hari Ini
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#fee2e2] text-[#dc2626]">
                  {findings.length} Temuan
                </span>
              </div>
              <p className="text-xs text-[#647783] mt-0.5">
                Pemeriksaan yang memiliki indikator catatan kotor atau rusak untuk segera ditindaklanjuti.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#647783] hover:text-[#17313d] flex items-center justify-center transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {findings.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-[#f0fdf4] border border-dashed border-[#86efac] rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-[#17313d]">Semua Fasilitas Terpantau Bersih</h4>
              <p className="text-xs text-[#647783] mt-1 max-w-sm">
                Tidak ada catatan temuan kotor atau rusak pada seluruh pemeriksaan yang telah disubmit hari ini.
              </p>
            </div>
          ) : (
            findings.map((finding, idx) => (
              <div
                key={finding.id || idx}
                className="p-5 rounded-2xl border border-[#fca5a5]/60 bg-[#fffdfd] space-y-3.5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-black/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#17313d]">{finding.roomName}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                        Sesi {finding.slotName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#647783] flex items-center gap-2 mt-1">
                      <span>
                        Petugas: <strong className="text-[#17313d]">{finding.officerName || "Petugas"}</strong>
                      </span>
                      <span>•</span>
                      <span>Pukul {finding.time || "-"} WIB</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      const room = roomsData.find(
                        (r) => r.id === finding.roomId || r.name === finding.roomName
                      );
                      if (room) onSelectRoomById(room);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-[#f1f5f9] text-[#0076a8] border border-[#cbd5e1] rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 self-start sm:self-auto shadow-sm"
                  >
                    Lihat Ruangan <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Finding details breakdown */}
                <div className="space-y-2">
                  {finding.findingDetails && finding.findingDetails.length > 0 ? (
                    finding.findingDetails.map((det, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-3 bg-white rounded-xl border border-[#fee2e2] flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#17313d]">{det.activityName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#fee2e2] text-[#b91c1c]">
                            {det.qualityLabel || det.functionLabel || "Kotor/Rusak"}
                          </span>
                        </div>
                        {det.note && (
                          <p className="text-[11px] text-[#475569] bg-[#fff5f5] p-2 rounded-lg border border-[#fecaca]/50 mt-1">
                            <strong>Catatan Temuan:</strong> {det.note}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-[#fee2e2] text-xs text-[#475569]">
                      {finding.note || "Terdapat temuan kotor/rusak pada pemeriksaan ini."}
                    </div>
                  )}
                </div>

                {/* Photo evidence gallery */}
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#718c99] tracking-wider block mb-2">
                    Foto Bukti Pemeriksaan:
                  </span>
                  {finding.photos && finding.photos.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {finding.photos.map((photoUrl, pIdx) => {
                        const resolvedUrl = getEvidencePhotoUrl(photoUrl);

                        return (
                          <a
                            key={pIdx}
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/photo relative w-20 h-20 rounded-xl overflow-hidden border border-[#d8e3ea] bg-[#f1f5f9] hover:border-[#0076a8] hover:shadow-md transition-all block"
                            title="Klik untuk membuka foto ukuran penuh"
                          >
                            <img
                              src={resolvedUrl}
                              alt={`Evidence ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Lihat ↗
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-[#94a3b8] italic">
                      Tidak ada foto evidence yang dilampirkan pada sesi ini.
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#f1f5f9] bg-[#f8fafc] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onApplyAttentionFilter}
            className="px-4 py-2 bg-white border border-[#d8e3ea] hover:bg-[#f1f5f9] text-[#0076a8] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            Tampilkan di Filter Item Perhatian →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#072d3f] hover:bg-[#0076a8] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
