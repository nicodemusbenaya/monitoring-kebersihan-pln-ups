"use client";

import React from "react";
import { Camera, ChevronLeft, ChevronRight, Clock, User, ZoomIn } from "lucide-react";
import { LatestEvidencePhoto } from "@/types/dashboard";
import { getEvidencePhotoUrl } from "@/lib/evidence";

interface LatestEvidenceCardProps {
  latestPhotosList: LatestEvidencePhoto[];
  activeEvidenceIndex: number;
  setActiveEvidenceIndex: React.Dispatch<React.SetStateAction<number>>;
  isEvidencePaused: boolean;
  setIsEvidencePaused: (paused: boolean) => void;
  loading: boolean;
  onSelectPhoto: (photo: LatestEvidencePhoto) => void;
}

export function LatestEvidenceCard({
  latestPhotosList,
  activeEvidenceIndex,
  setActiveEvidenceIndex,
  isEvidencePaused,
  setIsEvidencePaused,
  loading,
  onSelectPhoto,
}: LatestEvidenceCardProps) {
  const currentPhoto = latestPhotosList[activeEvidenceIndex] || latestPhotosList[0];
  const isClean = currentPhoto?.overallStatus === "BERSIH";
  const photoUrl = currentPhoto ? getEvidencePhotoUrl(currentPhoto.fileUrl) : "";

  return (
    <div
      onMouseEnter={() => setIsEvidencePaused(true)}
      onMouseLeave={() => setIsEvidencePaused(false)}
      className="bg-white border border-[#d8e3ea] rounded-2xl p-5 shadow-sm flex flex-col space-y-3 relative group"
    >
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0076a8]/10 text-[#0076a8] flex items-center justify-center shadow-inner shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#718c99] block">
              DOKUMENTASI FOTO
            </span>
            <h4 className="text-sm font-black text-[#17313d]">Evidence Terakhir</h4>
          </div>
        </div>

        {/* Counter badge & Navigation */}
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f1f5f9] text-[#647783]">
            {latestPhotosList.length > 0
              ? `${activeEvidenceIndex + 1}/${latestPhotosList.length}`
              : "0/0"}
          </span>
          <button
            type="button"
            onClick={() =>
              setActiveEvidenceIndex((prev) =>
                prev === 0 ? Math.max(0, latestPhotosList.length - 1) : prev - 1
              )
            }
            className="w-6 h-6 rounded-lg bg-[#f1f5f9] hover:bg-[#0076a8] hover:text-white text-[#647783] flex items-center justify-center transition-colors shadow-xs"
            title="Foto sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveEvidenceIndex((prev) =>
                (prev + 1) % Math.max(1, latestPhotosList.length)
              )
            }
            className="w-6 h-6 rounded-lg bg-[#f1f5f9] hover:bg-[#0076a8] hover:text-white text-[#647783] flex items-center justify-center transition-colors shadow-xs"
            title="Foto berikutnya (berputar tiap 7 detik)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Photo Slide Area */}
      {loading ? (
        <div className="w-full aspect-[16/11] bg-[#f1f5f9] animate-pulse rounded-xl" />
      ) : latestPhotosList.length === 0 ? (
        <div className="w-full aspect-[16/11] bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-xl flex flex-col items-center justify-center text-center p-4">
          <Camera className="w-6 h-6 text-[#94a3b8] mb-1" />
          <span className="text-xs font-bold text-[#647783]">Belum ada foto evidence</span>
        </div>
      ) : (
        <div
          onClick={() => onSelectPhoto(currentPhoto)}
          className="relative w-full aspect-[16/11] rounded-xl overflow-hidden bg-[#072d3f]/5 border border-black/5 cursor-pointer group/slide"
          title="Klik untuk melihat ukuran penuh"
        >
          <img
            key={currentPhoto.id || activeEvidenceIndex}
            src={photoUrl}
            alt={currentPhoto.roomName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-all duration-500 animate-in fade-in"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/api/kebersihan/evidence?path=NOT_FOUND";
            }}
          />

          {/* Top-left: Slot Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                currentPhoto.slotCode === "PAGI"
                  ? "bg-[#0284c7]/90 text-white"
                  : currentPhoto.slotCode === "SORE"
                  ? "bg-[#d97706]/90 text-white"
                  : "bg-[#7c3aed]/90 text-white"
              }`}
            >
              {currentPhoto.slotName}
            </span>
          </div>

          {/* Top-right: Condition Status */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase backdrop-blur-md shadow-xs ${
                isClean ? "bg-[#16a34a]/90 text-white" : "bg-[#dc2626]/90 text-white"
              }`}
            >
              {isClean ? "Bersih" : "Temuan"}
            </span>
          </div>

          {/* Hover Hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none">
            <ZoomIn className="w-4 h-4" />
            <span>Perbesar Foto</span>
          </div>

          {/* Bottom Bar Info Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 pt-6 text-white">
            <h5 className="text-xs font-black truncate">{currentPhoto.roomName}</h5>
            <div className="flex items-center justify-between text-[10px] text-white/80 mt-0.5">
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <User className="w-3 h-3 text-[#ffd100] shrink-0" />
                <span className="truncate">{currentPhoto.officerName}</span>
              </span>
              <span className="flex items-center gap-1 text-white/70">
                <Clock className="w-2.5 h-2.5" />
                <span>{currentPhoto.displayTime}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mini Progress Indicator Dots */}
      {latestPhotosList.length > 0 && (
        <div className="flex items-center justify-between pt-1 text-[10px] text-[#94a3b8]">
          <div className="flex items-center gap-1">
            {latestPhotosList.slice(0, 10).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveEvidenceIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeEvidenceIndex
                    ? "w-5 bg-[#0076a8]"
                    : "w-1.5 bg-[#d8e3ea] hover:bg-[#94a3b8]"
                }`}
                title={`Pindah ke foto ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium text-[#718c99]">
            {isEvidencePaused ? "Dijeda saat kursor di atas" : "Berganti tiap 7 detik"}
          </span>
        </div>
      )}
    </div>
  );
}
