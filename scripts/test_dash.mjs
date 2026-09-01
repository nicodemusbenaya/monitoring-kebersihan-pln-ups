import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDashboardData() {
  const today = new Date().toISOString().slice(0, 10);
  const totalRooms = await prisma.room.count({ where: { active: true } });
  const inspections = await prisma.inspection.findMany({ where: { dateKey: today } });
  console.log("Total Active Rooms:", totalRooms);
  console.log("Total Today Inspections:", inspections.length);
}

testDashboardData().catch(console.error).finally(() => prisma.$disconnect());
