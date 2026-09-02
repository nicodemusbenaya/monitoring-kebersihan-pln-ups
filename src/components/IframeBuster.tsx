"use client";

import { useEffect, useState } from "react";

export function IframeBuster() {
  const [inIframe, setInIframe] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.self !== window.top) {
        setInIframe(true);
        setCurrentUrl(window.location.href);

        // Attempt automatic breakout
        try {
          window.top!.location.href = window.location.href;
        } catch (e) {
          // If browser sandbox blocks top navigation, banner will provide the breakout button
        }
      }
    } catch (e) {
      setInIframe(true);
      setCurrentUrl(typeof window !== "undefined" ? window.location.href : "");
    }
  }, []);

  if (!inIframe) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: "#072d3f",
        color: "#ffffff",
        padding: "12px 16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        borderBottom: "3px solid #ffd100",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
        <span style={{ fontSize: "18px" }}>⚠️</span>
        <div>
          <strong style={{ color: "#ffd100" }}>Aplikasi berjalan di dalam bingkai Google Script</strong>
          <div style={{ fontSize: "11px", color: "#97b7c8" }}>
            Sesi login dan data tidak dapat tersimpan di dalam bingkai script.google.com.
          </div>
        </div>
      </div>
      <a
        href={currentUrl || "https://monitoring-kebersihan-pln-ups.vercel.app"}
        target="_top"
        style={{
          background: "#ffd100",
          color: "#072d3f",
          padding: "8px 16px",
          borderRadius: "10px",
          fontWeight: 700,
          fontSize: "12px",
          textDecoration: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(255,209,0,0.4)",
        }}
      >
        Buka di Browser Penuh &rarr;
      </a>
    </div>
  );
}
