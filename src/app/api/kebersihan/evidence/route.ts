import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ ok: false, message: "Path is required" }, { status: 400 });
  }

  const gatewayUrl = (process.env.NAS_GATEWAY_URL || "").replace(/\/+$/, "");
  const gatewayToken = process.env.NAS_GATEWAY_TOKEN || "";

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ ok: false, message: "NAS Gateway not configured" }, { status: 503 });
  }

  try {
    const upstream = await fetch(`${gatewayUrl}/api/kebersihan/evidence?path=${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      return new NextResponse("Evidence not found on NAS", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await upstream.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("Evidence proxy error:", error?.message || error);
    return new NextResponse("Failed to fetch evidence from NAS", { status: 502 });
  }
}
