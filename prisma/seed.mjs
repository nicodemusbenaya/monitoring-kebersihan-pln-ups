import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database PLN UPS (Master & Riwayat)...");

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

  // 6. Users (Ensure default password is set)
  for (const u of data.users || []) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        role: u.role,
        passwordHash: u.passwordHash,
        active: u.active,
      },
      create: u,
    });
  }

  // 7. Historical Inspections & Details
  const existingCount = await prisma.inspection.count();
  if (existingCount === 0 && data.inspections && data.inspections.length > 0) {
    console.log(`📦 Memasukkan ${data.inspections.length} data riwayat inspeksi...`);
    const formattedInspections = data.inspections.map((i) => ({
      ...i,
      scannedAt: new Date(i.scannedAt),
      submittedAt: new Date(i.submittedAt),
    }));
    await prisma.inspection.createMany({
      data: formattedInspections,
    });

    if (data.inspectionDetails && data.inspectionDetails.length > 0) {
      console.log(`📦 Memasukkan ${data.inspectionDetails.length} detail checklist 5S...`);
      const chunkSize = 1000;
      for (let i = 0; i < data.inspectionDetails.length; i += chunkSize) {
        const chunk = data.inspectionDetails.slice(i, i + chunkSize);
        await prisma.inspectionDetail.createMany({
          data: chunk,
        });
      }
    }

    if (data.inspectionPhotos && data.inspectionPhotos.length > 0) {
      console.log(`📦 Memasukkan ${data.inspectionPhotos.length} foto log bukti...`);
      const formattedPhotos = data.inspectionPhotos.map((p) => ({
        ...p,
        capturedAt: new Date(p.capturedAt),
      }));
      await prisma.inspectionPhoto.createMany({
        data: formattedPhotos,
      });
    }

    if (data.evaluations && data.evaluations.length > 0) {
      console.log(`📦 Memasukkan ${data.evaluations.length} evaluasi kepuasan...`);
      const formattedEvals = data.evaluations.map((e) => ({
        ...e,
        submittedAt: new Date(e.submittedAt),
      }));
      await prisma.evaluation.createMany({
        data: formattedEvals,
      });
    }
  }

  console.log("✨ Seeding data database & riwayat inspeksi selesai 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
  })
  .finally(() => prisma.$disconnect());
