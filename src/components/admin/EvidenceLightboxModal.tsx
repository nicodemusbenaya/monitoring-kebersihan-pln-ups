"use client";

import React from "react";
import { ExternalLink, User, Clock, X } from "lucide-react";
import { LatestEvidencePhoto } from "@/types/dashboard";
import { getEvidencePhotoUrl } from "@/lib/evidence";

interface EvidenceLightboxModalProps {
  photo: LatestEvidencePhoto | null;
  onClose: () => void;
}

export function EvidenceLightboxModal({
  photo,
  onClose,
}: EvidenceLightboxModalProps) {
  if (!photo) return null;

  const isClean = photo.overallStatus === "BERSIH";
  const photoUrl = getEvidencePhotoUrl(photo.fileUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#072d3f] border border-[#144b67] text-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-[#144b67] flex items-center justify-between gap-4 bg-[#0a364c]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0076a8] text-white">
                {photo.slotName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  isClean ? "bg-[#16a34a] text-white" : "bg-[#dc2626] text-white"
                }`}
              >
                {isClean ? "Kondisi Bersih" : "Ada Temuan"}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-white mt-1 truncate">
              {photo.roomName}
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-[#144b67] hover:bg-[#1a5a7c] text-white transition-colors"
              title="Buka foto asli di tab baru"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#144b67] hover:bg-[#bd2d22] text-white transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Body */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center bg-black/40 overflow-hidden min-h-[300px]">
          <img
            src={photoUrl}
            alt={photo.roomName}
            className="max-h-[60vh] max-w-full w-auto object-contain rounded-2xl shadow-xl border border-white/10"
          />
        </div>

        {/* Footer details */}
        <div className="p-4 px-6 border-t border-[#144b67] bg-[#0a364c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#97b7c8]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-white font-bold">
              <User className="w-4 h-4 text-[#ffd100]" />
              Petugas: {photo.officerName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#97b7c8]">
              <Clock className="w-3.5 h-3.5" />
              {photo.displayTime}
            </span>
          </div>

          <div className="text-[11px] font-mono text-[#86a6b8] truncate">
            {photo.fileName}
          </div>
        </div>
      </div>
    </div>
  );
}
