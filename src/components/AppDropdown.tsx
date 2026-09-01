"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Check } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

export function AppDropdown({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  searchable = true,
  label,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
  label?: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [q, options]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, []);

  // reset search when close
  useEffect(() => { if (!open) setQ(""); }, [open]);

  return (
    <div ref={ref} className="relative min-w-[200px]">
      {label && (
        <label className="text-[10px] font-bold text-[#718c99] uppercase tracking-wide block mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-[44px] px-3.5 bg-white rounded-xl flex items-center justify-between gap-2 text-left transition-all shadow-sm ${
          open ? "border-2 border-[#ffd100] ring-4 ring-[#fff7b0] shadow-md" : "border border-[#cbdde6] hover:border-[#94a3b8]"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 text-[#5f7d8e]">{icon}</span>}
          <span className={`text-[13px] font-bold truncate ${selected ? "text-[#17313d]" : "text-[#94a3b8]"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span className={`shrink-0 transition-transform ${open ? "text-[#0076a8]" : "text-[#94a3b8]"}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[280px] bg-white border border-[#d8e3ea] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {searchable && (
            <div className="p-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari pilihan..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-[#0076a8] rounded-xl text-xs font-medium text-[#17313d] placeholder:text-[#94a3b8] focus:outline-none"
                />
              </div>
              <div className="h-px bg-[#f1f5f9] mt-2.5" />
            </div>
          )}

          <div className="p-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-[#94a3b8] font-medium">Tidak ada hasil untuk &quot;{q}&quot;</p>
            ) : (
              filtered.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-between gap-2 transition-colors ${
                      isSel ? "bg-[#fff6a1] text-[#17313d]" : "bg-white text-[#17313d] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSel && <Check className="w-4 h-4 text-[#0e7490] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthDropdown({
  value,
  onChange,
  label,
}: {
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

  const parsed = useMemo(() => {
    const [y, m] = value.split("-").map(Number);
    return { y: y || new Date().getFullYear(), m: m || 1 };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsed.y);
  useEffect(() => { setViewYear(parsed.y); }, [parsed.y]);

  const display = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(parsed.y, parsed.m - 1, 1));
  }, [parsed]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, []);

  return (
    <div ref={ref} className="relative min-w-[200px]">
      {label && <label className="text-[10px] font-bold text-[#718c99] uppercase tracking-wide block mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-[44px] px-3.5 bg-white rounded-xl flex items-center justify-between gap-2 text-left shadow-sm transition-all ${
          open ? "border-2 border-[#ffd100] ring-4 ring-[#fff7b0] shadow-md" : "border border-[#cbdde6] hover:border-[#94a3b8]"
        }`}
      >
        <span className="text-[13px] font-bold text-[#17313d] capitalize truncate">{display}</span>
        <span className={`shrink-0 w-7 h-7 rounded-lg bg-white border flex items-center justify-center ${open ? "border-[#ffd100] text-[#0076a8]" : "border-[#e2e8f0] text-[#64748b]"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] bg-white border border-[#d8e3ea] rounded-2xl shadow-xl overflow-hidden p-3">
          {/* Year header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#eef2f6] mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="w-8 h-8 rounded-lg bg-[#eef6fb] hover:bg-[#e0eef7] text-[#5f7d8e] flex items-center justify-center transition-colors"
              aria-label="Tahun sebelumnya"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <span className="text-sm font-black text-[#17313d] tracking-wide">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="w-8 h-8 rounded-lg bg-[#eef6fb] hover:bg-[#e0eef7] text-[#5f7d8e] flex items-center justify-center transition-colors"
              aria-label="Tahun berikutnya"
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_ABBR.map((abbr, idx) => {
              const monthNum = idx + 1;
              const isSelected = parsed.y === viewYear && parsed.m === monthNum;
              return (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => {
                    const v = `${viewYear}-${String(monthNum).padStart(2, "0")}`;
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`h-10 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-[#ffd100] text-[#17313d] shadow-md"
                      : "bg-[#f1f5f9] text-[#5f7d8e] hover:bg-[#e2e8f0] hover:text-[#17313d]"
                  }`}
                >
                  {abbr}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppDateField({
  value,
  onChange,
  label,
}: {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  label?: string;
}) {
  const display = useMemo(() => {
    if (!value) return "Pilih tanggal";
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00"));
    } catch { return value; }
  }, [value]);

  // Single native picker - no double panel. Input covers the field and triggers native calendar once.
  return (
    <div className="relative min-w-[200px]">
      {label && <label className="text-[10px] font-bold text-[#718c99] uppercase tracking-wide block mb-1">{label}</label>}
      <div className="relative h-[42px] bg-white rounded-xl border border-[#cbdde6] hover:border-[#94a3b8] focus-within:border-2 focus-within:border-[#ffd100] focus-within:ring-4 focus-within:ring-[#fff7b0] shadow-sm flex items-center px-3.5 gap-2 transition-all group">
        <span className={`text-xs font-bold truncate pointer-events-none ${value ? "text-[#17313d]" : "text-[#94a3b8]"}`}>{display}</span>
        <span className="ml-auto shrink-0 w-7 h-7 rounded-lg bg-white border border-[#e2e8f0] group-focus-within:border-[#ffd100] group-focus-within:text-[#0076a8] text-[#64748b] flex items-center justify-center pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

