import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function autoCreateMissingRooms() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  const missingRoomIds = new Map();

  for (let r = 2; r <= inspSheet.rowCount; r++) {
    const v = inspSheet.getRow(r).values;
    if (!v[1]) continue;
    const roomId = String(v[5]).trim();
    const roomTypeId = String(v[6] || "GENERAL").trim();
    if (!missingRoomIds.has(roomId)) {
      const exists = await prisma.room.findUnique({ where: { id: roomId } });
      if (!exists) {
        missingRoomIds.set(roomId, roomTypeId);
      }
    }
  }

  console.log(`Ditemukan ${missingRoomIds.size} roomId riwayat lama yang belum ada di master:`);
  let idx = 100;
  for (const [roomId, roomTypeId] of missingRoomIds.entries()) {
    idx++;
    const rt = (await prisma.roomType.findUnique({ where: { id: roomTypeId } })) || (await prisma.roomType.findFirst());
    await prisma.room.create({
      data: {
        id: roomId,
        code: `ARCHIVED_${idx}`,
        name: `Ruangan Historis (${roomTypeId})`,
        roomTypeId: rt.id,
        qrToken: `ARCHIVED-${roomId}`,
        active: false,
        sortOrder: idx,
      },
    });
    console.log(`  ✓ Membuat ruangan arsip: ${roomId} (${roomTypeId})`);
  }
}

autoCreateMissingRooms().catch(console.error).finally(() => prisma.$disconnect());
