import { NextResponse } from "next/server";

// Fallback SVG placeholder when an evidence photo is not available or NAS is offline
const SVG_NOT_FOUND = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="#f1f5f9">
  <rect width="400" height="300" fill="#f1f5f9"/>
  <rect x="20" y="20" width="360" height="260" rx="12" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="200" cy="130" r="32" fill="#94a3b8"/>
  <path d="M185 130a15 15 0 1 0 30 0a15 15 0 1 0 -30 0" fill="#f1f5f9"/>
  <text x="200" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" fill="#647783" text-anchor="middle">Foto Evidence Tidak Tersedia</text>
  <text x="200" y="215" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Tersimpan di arsip offline NAS</text>
</svg>`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get("path");

    if (!rawPath) {
      return new NextResponse(SVG_NOT_FOUND, {
        status: 404,
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
      });
    }

    // Clean and normalize the path
    let cleaned = rawPath.trim();
    if (cleaned.includes("/files/")) {
      cleaned = cleaned.split("/files/")[1];
    } else if (cleaned.includes("/EVIDENCE/")) {
      cleaned = "EVIDENCE/" + cleaned.split("/EVIDENCE/")[1];
    } else if (cleaned.startsWith("/")) {
      cleaned = cleaned.replace(/^\/+/, "");
    }

    const gatewayUrl = (process.env.NAS_GATEWAY_URL || "http://nasups01.myqnapcloud.com:18080").replace(/\/+$/, "");
    const gatewayToken = process.env.NAS_GATEWAY_TOKEN || "UPS_EARSIP_2026_4F8A9C2D7E5B1F6A8D3E9C4B7F2A6D1E8C5B9A7D";

    // Request the photo from NAS Gateway
    const targetUrl = `${gatewayUrl}/api/kebersihan/evidence?path=${encodeURIComponent(cleaned)}`;

    const res = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
      },
      // 10-second timeout to avoid lingering Vercel serverless functions
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      // Return lightweight SVG fallback if NAS returned 404
      return new NextResponse(SVG_NOT_FOUND, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await res.arrayBuffer();

    // Critical for Vercel & Neon efficiency:
    // Caches the image on Vercel's Edge CDN for 30 days.
    // Subsequent requests hit Vercel Edge cache with 0 compute & 0 function execution.
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.warn("Evidence proxy error:", error?.message);
    return new NextResponse(SVG_NOT_FOUND, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
