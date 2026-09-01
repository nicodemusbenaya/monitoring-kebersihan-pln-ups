import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function importAll() {
  console.log("🚀 Memulai sinkronisasi data produksi lengkap dari file Excel...");
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Clean old placeholder data to avoid unique constraint conflicts
  await prisma.inspectionDetail.deleteMany();
  await prisma.inspectionPhoto.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.evaluationAspect.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Database bersih, memulai penulisan data asli...");

  // 1. IMPORT ROOM_TYPES
  console.log("📦 Mengimpor ROOM_TYPES...");
  const rtSheet = workbook.getWorksheet("ROOM_TYPES");
  if (rtSheet) {
    for (let r = 2; r <= rtSheet.rowCount; r++) {
      const v = rtSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const name = String(v[2] || id).trim();
      const templateSheet = String(v[3] || "Ceklis Ruangan New").trim();
      const workDays = parseInt(v[4], 10) || 6;
      const active = v[5] !== 0 && v[5] !== false && String(v[5]).toLowerCase() !== "false";
      const sortOrder = parseInt(v[6], 10) || r - 1;

      await prisma.roomType.create({
        data: { id, name, templateSheet, workDays, active, sortOrder },
      });
    }
  }

  // 2. IMPORT ROOMS (dengan QrToken Asli dari Stiker Fisik)
  console.log("🏢 Mengimpor ROOMS...");
  const roomsSheet = workbook.getWorksheet("ROOMS");
  if (roomsSheet) {
    for (let r = 2; r <= roomsSheet.rowCount; r++) {
      const v = roomsSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      let code = String(v[2] || `ROOM_${r}`).trim().toUpperCase();
      const name = String(v[3] || code).trim();
      const roomTypeId = String(v[4] || "GENERAL").trim();
      const qrToken = String(v[5] || "").trim();
      const active = v[6] !== 0 && v[6] !== false && String(v[6]).toLowerCase() !== "false";
      const sortOrder = parseInt(v[7], 10) || r - 1;

      // Ensure roomType exists
      const rtExists = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
      if (!rtExists) {
        await prisma.roomType.create({
          data: { id: roomTypeId, name: roomTypeId, templateSheet: "Ceklis Ruangan New" },
        });
      }

      await prisma.room.create({
        data: { id, code, name, roomTypeId, qrToken, active, sortOrder },
      });
      console.log(`  ✓ Ruangan: ${name} (${code}) -> Token: ${qrToken}`);
    }
  }

  // 3. IMPORT SLOTS
  console.log("⏰ Mengimpor SLOTS...");
  const slotsSheet = workbook.getWorksheet("SLOTS");
  if (slotsSheet) {
    for (let r = 2; r <= slotsSheet.rowCount; r++) {
      const v = slotsSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const roomTypeId = String(v[2]).trim();
      const code = String(v[3]).trim().toUpperCase();
      const name = String(v[4] || code).trim();
      const role = String(v[5] || "PETUGAS").trim().toUpperCase();
      const sortOrder = parseInt(v[6], 10) || r - 1;
      const active = v[7] !== 0 && v[7] !== false;

      await prisma.slot.create({
        data: { id, roomTypeId, code, name, role, sortOrder, active },
      });
    }
  }

  // 4. IMPORT ACTIVITIES (Indikator 5S)
  console.log("📋 Mengimpor ACTIVITIES...");
  const actSheet = workbook.getWorksheet("ACTIVITIES");
  if (actSheet) {
    for (let r = 2; r <= actSheet.rowCount; r++) {
      const v = actSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const roomTypeId = String(v[2] || "GENERAL").trim();
      const name = String(v[3] || "").trim();
      const standardCategory = v[4] ? String(v[4]).trim() : null;
      const standardText = v[5] ? String(v[5]).trim() : null;
      const qualityApplicable = v[6] !== 0 && v[6] !== false && String(v[6]).toLowerCase() !== "false";
      const qualityPositive = String(v[7] || "Bersih").trim();
      const qualityNegative = String(v[8] || "Kotor").trim();
      const functionApplicable = v[9] !== 0 && v[9] !== false && String(v[9]).toLowerCase() !== "false";
      const functionPositive = String(v[10] || "Normal").trim();
      const functionNegative = String(v[11] || "Rusak").trim();
      const exportRow = v[12] ? parseInt(v[12], 10) : null;
      const active = v[13] !== 0 && v[13] !== false && String(v[13]).toLowerCase() !== "false";
      const sortOrder = parseInt(v[14], 10) || r - 1;

      await prisma.activity.create({
        data: {
          id,
          roomTypeId,
          name,
          standardCategory,
          standardText,
          qualityApplicable,
          qualityPositive,
          qualityNegative,
          functionApplicable,
          functionPositive,
          functionNegative,
          exportRow,
          active,
          sortOrder,
        },
      });
    }
  }

  // 5. IMPORT EVALUATION ASPECTS
  console.log("⭐ Mengimpor EVALUATION_ASPECTS...");
  const aspectSheet = workbook.getWorksheet("EVALUATION_ASPECTS");
  if (aspectSheet) {
    for (let r = 2; r <= aspectSheet.rowCount; r++) {
      const v = aspectSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const roomTypeId = String(v[2] || "GENERAL").trim();
      const code = String(v[3] || "").trim();
      const label = String(v[4] || "").trim();
      const active = v[5] !== 0 && v[5] !== false;
      const sortOrder = parseInt(v[6], 10) || r - 1;

      await prisma.evaluationAspect.create({
        data: { id, roomTypeId, code, label, active, sortOrder },
      });
    }
  }

  // 6. IMPORT USERS
  console.log("👥 Mengimpor USERS...");
  const usersSheet = workbook.getWorksheet("USERS");
  if (usersSheet) {
    for (let r = 2; r <= usersSheet.rowCount; r++) {
      const v = usersSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const username = String(v[2]).trim().toLowerCase();
      const fullName = String(v[3] || username).trim();
      const role = String(v[4] || "PETUGAS").trim().toUpperCase();
      const active = v[7] !== 0 && v[7] !== false && String(v[7]).toLowerCase() !== "false";

      let rawPass = `${username.charAt(0).toUpperCase() + username.slice(1)}PLN123!`;
      if (username === "dwi") rawPass = "DwiPLN123!";
      else if (username === "arif") rawPass = "ArifPLN123!";
      else if (username === "sulaiman") rawPass = "SulaimanPLN123!";
      else if (username === "ipal") rawPass = "IpalPLN123!";

      const passwordHash = await bcrypt.hash(rawPass, 10);

      await prisma.user.create({
        data: { id, username, fullName, role, passwordHash, active },
      });
      console.log(`  ✓ User: ${username} (${fullName}) - Role: ${role}`);
    }
  }

  console.log("✨ Impor seluruh data asli PLN UPS selesai 100%!");
}

importAll()
  .catch((err) => {
    console.error("Gagal impor:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
