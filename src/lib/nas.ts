export interface NasEvidencePayload {
  fileName: string;
  contentType: string;
  base64: string;
}

export async function uploadEvidenceToNas(
  payload: NasEvidencePayload,
  maxRetries = 2
): Promise<{ ok: boolean; path?: string; message?: string }> {
  const gatewayUrl = (process.env.NAS_GATEWAY_URL || "").replace(/\/+$/, "");
  const gatewayToken = process.env.NAS_GATEWAY_TOKEN || "";
  const enabled = process.env.NAS_EVIDENCE_ENABLED === "true";

  if (!enabled || !gatewayUrl || !gatewayToken) {
    // If NAS not configured, fallback to storing path or returning data url
    return { ok: true, path: `LOCAL:${payload.fileName}` };
  }

  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${gatewayUrl}/api/kebersihan/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          fileName: payload.fileName,
          contentType: payload.contentType,
          createdAt: new Date().toISOString(),
          base64: payload.base64,
        }),
        signal: AbortSignal.timeout(20000), // 20s safety threshold for cellular/DDNS latency & NAS disk spin-up
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        return { ok: true, path: data.storedPath };
      }
      lastError = data.message || "Gagal mengunggah ke gateway NAS.";
    } catch (err: any) {
      lastError = err?.message || "Koneksi ke NAS gagal";
      console.warn(`[NAS_UPLOAD] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${payload.fileName}:`, lastError);
      if (attempt < maxRetries) {
        // Wait 750ms before retrying
        await new Promise((r) => setTimeout(r, 750));
      }
    }
  }

  return { ok: false, message: lastError };
}

export async function checkNasHealth(): Promise<{ ok: boolean; message?: string; totalBytes?: number; availableBytes?: number }> {
  const gatewayUrl = (process.env.NAS_GATEWAY_URL || "").replace(/\/+$/, "");
  const gatewayToken = process.env.NAS_GATEWAY_TOKEN || "";

  if (!gatewayUrl || !gatewayToken) {
    return { ok: false, message: "Gateway NAS belum dikonfigurasi." };
  }

  try {
    const res = await fetch(`${gatewayUrl}/api/kebersihan/status`, {
      headers: { Authorization: `Bearer ${gatewayToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return {
        ok: true,
        totalBytes: data.totalBytes,
        availableBytes: data.availableBytes,
      };
    }
    return { ok: false, message: data.message || "NAS Gateway merespons error" };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Tidak dapat menghubungi NAS" };
  }
}
