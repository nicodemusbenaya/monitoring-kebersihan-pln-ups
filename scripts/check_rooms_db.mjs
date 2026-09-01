import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRooms() {
  const rooms = await prisma.room.findMany({
    include: {
      roomType: true,
    },
  });

  console.log(`Total ruangan di database saat ini: ${rooms.length}`);
  rooms.forEach((r) => {
    console.log(`- ${r.name} (${r.code}): qrToken='${r.qrToken}' active=${r.active}`);
  });
}

checkRooms().catch(console.error).finally(() => prisma.$disconnect());
