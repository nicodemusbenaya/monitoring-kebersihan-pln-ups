import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const scans = await prisma.scanEvent.findMany({
    take: 30,
    orderBy: { scannedAt: "desc" },
    include: {
      room: { select: { name: true, code: true } },
      user: { select: { username: true } },
    },
  });

  console.log(`=== LATEST 30 SCAN EVENTS ===`);
  for (const s of scans) {
    console.log(`[${s.scannedAt.toISOString()}] User: ${s.user.username} | Room: ${s.room.name} (${s.room.code}) | Payload: ${s.qrPayload} | UA: ${s.userAgent || "-"}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
