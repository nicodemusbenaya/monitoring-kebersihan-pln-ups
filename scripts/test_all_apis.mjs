import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testAllApis() {
  console.log("Testing all DB queries used by APIs...");

  // 1. Test Dashboard query
  try {
    const totalRooms = await prisma.room.count({ where: { active: true } });
    const rooms = await prisma.room.findMany({
      where: { active: true },
      include: {
        roomType: {
          include: {
            slots: { where: { active: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    console.log("✓ Dashboard rooms query OK, total:", totalRooms, rooms.length);
  } catch (e) {
    console.error("✗ Dashboard rooms query FAILED:", e);
  }

  // 2. Test Performance query
  try {
    const users = await prisma.user.findMany({
      where: { active: true, role: { in: ["PETUGAS", "SUPERVISOR"] } },
    });
    console.log("✓ Performance query OK, users:", users.length);
  } catch (e) {
    console.error("✗ Performance query FAILED:", e);
  }

  // 3. Test Scan query
  try {
    const token = "_csTcaAlvTXinBhSfcOkBhpD8k04HawIfyzvIovg5wU";
    const room = await prisma.room.findFirst({
      where: {
        OR: [{ qrToken: token }, { code: token }],
        active: true,
      },
      include: {
        roomType: {
          include: {
            slots: { where: { active: true } },
          },
        },
      },
    });
    console.log("✓ Scan query OK, room found:", room ? room.name : "null");
  } catch (e) {
    console.error("✗ Scan query FAILED:", e);
  }

  // 4. Test Export query
  try {
    const inspections = await prisma.inspection.findMany({
      where: {
        dateKey: { startsWith: "2026-09" },
        state: "SUBMITTED",
      },
      include: {
        slot: true,
        user: true,
      },
    });
    console.log("✓ Export query OK, inspections:", inspections.length);
  } catch (e) {
    console.error("✗ Export query FAILED:", e);
  }
}

testAllApis().catch(console.error).finally(() => prisma.$disconnect());
