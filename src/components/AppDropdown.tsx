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

  const display = useMemo(() => {
    const [y, m] = value.split("-").map(Number);
    if (!y || !m) return value;
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }, [value]);

  // generate last 24 months for choice
  const monthOptions = useMemo(() => {
    const opts: Option[] = [];
    const base = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lab = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
      opts.push({ value: v, label: lab.charAt(0).toUpperCase() + lab.slice(1) });
    }
    return opts;
  }, []);

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
          open ? "border-2 border-[#ffd100] ring-4 ring-[#fff7b0]" : "border border-[#cbdde6] hover:border-[#94a3b8]"
        }`}
      >
        <span className="text-[13px] font-bold text-[#17313d] capitalize truncate">{display}</span>
        <span className={`shrink-0 w-7 h-7 rounded-lg bg-white border flex items-center justify-center ${open ? "border-[#ffd100] text-[#0076a8]" : "border-[#e2e8f0] text-[#64748b]"}`}>
          {/* calendar icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-[280px] bg-white border border-[#d8e3ea] rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-1.5 max-h-[280px] overflow-y-auto">
            {monthOptions.map((opt) => {
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-between gap-2 capitalize ${
                    isSel ? "bg-[#fff6a1] text-[#17313d]" : "bg-white text-[#17313d] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSel && <Check className="w-4 h-4 text-[#0e7490]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
