import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testFullInsp() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  const v = inspSheet.getRow(2).values;

  const id = String(v[1]).trim();
  const rawDate = v[2];
  const dateKey = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate || "").slice(0, 10);
  const rawWeek = v[3];
  const weekStart = rawWeek instanceof Date ? rawWeek.toISOString().slice(0, 10) : String(rawWeek || dateKey).slice(0, 10);
  const dayNumber = parseInt(v[4], 10) || 1;
  const roomId = String(v[5]).trim();
  const roomTypeId = String(v[6] || "GENERAL").trim();
  const slotId = String(v[7]).trim();
  const userId = String(v[9]).trim();
  const submittedAt = v[12] ? new Date(v[12]) : new Date();
  const overallStatus = String(v[13] || "BERSIH").toUpperCase();
  const dirtyCount = parseInt(v[14], 10) || 0;
  const state = String(v[17] || "SUBMITTED").toUpperCase();

  const res = await prisma.inspection.create({
    data: {
      id,
      roomId,
      roomTypeId,
      slotId,
      userId,
      dateKey,
      weekStart,
      dayNumber,
      overallStatus,
      dirtyCount,
      submittedAt,
      state,
    },
  });

  console.log("INSPECTION INSERTED:", res.id);
}

testFullInsp().catch(console.error).finally(() => prisma.$disconnect());
