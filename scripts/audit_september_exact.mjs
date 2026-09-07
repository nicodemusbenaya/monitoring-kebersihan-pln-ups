import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma.ts";

const NAS_GATEWAY_URL = (process.env.NAS_GATEWAY_URL || "http://nasups01.myqnapcloud.com:18080").replace(/\/+$/, "");
const NAS_GATEWAY_TOKEN = process.env.NAS_GATEWAY_TOKEN || "UPS_EARSIP_2026_4F8A9C2D7E5B1F6A8D3E9C4B7F2A6D1E8C5B9A7D";

async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const resetHeader = res.headers.get("ratelimit-reset");
        const waitSec = resetHeader ? Math.max(1, parseInt(resetHeader, 10)) : 15;
        console.log(`\n⏳ [429 Rate Limit] Menunggu ${waitSec + 1} detik...`);
        await new Promise((r) => setTimeout(r, (waitSec + 1) * 1000));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function run() {
  console.log("Memulai Audit Presisi September (167 Foto)...");

  const photos = await prisma.inspectionPhoto.findMany({
    where: {
      inspection: {
        dateKey: { gte: "2026-09-01" },
      },
    },
    include: {
      inspection: {
        include: { room: true, slot: true, user: true },
      },
    },
    orderBy: [{ capturedAt: "asc" }],
  });

  console.log(`Total foto September: ${photos.length}`);

  const results = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    let relPath = p.fileUrl;
    if (relPath.includes("/files/")) relPath = relPath.split("/files/")[1];
    else if (relPath.includes("/EVIDENCE/")) relPath = "EVIDENCE/" + relPath.split("/EVIDENCE/")[1];

    // Primary path
    let found = false;
    let finalPath = relPath;
    let size = 0;
    let lastStatus = 0;

    const candidates = [relPath];
    const fileName = relPath.split("/").pop() || "";
    const m = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mo, d] = m;
      const alt = `EVIDENCE/${y}/${mo}/${d}/${fileName}`;
      if (!candidates.includes(alt)) candidates.push(alt);
    }
    if (relPath.includes("/09/03/")) {
      const alt2 = relPath.replace("/09/03/", "/09/02/");
      if (!candidates.includes(alt2)) candidates.push(alt2);
    } else if (relPath.includes("/09/02/")) {
      const alt3 = relPath.replace("/09/02/", "/09/03/");
      if (!candidates.includes(alt3)) candidates.push(alt3);
    }

    for (const c of candidates) {
      const url = `${NAS_GATEWAY_URL}/api/kebersihan/evidence?path=${encodeURIComponent(c)}`;
      const res = await fetchWithRetry(url, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${NAS_GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(8000),
      });

      lastStatus = res.status;
      if (res.status === 200) {
        found = true;
        finalPath = c;
        const cl = res.headers.get("content-length");
        if (cl) size = parseInt(cl, 10);
        break;
      }
      await new Promise((r) => setTimeout(r, 60));
    }

    results.push({
      id: p.id,
      dateKey: p.inspection?.dateKey,
      room: p.inspection?.room?.name,
      roomCode: p.inspection?.room?.code,
      slot: p.inspection?.slot?.name,
      petugas: p.inspection?.user?.fullName,
      fileName: p.fileName,
      fileUrl: p.fileUrl,
      found,
      finalPath: found ? finalPath : null,
      size,
      lastStatus,
    });

    const foundCount = results.filter((r) => r.found).length;
    const missingCount = results.filter((r) => !r.found).length;
    process.stdout.write(`\r[${i + 1}/${photos.length}] Ditemukan: ${foundCount} | Hilang: ${missingCount} | ${p.fileName.slice(0, 30)}`);

    await new Promise((r) => setTimeout(r, 550));
  }

  console.log("\n\n=== HASIL AUDIT SEPTEMBER ===");
  const foundTotal = results.filter((r) => r.found).length;
  const missingTotal = results.filter((r) => !r.found).length;
  console.log(`Total September: ${results.length}`);
  console.log(`Ditemukan di NAS: ${foundTotal} (${((foundTotal / results.length) * 100).toFixed(1)}%)`);
  console.log(`Tidak Ditemukan : ${missingTotal} (${((missingTotal / results.length) * 100).toFixed(1)}%)`);

  const byDate = {};
  for (const r of results) {
    if (!byDate[r.dateKey]) byDate[r.dateKey] = { total: 0, found: 0, missing: 0 };
    byDate[r.dateKey].total++;
    if (r.found) byDate[r.dateKey].found++;
    else byDate[r.dateKey].missing++;
  }
  console.log("\nBreakdown per Tanggal:");
  console.table(byDate);

  const missingList = results.filter((r) => !r.found);
  if (missingList.length > 0) {
    console.log("\nDaftar foto yang TIDAK DITEMUKAN di NAS:");
    missingList.forEach((m, idx) => {
      console.log(`${idx + 1}. [${m.dateKey}] ${m.room} (${m.slot}) - Petugas: ${m.petugas} - File: ${m.fileName} (Status: ${m.lastStatus})`);
    });
  }

  fs.writeFileSync(
    path.resolve("./output/september_evidence_audit.json"),
    JSON.stringify({ results, byDate, missingList }, null, 2),
    "utf8"
  );
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
