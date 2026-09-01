import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testPerformanceCalc() {
  const startDate = "2026-08-01";
  const endDate = "2026-09-30";

  const totalRooms = await prisma.room.count({ where: { active: true } });
  const allRooms = await prisma.room.findMany({ where: { active: true } });

  const officers = await prisma.user.findMany({
    where: { role: "PETUGAS", active: true, NOT: { username: "test" } },
    select: { id: true, username: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  const inspections = await prisma.inspection.findMany({
    where: {
      dateKey: { gte: startDate, lte: endDate },
      state: "SUBMITTED",
    },
    include: { room: true, slot: true, user: true },
  });

  console.log("Registered Cleaning Officers:", officers.map(o => `${o.fullName} (@${o.username})`));
  console.log("Total Inspections in Period:", inspections.length);

  const officerStats = officers.map((officer) => {
    const userInsps = inspections.filter((i) => i.userId === officer.id);
    const coveredRoomIds = new Set(userInsps.map((i) => i.roomId));
    const coveredRoomsCount = coveredRoomIds.size;
    const uncoveredRooms = allRooms.filter((r) => !coveredRoomIds.has(r.id)).map((r) => r.name);
    const activeDates = new Set(userInsps.map((i) => i.dateKey));

    return {
      id: officer.id,
      username: officer.username,
      fullName: officer.fullName,
      totalCompleted: userInsps.length,
      coveredRoomsCount,
      coveragePercentage: totalRooms > 0 ? ((coveredRoomsCount / totalRooms) * 100).toFixed(1) : "0.0",
      uncoveredRooms,
      uncoveredCount: uncoveredRooms.length,
      activeDaysCount: activeDates.size,
    };
  });

  console.log("Officer Stats:", officerStats);

  // Overall uncovered rooms in this period
  const allInspectedRoomIds = new Set(inspections.map((i) => i.roomId));
  const uncoveredRoomsOverall = allRooms.filter((r) => !allInspectedRoomIds.has(r.id)).map((r) => r.name);
  console.log(`Uncovered Rooms Overall (${uncoveredRoomsOverall.length}):`, uncoveredRoomsOverall);
}

testPerformanceCalc().catch(console.error).finally(() => prisma.$disconnect());
