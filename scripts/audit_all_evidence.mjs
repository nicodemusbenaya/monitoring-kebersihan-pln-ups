import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma.ts";

const NAS_GATEWAY_URL = (process.env.NAS_GATEWAY_URL || "http://nasups01.myqnapcloud.com:18080").replace(/\/+$/, "");
const NAS_GATEWAY_TOKEN = process.env.NAS_GATEWAY_TOKEN || "UPS_EARSIP_2026_4F8A9C2D7E5B1F6A8D3E9C4B7F2A6D1E8C5B9A7D";

async function fetchWithRateLimitRetry(url, options = {}, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const resetHeader = res.headers.get("ratelimit-reset");
        const waitSec = resetHeader ? Math.max(1, parseInt(resetHeader, 10)) : 10;
        console.log(`⏳ Rate limit reached (429). Menunggu ${waitSec + 1} detik sebelum mencoba lagi...`);
        await new Promise((resolve) => setTimeout(resolve, (waitSec + 1) * 1000));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`⚠️ Network error (attempt ${attempt + 1}/${maxRetries}): ${err.message}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw new Error("Max retries exceeded");
}

function normalizePath(rawUrl) {
  let cleaned = rawUrl.trim();
  if (cleaned.includes("/files/")) {
    cleaned = cleaned.split("/files/")[1];
  } else if (cleaned.includes("/EVIDENCE/")) {
    cleaned = "EVIDENCE/" + cleaned.split("/EVIDENCE/")[1];
  }
  return cleaned;
}

function getCandidatePaths(photo) {
  const norm = normalizePath(photo.fileUrl);
  const candidates = [norm];

  // Also check if filename date differs from directory date (e.g. UTC vs WIB shift)
  const fileName = norm.split("/").pop() || "";
  const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    const datePath = `EVIDENCE/${y}/${m}/${d}/${fileName}`;
    if (!candidates.includes(datePath)) {
      candidates.push(datePath);
    }
  }

  // Check 09/02 vs 09/03 shift
  if (norm.includes("/09/03/")) {
    const alt = norm.replace("/09/03/", "/09/02/");
    if (!candidates.includes(alt)) candidates.push(alt);
  } else if (norm.includes("/09/02/")) {
    const alt = norm.replace("/09/02/", "/09/03/");
    if (!candidates.includes(alt)) candidates.push(alt);
  }

  return candidates;
}

async function auditSinglePhoto(photo) {
  const candidates = getCandidatePaths(photo);
  let found = false;
  let matchedPath = "";
  let fileSizeBytes = 0;
  let lastStatus = 0;

  for (const candidate of candidates) {
    const checkUrl = `${NAS_GATEWAY_URL}/api/kebersihan/evidence?path=${encodeURIComponent(candidate)}`;
    try {
      const res = await fetchWithRateLimitRetry(checkUrl, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${NAS_GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(8000),
      });

      lastStatus = res.status;
      if (res.status === 200) {
        found = true;
        matchedPath = candidate;
        const cl = res.headers.get("content-length");
        if (cl) fileSizeBytes = parseInt(cl, 10);
        break;
      }
    } catch (err) {
      lastStatus = 599;
    }
    // small throttle between candidates
    await new Promise((r) => setTimeout(r, 60));
  }

  return {
    id: photo.id,
    fileName: photo.fileName,
    fileUrl: photo.fileUrl,
    dateKey: photo.inspection?.dateKey || "NO_DATE",
    submittedAt: photo.inspection?.submittedAt?.toISOString() || null,
    roomCode: photo.inspection?.room?.code || "N/A",
    roomName: photo.inspection?.room?.name || "N/A",
    slotCode: photo.inspection?.slot?.code || "N/A",
    petugas: photo.inspection?.user?.fullName || photo.inspection?.user?.username || "N/A",
    isHistoricalSeed: photo.id.startsWith("PHOTO-"),
    found,
    matchedPath: found ? matchedPath : null,
    fileSizeBytes: found ? fileSizeBytes : 0,
    lastStatus,
  };
}

async function main() {
  console.log("=========================================================");
  console.log("🔍 AUDIT EVIDENCE FOTO MONITORING KEBERSIHAN PLN UPS");
  console.log(`NAS Target: ${NAS_GATEWAY_URL}`);
  console.log("=========================================================\n");

  const photos = await prisma.inspectionPhoto.findMany({
    include: {
      inspection: {
        include: {
          room: true,
          slot: true,
          user: true,
        },
      },
    },
    orderBy: [
      { capturedAt: "asc" },
      { id: "asc" },
    ],
  });

  console.log(`📊 Ditemukan total ${photos.length} rekaman foto di Database Neon PostgreSQL.\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const auditRes = await auditSinglePhoto(photo);
    results.push(auditRes);

    const percent = (((i + 1) / photos.length) * 100).toFixed(1);
    const foundSoFar = results.filter((r) => r.found).length;
    const missingSoFar = results.filter((r) => !r.found).length;

    process.stdout.write(
      `\r[${i + 1}/${photos.length}] (${percent}%) - Ditemukan: ${foundSoFar} | Tidak Masuk: ${missingSoFar} | Foto: ${photo.fileName.slice(0, 35)}...`
    );

    // Throttle to respect the 120 req/min limit (~550ms between requests)
    await new Promise((r) => setTimeout(r, 550));
  }

  console.log("\n\n✅ Pengujian seluruh foto selesai!");

  // Compute Statistics
  const totalPhotos = results.length;
  const foundTotal = results.filter((r) => r.found).length;
  const missingTotal = results.filter((r) => !r.found).length;

  const livePhotos = results.filter((r) => !r.isHistoricalSeed);
  const liveFound = livePhotos.filter((r) => r.found).length;
  const liveMissing = livePhotos.filter((r) => !r.found).length;

  const historicalPhotos = results.filter((r) => r.isHistoricalSeed);
  const histFound = historicalPhotos.filter((r) => r.found).length;
  const histMissing = historicalPhotos.filter((r) => !r.found).length;

  // Breakdown by Date
  const dateMap = {};
  for (const r of results) {
    if (!dateMap[r.dateKey]) {
      dateMap[r.dateKey] = { total: 0, found: 0, missing: 0, sampleMissing: [] };
    }
    dateMap[r.dateKey].total++;
    if (r.found) {
      dateMap[r.dateKey].found++;
    } else {
      dateMap[r.dateKey].missing++;
      if (dateMap[r.dateKey].sampleMissing.length < 3) {
        dateMap[r.dateKey].sampleMissing.push({
          fileName: r.fileName,
          room: r.roomName,
          petugas: r.petugas,
        });
      }
    }
  }

  // Breakdown by Petugas
  const userMap = {};
  for (const r of results) {
    if (!userMap[r.petugas]) {
      userMap[r.petugas] = { total: 0, found: 0, missing: 0 };
    }
    userMap[r.petugas].total++;
    if (r.found) userMap[r.petugas].found++;
    else userMap[r.petugas].missing++;
  }

  const summary = {
    auditTimestamp: new Date().toISOString(),
    totalPhotosInDB: totalPhotos,
    foundOnNas: foundTotal,
    missingFromNas: missingTotal,
    overallPercentFound: ((foundTotal / totalPhotos) * 100).toFixed(2) + "%",
    liveProduction: {
      total: livePhotos.length,
      found: liveFound,
      missing: liveMissing,
      percentFound: ((liveFound / (livePhotos.length || 1)) * 100).toFixed(2) + "%",
    },
    historicalExcelSeed: {
      total: historicalPhotos.length,
      found: histFound,
      missing: histMissing,
      percentFound: ((histFound / (historicalPhotos.length || 1)) * 100).toFixed(2) + "%",
    },
    breakdownByDate: dateMap,
    breakdownByPetugas: userMap,
    missingDetails: results.filter((r) => !r.found),
  };

  fs.mkdirSync(path.resolve("./output"), { recursive: true });
  fs.writeFileSync(
    path.resolve("./output/nas_evidence_audit_report.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log("\n=================== RINGKASAN AUDIT ===================");
  console.log(`Total Foto di Database     : ${totalPhotos}`);
  console.log(`Total Berhasil di NAS      : ${foundTotal} (${summary.overallPercentFound})`);
  console.log(`Total Tidak Ditemukan      : ${missingTotal}`);
  console.log("-------------------------------------------------------");
  console.log(`Produksi Riil (September)  : ${liveFound}/${livePhotos.length} (${summary.liveProduction.percentFound})`);
  console.log(`Historis Seed (Agustus)    : ${histFound}/${historicalPhotos.length} (${summary.historicalExcelSeed.percentFound})`);
  console.log("=======================================================");
  console.log("\nRincian per Tanggal:");
  for (const [d, stats] of Object.entries(dateMap).sort()) {
    console.log(`  ${d} -> Total: ${stats.total} | Ditemukan: ${stats.found} | Hilang: ${stats.missing}`);
  }
  console.log("\nLaporan lengkap tersimpan di output/nas_evidence_audit_report.json");
}

main()
  .catch((err) => {
    console.error("Audit error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
