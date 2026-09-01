import ExcelJS from "exceljs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testInspRow() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  const v = inspSheet.getRow(2).values;

  console.log("v[5] RoomId:", v[5]);
  console.log("v[7] SlotId:", v[7]);
  console.log("v[9] UserId:", v[9]);

  const room = await prisma.room.findUnique({ where: { id: String(v[5]) } });
  const slot = await prisma.slot.findUnique({ where: { id: String(v[7]) } });
  const user = await prisma.user.findUnique({ where: { id: String(v[9]) } });

  console.log("Room found:", room ? room.name : "null");
  console.log("Slot found:", slot ? slot.name : "null");
  console.log("User found:", user ? user.username : "null");
}

testInspRow().catch(console.error).finally(() => prisma.$disconnect());
