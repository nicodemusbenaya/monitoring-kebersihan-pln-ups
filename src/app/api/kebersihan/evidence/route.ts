import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ ok: false, message: "Path is required" }, { status: 400 });
  }

  // Strip leading domain or /files/ if full url was stored
  if (path.includes("/files/")) {
    path = path.split("/files/")[1];
  } else if (path.includes("/EVIDENCE/")) {
    path = "EVIDENCE/" + path.split("/EVIDENCE/")[1];
  }

  const gatewayUrl = (process.env.NAS_GATEWAY_URL || "").replace(/\/+$/, "");
  const gatewayToken = process.env.NAS_GATEWAY_TOKEN || "";

  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ ok: false, message: "NAS Gateway not configured" }, { status: 503 });
  }

  // Generate candidate paths to resolve date differences (e.g. 09/02 vs 09/03)
  const candidatePaths: string[] = [path];
  if (path.includes("/09/03/")) {
    candidatePaths.push(path.replace("/09/03/", "/09/02/"));
  } else if (path.includes("/09/02/")) {
    candidatePaths.push(path.replace("/09/02/", "/09/03/"));
  }

  // Also check if filename has different date from directory
  const fileName = path.split("/").pop() || "";
  const dateInFilename = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateInFilename) {
    const [, y, m, d] = dateInFilename;
    const alternateDir = `EVIDENCE/${y}/${m}/${d}/${fileName}`;
    if (!candidatePaths.includes(alternateDir)) {
      candidatePaths.push(alternateDir);
    }
  }

  let lastStatus = 404;
  let lastError = "";

  for (const candidate of candidatePaths) {
    try {
      const upstream = await fetch(
        `${gatewayUrl}/api/kebersihan/evidence?path=${encodeURIComponent(candidate)}`,
        {
          headers: {
            Authorization: `Bearer ${gatewayToken}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (upstream.ok) {
        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        const imageBuffer = await upstream.arrayBuffer();

        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }

      lastStatus = upstream.status;
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[EVIDENCE_PROXY] Failed candidate ${candidate}:`, lastError);
    }
  }

  return new NextResponse(
    `Evidence not found on NAS (lastStatus: ${lastStatus}, error: ${lastError})`,
    { status: lastStatus === 404 || lastStatus === 500 ? 404 : 502 }
  );
}

