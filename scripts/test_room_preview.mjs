import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRoomPreview() {
  const room = await prisma.room.findFirst({
    where: { name: { contains: "Ruang Rapat G. Utama" } },
    include: {
      roomType: {
        include: {
          activities: { orderBy: { sortOrder: "asc" } },
          slots: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  console.log("Room:", room?.name, "Type:", room?.roomType?.name);
  console.log("Activities:", room?.roomType?.activities.map((a, i) => `${i + 1}. ${a.name}`));
  console.log("Slots:", room?.roomType?.slots.map((s) => s.name));

  const inspections = await prisma.inspection.findMany({
    where: { roomId: room?.id, dateKey: "2026-09-01", state: "SUBMITTED" },
    include: {
      details: { include: { activity: true } },
      user: true,
      slot: true,
    },
  });

  console.log("Inspections found for 2026-09-01:", inspections.length);
  inspections.forEach((i) => {
    console.log(`Slot: ${i.slot.name}, User: ${i.user.fullName}, Details: ${i.details.length}`);
  });
}

checkRoomPreview().catch(console.error).finally(() => prisma.$disconnect());
