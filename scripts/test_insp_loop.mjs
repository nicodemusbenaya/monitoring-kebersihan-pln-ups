import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testInspLoop() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  let totalRows = inspSheet.rowCount;
  console.log("Total rows in inspSheet:", totalRows);

  let success = 0, fail = 0;
  for (let r = 2; r <= totalRows; r++) {
    const v = inspSheet.getRow(r).values;
    if (!v[1]) continue;
    const id = String(v[1]).trim();
    const rawDate = v[2];
    const dateKey = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate || "").slice(0, 10);
    const rawWeek = v[3];
    const weekStart = rawWeek instanceof Date ? rawWeek.toISOString().slice(0, 10) : String(rawWeek || dateKey).slice(0, 10);
    const dayNumber = parseInt(v[4], 10) || 1;
    const roomId = String(v[5]).trim();
    const slotId = String(v[7]).trim();
    const userId = String(v[9]).trim();
    const submittedAt = v[12] ? new Date(v[12]) : new Date();
    const overallStatus = String(v[13] || "BERSIH").toUpperCase();
    const dirtyCount = parseInt(v[14], 10) || 0;
    const state = String(v[17] || "SUBMITTED").toUpperCase();

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!room || !slot || !user) {
      fail++;
      if (fail <= 3) {
        console.log(`Row ${r} missing foreign key: room=${Boolean(room)} slot=${Boolean(slot)} user=${Boolean(user)} (roomId=${roomId}, slotId=${slotId}, userId=${userId})`);
      }
    } else {
      try {
        await prisma.inspection.create({
          data: {
            id,
            roomId,
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
        success++;
      } catch (e) {
        if (fail <= 3) console.error(`Insert failed row ${r}:`, e.message);
        fail++;
      }
    }
  }

  console.log(`Inspections: Success: ${success}, Fail: ${fail}`);
}

testInspLoop().catch(console.error).finally(() => prisma.$disconnect());
