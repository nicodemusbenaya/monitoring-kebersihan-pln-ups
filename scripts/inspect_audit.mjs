import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  });
  console.log("=== LATEST 30 AUDIT LOGS ===");
  for (const l of logs) {
    console.log(`[${l.createdAt.toISOString()}] User: ${l.user?.username || "SYSTEM"} | Action: ${l.action} | Entity: ${l.entityType} | Detail: ${l.detail}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
