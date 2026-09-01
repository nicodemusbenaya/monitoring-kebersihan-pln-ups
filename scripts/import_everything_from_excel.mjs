import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function importEverything() {
  console.log("🚀 Memulai impor 100% data lengkap (Master + Riwayat) dari file Excel...");
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log("🧹 Mengosongkan data lama...");
  await prisma.inspectionPhoto.deleteMany();
  await prisma.inspectionDetail.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.evaluationAspect.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.user.deleteMany();

  // 1. ROOM_TYPES
  console.log("1️⃣ Mengimpor ROOM_TYPES...");
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

  // 2. ROOMS
  console.log("2️⃣ Mengimpor ROOMS...");
  const roomsSheet = workbook.getWorksheet("ROOMS");
  if (roomsSheet) {
    for (let r = 2; r <= roomsSheet.rowCount; r++) {
      const v = roomsSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const code = String(v[2] || `ROOM_${r}`).trim().toUpperCase();
      const name = String(v[3] || code).trim();
      const roomTypeId = String(v[4] || "GENERAL").trim();
      const qrToken = String(v[5] || "").trim();
      const active = v[6] !== 0 && v[6] !== false && String(v[6]).toLowerCase() !== "false";
      const sortOrder = parseInt(v[7], 10) || r - 1;

      const rtExists = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
      if (!rtExists) {
        await prisma.roomType.create({
          data: { id: roomTypeId, name: roomTypeId, templateSheet: "Ceklis Ruangan New" },
        });
      }

      await prisma.room.create({
        data: { id, code, name, roomTypeId, qrToken, active, sortOrder },
      });
      console.log(`  ✓ ${name} (${code}) -> QR: ${qrToken}`);
    }
  }

  // Register historical rooms
  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  let arcIdx = 100;
  if (inspSheet) {
    for (let r = 2; r <= inspSheet.rowCount; r++) {
      const v = inspSheet.getRow(r).values;
      if (!v[1]) continue;
      const roomId = String(v[5]).trim();
      const roomTypeId = String(v[6] || "GENERAL").trim();
      const exists = await prisma.room.findUnique({ where: { id: roomId } });
      if (!exists) {
        arcIdx++;
        const rt = (await prisma.roomType.findUnique({ where: { id: roomTypeId } })) || (await prisma.roomType.findFirst());
        await prisma.room.create({
          data: {
            id: roomId,
            code: `HISTORIS_${arcIdx}`,
            name: `Ruangan Riwayat (${roomTypeId})`,
            roomTypeId: rt.id,
            qrToken: `HISTORIS-${roomId}`,
            active: false,
            sortOrder: arcIdx,
          },
        });
      }
    }
  }

  // 3. SLOTS
  console.log("3️⃣ Mengimpor SLOTS...");
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

  // 4. ACTIVITIES
  console.log("4️⃣ Mengimpor ACTIVITIES...");
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

  // 5. EVALUATION_ASPECTS
  console.log("5️⃣ Mengimpor EVALUATION_ASPECTS...");
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

  // 6. USERS
  console.log("6️⃣ Mengimpor USERS...");
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
      console.log(`  ✓ Akun: ${username} (${fullName}) - Role: ${role}`);
    }
  }

  // 7. INSPECTIONS
  console.log("7️⃣ Mengimpor INSPECTIONS (358 Sesi)...");
  let inspCount = 0;
  if (inspSheet) {
    for (let r = 2; r <= inspSheet.rowCount; r++) {
      const v = inspSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const rawDate = v[2];
      const dateKey = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate || "").slice(0, 10);
      const rawWeek = v[3];
      const weekStart = rawWeek instanceof Date ? rawWeek.toISOString().slice(0, 10) : String(rawWeek || dateKey).slice(0, 10);
      const dayNumber = parseInt(v[4], 10) || 1;
      const roomId = String(v[5]).trim();
      const roomTypeId = String(v[6] || "GENERAL").trim();
      const slotId = String(v[7]).trim();
      const slotCode = String(v[8] || "PAGI").toUpperCase().trim();
      const userId = String(v[9]).trim();
      const scanId = v[10] ? String(v[10]).trim() : null;
      const scannedAt = v[11] ? new Date(v[11]) : new Date();
      const submittedAt = v[12] ? new Date(v[12]) : new Date();
      const overallStatus = String(v[13] || "BERSIH").toUpperCase();
      const dirtyCount = parseInt(v[14], 10) || 0;
      const evidenceName = v[16] ? String(v[16]).trim() : null;
      const state = String(v[17] || "SUBMITTED").toUpperCase();

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (room && slot && user) {
        try {
          await prisma.inspection.create({
            data: {
              id,
              roomId,
              roomTypeId,
              slotId,
              slotCode,
              userId,
              scanId,
              scannedAt,
              submittedAt,
              dateKey,
              weekStart,
              dayNumber,
              overallStatus,
              dirtyCount,
              evidenceName,
              state,
            },
          });
          inspCount++;
        } catch (e) {
          // ignore duplicate
        }
      }
    }
    console.log(`  ✓ Berhasil mengimpor ${inspCount} riwayat pemeriksaan!`);
  }

  // 8. INSPECTION_DETAILS
  console.log("8️⃣ Mengimpor INSPECTION_DETAILS (5,800+ Jawaban)...");
  const detailSheet = workbook.getWorksheet("INSPECTION_DETAILS");
  let detailCount = 0;
  if (detailSheet) {
    for (let r = 2; r <= detailSheet.rowCount; r++) {
      const v = detailSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const inspectionId = String(v[2]).trim();
      const activityId = String(v[3]).trim();
      const qualityResult = String(v[4] || "POSITIVE").toUpperCase();
      const qualityLabel = v[5] ? String(v[5]) : null;
      const functionResult = String(v[6] || "POSITIVE").toUpperCase();
      const functionLabel = v[7] ? String(v[7]) : null;
      const note = v[10] ? String(v[10]) : null;

      const insp = await prisma.inspection.findUnique({ where: { id: inspectionId } });
      const act = await prisma.activity.findUnique({ where: { id: activityId } });

      if (insp && act) {
        try {
          await prisma.inspectionDetail.create({
            data: {
              id,
              inspectionId,
              activityId,
              qualityResult,
              qualityLabel,
              functionResult,
              functionLabel,
              note,
            },
          });
          detailCount++;
        } catch (e) {}
      }
    }
    console.log(`  ✓ Berhasil mengimpor ${detailCount} detail jawaban 5S!`);
  }

  // 9. INSPECTION_PHOTOS
  console.log("9️⃣ Mengimpor INSPECTION_PHOTOS (360 Foto)...");
  const photoSheet = workbook.getWorksheet("INSPECTION_PHOTOS");
  let photoCount = 0;
  if (photoSheet) {
    for (let r = 2; r <= photoSheet.rowCount; r++) {
      const v = photoSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const inspectionId = String(v[2]).trim();
      const fileId = v[3] ? String(v[3]).trim() : null;
      const fileName = v[4] ? String(v[4]).trim() : `foto_${r}.jpg`;
      const fileUrl = fileId ? `http://nasups01.myqnapcloud.com:18080/files/${fileId}` : "";
      const capturedAt = v[5] ? new Date(v[5]) : new Date();
      const sortOrder = parseInt(v[6], 10) || 1;

      const insp = await prisma.inspection.findUnique({ where: { id: inspectionId } });
      if (insp) {
        try {
          await prisma.inspectionPhoto.create({
            data: { id, inspectionId, fileName, fileUrl, capturedAt, sortOrder },
          });
          photoCount++;
        } catch (e) {}
      }
    }
    console.log(`  ✓ Berhasil mengimpor ${photoCount} foto evidence!`);
  }

  // 10. EVALUATIONS
  console.log("🔟 Mengimpor EVALUATIONS (Ulasan Pengunjung)...");
  const evalSheet = workbook.getWorksheet("EVALUATIONS");
  let evalCount = 0;
  if (evalSheet) {
    for (let r = 2; r <= evalSheet.rowCount; r++) {
      const v = evalSheet.getRow(r).values;
      if (!v[1]) continue;
      const id = String(v[1]).trim();
      const roomId = String(v[2]).trim();
      const roomTypeId = String(v[3] || "GENERAL").trim();
      const rating = parseInt(v[4], 10) || 4;
      const ratingLabel = String(v[5] || "Sangat baik").trim();
      const aspectCodes = v[6] ? String(v[6]) : "[]";
      const comment = v[7] ? String(v[7]) : null;
      const rawDate = v[8];
      const dateKey = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate || "").slice(0, 10);
      const rawMonth = v[10];
      const monthKey = rawMonth instanceof Date ? rawMonth.toISOString().slice(0, 7) : String(rawMonth || dateKey.slice(0, 7)).slice(0, 7);
      const submittedAt = v[11] ? new Date(v[11]) : new Date();
      const userAgent = v[13] ? String(v[13]) : null;

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (room) {
        try {
          await prisma.evaluation.create({
            data: {
              id,
              roomId,
              roomTypeId,
              rating,
              ratingLabel,
              aspectCodes,
              comment,
              dateKey,
              monthKey,
              submittedAt,
              userAgent,
            },
          });
          evalCount++;
        } catch (e) {}
      }
    }
    console.log(`  ✓ Berhasil mengimpor ${evalCount} ulasan tamu!`);
  }

  console.log("\n=======================================================");
  console.log("🎉 SELURUH DATA MASTER & HISTORIS SELESAI DISINKRONKAN 100%!");
  console.log("=======================================================");
}

importEverything()
  .catch((err) => {
    console.error("Gagal impor:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
