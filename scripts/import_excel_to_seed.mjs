/**
 * Import data dari Excel "Fallback Cache" ke prisma/seed_data.json
 * Strategi: UPSERT (tambah jika belum ada, skip jika sudah ada berdasarkan ID)
 * Tidak menghapus data existing!
 */

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_FILE = path.join(ROOT, "prisma", "seed_data.json");
const EXCEL_FILE = path.join(ROOT, "Monitoring Kebersihan PLN UPS - Fallback Cache (4).xlsx");

function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function safeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function safeInt(val) {
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
}

function safeBool(val) {
  if (val === true || val === 1 || val === "true" || val === "TRUE") return true;
  if (val === false || val === 0 || val === "false" || val === "FALSE") return false;
  return false;
}

async function getSheetRows(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.warn(`  ⚠️ Sheet "${sheetName}" tidak ditemukan`);
    return [];
  }
  
  const rows = [];
  let headers = null;
  
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    const vals = row.values; // 1-indexed, index 0 is null
    if (rowNum === 1) {
      headers = vals.slice(1); // remove leading null
      return;
    }
    if (!headers) return;
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = vals[idx + 1] !== undefined ? vals[idx + 1] : null;
    });
    rows.push(obj);
  });
  
  return rows;
}

async function main() {
  console.log("📖 Membaca seed_data.json saat ini...");
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  
  // Build existing ID sets
  const existingInspIds = new Set((seed.inspections || []).map(i => i.id));
  const existingDetailIds = new Set((seed.inspectionDetails || []).map(d => d.id));
  const existingPhotoIds = new Set((seed.inspectionPhotos || []).map(p => p.id));
  const existingEvalIds = new Set((seed.evaluations || []).map(e => e.id));
  
  console.log(`  Existing inspections: ${existingInspIds.size}`);
  console.log(`  Existing details: ${existingDetailIds.size}`);
  console.log(`  Existing photos: ${existingPhotoIds.size}`);
  console.log(`  Existing evaluations: ${existingEvalIds.size}`);
  
  // Known room IDs from seed (for validation)
  const validRoomIds = new Set((seed.rooms || []).map(r => r.id));
  const validSlotIds = new Set((seed.slots || []).map(s => s.id));
  const validUserIds = new Set((seed.users || []).map(u => u.id));
  const validActivityIds = new Set((seed.activities || []).map(a => a.id));

  console.log(`\n📊 Membaca file Excel: ${path.basename(EXCEL_FILE)}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_FILE);
  
  // ---- 1. INSPECTIONS ----
  console.log("\n🔄 Memproses INSPECTIONS...");
  const inspRows = await getSheetRows(wb, "INSPECTIONS");
  let newInspCount = 0;
  let skippedInspCount = 0;
  
  for (const row of inspRows) {
    const id = safeStr(row["InspectionId"]);
    if (!id) continue;
    if (existingInspIds.has(id)) { skippedInspCount++; continue; }
    
    const roomId = safeStr(row["RoomId"]);
    const slotId = safeStr(row["SlotId"]);
    
    // Skip if room/slot not in our seed (avoid FK errors)
    if (!validRoomIds.has(roomId)) {
      console.warn(`    ⚠️ Skip inspection ${id}: roomId ${roomId} tidak ada di seed`);
      skippedInspCount++;
      continue;
    }
    if (!validSlotIds.has(slotId)) {
      console.warn(`    ⚠️ Skip inspection ${id}: slotId ${slotId} tidak ada di seed`);
      skippedInspCount++;
      continue;
    }
    
    // Resolve userId - use existing user IDs from seed if not matched
    let userId = safeStr(row["UserId"]);
    if (!validUserIds.has(userId)) {
      // Default to first admin user
      userId = seed.users.find(u => u.role === "ADMIN")?.id || seed.users[0]?.id;
    }
    
    const dateKeyRaw = row["DateKey"];
    const dateKey = dateKeyRaw instanceof Date 
      ? dateKeyRaw.toISOString().slice(0, 10)
      : safeStr(dateKeyRaw)?.slice(0, 10);

    const weekStartRaw = row["WeekStart"];
    const weekStart = weekStartRaw instanceof Date
      ? weekStartRaw.toISOString().slice(0, 10)
      : safeStr(weekStartRaw)?.slice(0, 10);

    const roomTypeId = safeStr(row["RoomTypeId"]) || "GENERAL";
    const slotCode = safeStr(row["SlotCode"]) || "PAGI";
    const dayNumber = safeInt(row["DayNumber"]) || 1;
    
    seed.inspections.push({
      id,
      dateKey,
      weekStart: weekStart || dateKey,
      dayNumber,
      roomId,
      roomTypeId,
      slotId,
      slotCode,
      userId,
      scanId: null,
      scannedAt: safeDate(row["ScannedAt"]) || safeDate(row["SubmittedAt"]),
      submittedAt: safeDate(row["SubmittedAt"]) || new Date().toISOString(),
      overallStatus: safeStr(row["OverallStatus"]) || "BERSIH",
      dirtyCount: safeInt(row["DirtyCount"]),
      evidenceName: safeStr(row["EvidenceName"]) || null,
      state: "SUBMITTED",
      backupStatus: "SYNCED",
      createdAt: safeDate(row["SubmittedAt"]) || new Date().toISOString(),
      updatedAt: safeDate(row["SubmittedAt"]) || new Date().toISOString(),
    });
    existingInspIds.add(id);
    newInspCount++;
  }
  console.log(`  ✅ Baru: ${newInspCount}, Di-skip (sudah ada/invalid): ${skippedInspCount}`);
  
  // ---- 2. INSPECTION_DETAILS ----
  console.log("\n🔄 Memproses INSPECTION_DETAILS...");
  const detailRows = await getSheetRows(wb, "INSPECTION_DETAILS");
  let newDetailCount = 0;
  let skippedDetailCount = 0;
  
  for (const row of detailRows) {
    const id = safeStr(row["DetailId"]);
    if (!id) continue;
    if (existingDetailIds.has(id)) { skippedDetailCount++; continue; }
    
    const inspectionId = safeStr(row["InspectionId"]);
    if (!existingInspIds.has(inspectionId)) { skippedDetailCount++; continue; }
    
    const activityId = safeStr(row["ActivityId"]);
    if (!validActivityIds.has(activityId)) { skippedDetailCount++; continue; }
    
    seed.inspectionDetails.push({
      id,
      inspectionId,
      activityId,
      qualityResult: safeStr(row["QualityResult"]) || "POSITIVE",
      qualityLabel: safeStr(row["QualityLabel"]) || null,
      functionResult: safeStr(row["FunctionResult"]) || "POSITIVE",
      functionLabel: safeStr(row["FunctionLabel"]) || null,
      note: safeStr(row["Note"]) || null,
    });
    existingDetailIds.add(id);
    newDetailCount++;
  }
  console.log(`  ✅ Baru: ${newDetailCount}, Di-skip: ${skippedDetailCount}`);
  
  // ---- 3. INSPECTION_PHOTOS ----
  console.log("\n🔄 Memproses INSPECTION_PHOTOS...");
  const photoRows = await getSheetRows(wb, "INSPECTION_PHOTOS");
  let newPhotoCount = 0;
  let skippedPhotoCount = 0;
  
  for (const row of photoRows) {
    const id = safeStr(row["PhotoId"]);
    if (!id) continue;
    if (existingPhotoIds.has(id)) { skippedPhotoCount++; continue; }
    
    const inspectionId = safeStr(row["InspectionId"]);
    if (!existingInspIds.has(inspectionId)) { skippedPhotoCount++; continue; }
    
    seed.inspectionPhotos.push({
      id,
      inspectionId,
      fileName: safeStr(row["FileName"]) || safeStr(row["FileId"]) || id,
      fileUrl: safeStr(row["FileId"]) || safeStr(row["FileName"]) || id,
      sortOrder: safeInt(row["SortOrder"]) || 1,
      capturedAt: safeDate(row["CapturedAt"]) || new Date().toISOString(),
    });
    existingPhotoIds.add(id);
    newPhotoCount++;
  }
  console.log(`  ✅ Baru: ${newPhotoCount}, Di-skip: ${skippedPhotoCount}`);
  
  // ---- 4. EVALUATIONS ----
  console.log("\n🔄 Memproses EVALUATIONS...");
  const evalRows = await getSheetRows(wb, "EVALUATIONS");
  let newEvalCount = 0;
  let skippedEvalCount = 0;
  
  for (const row of evalRows) {
    const id = safeStr(row["EvaluationId"]);
    if (!id) continue;
    if (existingEvalIds.has(id)) { skippedEvalCount++; continue; }
    
    const roomId = safeStr(row["RoomId"]);
    if (!validRoomIds.has(roomId)) { skippedEvalCount++; continue; }
    
    const dateKeyRaw = row["DateKey"];
    const dateKey = dateKeyRaw instanceof Date
      ? dateKeyRaw.toISOString().slice(0, 10)
      : safeStr(dateKeyRaw)?.slice(0, 10);
    
    const weekStartRaw = row["WeekStart"];
    const weekStart = weekStartRaw instanceof Date
      ? weekStartRaw.toISOString().slice(0, 10)
      : safeStr(weekStartRaw)?.slice(0, 10);
    
    const monthKeyRaw = row["MonthKey"];
    const monthKey = monthKeyRaw instanceof Date
      ? monthKeyRaw.toISOString().slice(0, 7)
      : safeStr(monthKeyRaw)?.slice(0, 7);
    
    let aspectCodes = [];
    try {
      const raw = safeStr(row["AspectCodes"]);
      aspectCodes = raw ? JSON.parse(raw) : [];
    } catch { aspectCodes = []; }
    
    seed.evaluations.push({
      id,
      roomId,
      roomTypeId: safeStr(row["RoomTypeId"]) || "GENERAL",
      rating: safeInt(row["Rating"]) || 4,
      ratingLabel: safeStr(row["RatingLabel"]) || "Baik",
      aspectCodes: JSON.stringify(aspectCodes),
      comment: safeStr(row["Comment"]) || null,
      dateKey,
      weekStart: weekStart || dateKey,
      monthKey: monthKey || (dateKey ? dateKey.slice(0, 7) : "2026-08"),
      submittedAt: safeDate(row["SubmittedAt"]) || new Date().toISOString(),
      source: safeStr(row["Source"]) || "QR_ANONYMOUS",
      userAgent: safeStr(row["UserAgent"]) || null,
    });
    existingEvalIds.add(id);
    newEvalCount++;
  }
  console.log(`  ✅ Baru: ${newEvalCount}, Di-skip: ${skippedEvalCount}`);
  
  // ---- SAVE ----
  console.log("\n💾 Menyimpan seed_data.json...");
  fs.writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), "utf-8");
  
  console.log("\n🎉 IMPORT SELESAI!");
  console.log(`  Total inspections setelah import: ${seed.inspections.length}`);
  console.log(`  Total details setelah import: ${seed.inspectionDetails.length}`);
  console.log(`  Total photos setelah import: ${seed.inspectionPhotos.length}`);
  console.log(`  Total evaluations setelah import: ${seed.evaluations.length}`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
