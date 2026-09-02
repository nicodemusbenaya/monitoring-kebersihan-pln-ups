import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthEndKey(monthKeyStr?: string): string {
  const [yearStr, monthStr] = (monthKeyStr || monthKey()).split("-");
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function formatDisplayDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d) + " WIB";
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }
  return dateStr;
}

export function extractQrToken(raw: string): string {
  if (!raw) return "";
  let clean = String(raw).trim();

  // Try decoding if encoded
  try {
    clean = decodeURIComponent(clean);
  } catch {}

  // 1. If it's a URL
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.includes("?")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://dummy.com/${clean}`);
      
      // Query parameters
      const roomParam = url.searchParams.get("room") || url.searchParams.get("token") || url.searchParams.get("id");
      const evalParam = url.searchParams.get("evaluate");
      if (roomParam) return roomParam.trim();
      if (evalParam) return evalParam.trim();

      // Path parameters, e.g. /evaluate/TOKEN or /scanner/room/TOKEN
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last && last !== "evaluate" && last !== "scanner" && last !== "room") {
          return last.trim();
        }
      }
    } catch {
      const match = clean.match(/[?&](?:room|evaluate|token|id)=([^&#]+)/i);
      if (match) return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. Path fallback if raw looks like "/scanner/room/TOKEN" or "/evaluate/TOKEN"
  if (clean.includes("/")) {
    const parts = clean.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) clean = last;
  }

  // 3. If prefixed with PLNUPS:ROOM: or PLNUPS:EVALUATE:
  if (clean.toUpperCase().startsWith("PLNUPS:ROOM:")) {
    clean = clean.slice(12).trim();
  } else if (clean.toUpperCase().startsWith("PLNUPS:EVALUATE:")) {
    clean = clean.slice(16).trim();
  }

  return clean.trim();
}
