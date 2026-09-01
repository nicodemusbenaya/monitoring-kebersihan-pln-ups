import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugInsp() {
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
  const roomId = String(v[5]).trim();
  const slotId = String(v[7]).trim();
  const userId = String(v[9]).trim();
  const submittedAt = v[12] ? new Date(v[12]) : new Date();
  const overallStatus = String(v[13] || "BERSIH").toUpperCase();
  const dirtyCount = parseInt(v[14], 10) || 0;
  const state = String(v[17] || "SUBMITTED").toUpperCase();

  try {
    const res = await prisma.inspection.create({
      data: {
        id,
        roomId,
        slotId,
        userId,
        dateKey,
        weekStart,
        overallStatus,
        dirtyCount,
        submittedAt,
        state,
      },
    });
    console.log("SUCCESS:", res.id);
  } catch (e) {
    console.error("ERROR IN INSPECTION CREATE:", e);
  }
}

debugInsp().catch(console.error).finally(() => prisma.$disconnect());
