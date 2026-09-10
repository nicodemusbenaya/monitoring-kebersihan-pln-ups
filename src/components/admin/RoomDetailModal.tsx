"use client";

import React from "react";
import { Camera, CheckCircle2, Clock, ExternalLink, X, ZoomIn } from "lucide-react";
import { LatestEvidencePhoto, RoomSummaryItem } from "@/types/dashboard";
import { getEvidencePhotoUrl } from "@/lib/evidence";

interface RoomDetailModalProps {
  room: RoomSummaryItem | null;
  displayDate: string;
  onClose: () => void;
  onOpenPhotoLightbox: (photo: LatestEvidencePhoto) => void;
}

export function RoomDetailModal({
  room,
  displayDate,
  onClose,
  onOpenPhotoLightbox,
}: RoomDetailModalProps) {
  if (!room) return null;

  const isGreen = room.status === "COMPLETE";
  const isPurple = room.status === "WAITING_SPV";
  const isYellow = room.status === "PARTIAL";

  let statusBadge = (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#f1f5f9] text-[#647783]">
      Belum Ada Data
    </span>
  );
  if (isGreen) {
    statusBadge = (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#dcfce7] text-[#15803d]">
        Lengkap
      </span>
    );
  } else if (isPurple) {
    statusBadge = (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#f3e8ff] text-[#7e22ce]">
        Menunggu SPV
      </span>
    );
  } else if (isYellow) {
    statusBadge = (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#fef3c7] text-[#b45309]">
        Sebagian
      </span>
    );
  }

  const roomTotalPhotos = (room.slots || []).reduce(
    (acc: number, s) => acc + (s.inspection?.photos?.length || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#d8e3ea] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#f1f5f9] flex items-start justify-between gap-4 bg-gradient-to-r from-[#f8fafc] to-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0076a8]/10 text-[#0076a8]">
                {room.roomTypeName}
              </span>
              <span className="text-xs font-mono font-bold text-[#94a3b8]">
                {room.code}
              </span>
              {statusBadge}
            </div>
            <h3 className="text-xl font-black text-[#17313d]">{room.name}</h3>
            <p className="text-xs text-[#647783]">
              Detail status pemeriksaan dan temuan hari ini ({displayDate})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#647783] hover:text-[#17313d] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
              <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">
                Pemeriksaan
              </span>
              <div className="text-lg font-black text-[#17313d] mt-0.5">
                {room.completedSlots} / {room.totalSlots}
                <span className="text-xs font-semibold text-[#94a3b8] ml-1">Sesi</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
              <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">
                Temuan Kotor / Rusak
              </span>
              <div
                className={`text-lg font-black mt-0.5 ${
                  room.dirtyCount > 0 ? "text-[#b91c1c]" : "text-[#157a55]"
                }`}
              >
                {room.dirtyCount}
                <span className="text-xs font-semibold text-[#94a3b8] ml-1">Item</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
              <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">
                Foto Evidence
              </span>
              <div
                className={`text-lg font-black mt-0.5 flex items-center gap-1.5 ${
                  roomTotalPhotos > 0 ? "text-[#0076a8]" : "text-[#94a3b8]"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{roomTotalPhotos}</span>
                <span className="text-xs font-semibold text-[#94a3b8]">Foto</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
              <span className="text-[10px] font-bold text-[#647783] block uppercase tracking-wider">
                Peran Selesai
              </span>
              <div className="text-xs font-black text-[#17313d] mt-1 space-y-0.5">
                <div>
                  Petugas:{" "}
                  <span className="font-bold text-[#0076a8]">
                    {room.petugasFinished}/{room.petugasTotal}
                  </span>
                </div>
                <div>
                  SPV:{" "}
                  <span className="font-bold text-[#7e22ce]">
                    {room.spvFinished}/{room.spvTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Slot List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#718c99]">
              Jadwal & Sesi Pemeriksaan Hari Ini
            </h4>

            <div className="space-y-3">
              {(room.slots || []).map((slot) => {
                const isDone = slot.completed;
                const insp = slot.inspection;
                const slotPhotos = insp?.photos || [];

                return (
                  <div
                    key={slot.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDone
                        ? insp?.overallStatus === "ADA_TEMUAN"
                          ? "bg-[#fffbeb] border-[#f59e0b]/40 shadow-xs"
                          : "bg-[#f0fdf4] border-[#10b981]/40 shadow-xs"
                        : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isDone
                              ? insp?.overallStatus === "ADA_TEMUAN"
                                ? "bg-[#f59e0b]/15 text-[#b45309]"
                                : "bg-[#10b981]/15 text-[#15803d]"
                              : "bg-[#94a3b8]/15 text-[#94a3b8]"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-black text-[#17313d]">
                              {slot.name} ({slot.code})
                            </strong>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#e2e8f0] text-[#475569]">
                              {slot.role}
                            </span>
                          </div>
                          {isDone && insp ? (
                            <div className="text-[11px] text-[#647783] flex items-center gap-2 mt-0.5">
                              <span>
                                Oleh: <strong className="text-[#17313d]">{insp.inspectorName}</strong>
                              </span>
                              <span>•</span>
                              <span>{insp.displayTime}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">
                              Belum diisi oleh {slot.role.toLowerCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {isDone && insp && (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            insp.overallStatus === "ADA_TEMUAN"
                              ? "bg-[#fef3c7] text-[#b45309]"
                              : "bg-[#dcfce7] text-[#15803d]"
                          }`}
                        >
                          {insp.overallStatus === "ADA_TEMUAN"
                            ? `${insp.dirtyCount} Temuan`
                            : "Bersih"}
                        </span>
                      )}
                    </div>

                    {/* Findings list if any */}
                    {isDone && insp?.findings && insp.findings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-[#b91c1c] block tracking-wider">
                          Daftar Temuan:
                        </span>
                        <div className="space-y-1">
                          {insp.findings.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="text-xs bg-white/80 p-2 rounded-xl border border-[#f59e0b]/30 flex flex-col gap-0.5 text-[#17313d]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{f.activityName}</span>
                                <span className="text-[10px] font-bold text-[#b91c1c]">
                                  {f.qualityLabel || f.functionLabel || "Kotor/Rusak"}
                                </span>
                              </div>
                              {f.note && (
                                <p className="text-[11px] text-[#647783] italic">
                                  &ldquo;{f.note}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence Photos Gallery */}
                    {isDone && insp && (
                      <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-[#718c99] tracking-wider flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#0076a8]" />
                            Foto Bukti Evidence ({slotPhotos.length})
                          </span>
                          {slotPhotos.length > 0 && (
                            <span className="text-[10px] text-[#0076a8] font-bold">
                              Klik foto untuk perbesar
                            </span>
                          )}
                        </div>

                        {slotPhotos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                            {slotPhotos.map((photo, pIdx) => {
                              const photoUrl = getEvidencePhotoUrl(photo.fileUrl);

                              return (
                                <div
                                  key={pIdx}
                                  onClick={() =>
                                    onOpenPhotoLightbox({
                                      id: `${insp.id}-${pIdx}`,
                                      fileName: photo.fileName || `evidence-${pIdx + 1}.jpg`,
                                      fileUrl: photo.fileUrl,
                                      roomName: room.name,
                                      roomCode: room.code,
                                      slotName: slot.name,
                                      slotCode: slot.code,
                                      slotRole: slot.role,
                                      officerName: insp.inspectorName,
                                      overallStatus: insp.overallStatus,
                                      dirtyCount: insp.dirtyCount,
                                      displayTime: insp.displayTime,
                                    })
                                  }
                                  className="group/photo relative aspect-[4/3] rounded-xl overflow-hidden bg-black/5 border border-black/10 hover:border-[#0076a8] hover:shadow-md cursor-pointer transition-all"
                                  title="Klik untuk melihat foto ukuran penuh"
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`${room.name} - ${slot.name} (${pIdx + 1})`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[11px] font-bold pointer-events-none">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>Perbesar</span>
                                  </div>
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs rounded text-[9px] font-mono text-white pointer-events-none">
                                    #{pIdx + 1}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-black/[0.02] border border-dashed border-black/10 flex items-center gap-2 text-xs text-[#94a3b8]">
                            <Camera className="w-3.5 h-3.5 text-[#cbd5e1]" />
                            <span>Tidak ada foto evidence yang dilampirkan pada sesi ini.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#f1f5f9] bg-[#f8fafc] flex items-center justify-between gap-3">
          <a
            href={`/admin/export?roomId=${room.id}`}
            className="px-4 py-2 bg-white border border-[#d8e3ea] hover:bg-[#f1f5f9] text-[#0076a8] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ekspor Ceklis Excel Ruangan Ini
          </a>

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
