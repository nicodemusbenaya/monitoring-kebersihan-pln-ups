import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database PLN UPS...");

  const jsonPath = path.join(process.cwd(), "prisma", "seed_data.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("⚠️ File seed_data.json tidak ditemukan, melewati proses seeding.");
    return;
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(rawData);

  // 1. Room Types
  for (const rt of data.roomTypes || []) {
    await prisma.roomType.upsert({
      where: { id: rt.id },
      update: rt,
      create: rt,
    });
  }

  // 2. Rooms
  for (const r of data.rooms || []) {
    await prisma.room.upsert({
      where: { code: r.code },
      update: r,
      create: r,
    });
  }

  // 3. Slots
  for (const s of data.slots || []) {
    await prisma.slot.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }

  // 4. Activities
  for (const a of data.activities || []) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  // 5. Aspects
  for (const asp of data.aspects || []) {
    await prisma.evaluationAspect.upsert({
      where: { id: asp.id },
      update: asp,
      create: asp,
    });
  }

  // 6. Users (Do NOT overwrite passwordHash if user already exists)
  for (const u of data.users || []) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        role: u.role,
        active: u.active,
      },
      create: u,
    });
  }

  console.log("✨ Seeding data database selesai 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
    // Don't crash build if already seeded
  })
  .finally(() => prisma.$disconnect());
