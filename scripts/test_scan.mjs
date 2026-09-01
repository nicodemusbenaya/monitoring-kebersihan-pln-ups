import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testScan() {
  const token = "_csTcaAlvTXinBhSfcOkBhpD8k04HawIfyzvIovg5wU";
  const room = await prisma.room.findFirst({
    where: {
      OR: [{ qrToken: token }, { code: token }],
    },
    include: {
      roomType: {
        include: {
          slots: true,
        },
      },
    },
  });

  console.log("HASIL TEST SCAN TOKEN:");
  if (room) {
    console.log("✓ RUANGAN DITEMUKAN:", room.name, `(${room.code})`);
    console.log("✓ Tipe Ruangan:", room.roomType.name);
    console.log("✓ Jumlah Slot:", room.roomType.slots.length);
  } else {
    console.log("✗ Ruangan tidak ditemukan");
  }
}

testScan().catch(console.error).finally(() => prisma.$disconnect());
