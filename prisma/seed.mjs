import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai sinkronisasi master data ke Neon PostgreSQL...");

  const jsonPath = path.join(process.cwd(), "prisma", "seed_data.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("⚠️ File seed_data.json tidak ditemukan, melewati proses seeding.");
    return;
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(rawData);

  // 1. Users
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

  // 2. Room Types
  for (const rt of data.roomTypes || []) {
    await prisma.roomType.upsert({
      where: { id: rt.id },
      update: rt,
      create: rt,
    });
  }

  // 3. Rooms
  for (const r of data.rooms || []) {
    await prisma.room.upsert({
      where: { code: r.code },
      update: r,
      create: r,
    });
  }

  // 4. Slots
  for (const s of data.slots || []) {
    await prisma.slot.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }

  // 5. Activities
  for (const a of data.activities || []) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  // 6. Aspects
  for (const asp of data.aspects || []) {
    await prisma.evaluationAspect.upsert({
      where: { id: asp.id },
      update: asp,
      create: asp,
    });
  }

  // 7. Historical data (only if empty)
  const existingCount = await prisma.inspection.count();
  if (existingCount === 0 && data.inspections && data.inspections.length > 0) {
    const validUserIds = new Set((data.users || []).map((u) => u.id));
    const fallbackUserId = data.users?.[0]?.id || "USR-admin";

    const formattedInspections = data.inspections.map((i) => ({
      id: i.id,
      dateKey: i.dateKey,
      weekStart: i.weekStart,
      dayNumber: i.dayNumber,
      roomId: i.roomId,
      roomTypeId: i.roomTypeId,
      slotId: i.slotId,
      slotCode: i.slotCode,
      userId: validUserIds.has(i.userId) ? i.userId : fallbackUserId,
      scanId: i.scanId || null,
      scannedAt: new Date(i.scannedAt),
      submittedAt: new Date(i.submittedAt),
      overallStatus: i.overallStatus,
      dirtyCount: i.dirtyCount || 0,
      evidenceName: i.evidenceName || null,
      state: i.state || "SUBMITTED",
      backupStatus: i.backupStatus || "SYNCED",
      reopenedAt: i.reopenedAt ? new Date(i.reopenedAt) : null,
      reopenedBy: i.reopenedBy || null,
    }));

    await prisma.inspection.createMany({
      data: formattedInspections,
      skipDuplicates: true,
    });

    const insertedInspections = await prisma.inspection.findMany({ select: { id: true } });
    const insertedInspIdSet = new Set(insertedInspections.map((i) => i.id));
    const validActivityIds = new Set((data.activities || []).map((a) => a.id));

    if (data.inspectionDetails && data.inspectionDetails.length > 0) {
      const validDetails = data.inspectionDetails
        .filter((d) => insertedInspIdSet.has(d.inspectionId) && validActivityIds.has(d.activityId))
        .map((d) => ({
          id: d.id,
          inspectionId: d.inspectionId,
          activityId: d.activityId,
          qualityResult: d.qualityResult || "NA",
          qualityLabel: d.qualityLabel || null,
          functionResult: d.functionResult || "NA",
          functionLabel: d.functionLabel || null,
          note: d.note || null,
          correctedAt: d.correctedAt ? new Date(d.correctedAt) : null,
          correctedBy: d.correctedBy || null,
        }));

      const chunkSize = 1000;
      for (let i = 0; i < validDetails.length; i += chunkSize) {
        await prisma.inspectionDetail.createMany({
          data: validDetails.slice(i, i + chunkSize),
          skipDuplicates: true,
        });
      }
    }

    if (data.inspectionPhotos && data.inspectionPhotos.length > 0) {
      const validPhotos = data.inspectionPhotos
        .filter((p) => insertedInspIdSet.has(p.inspectionId))
        .map((p) => ({
          id: p.id,
          inspectionId: p.inspectionId,
          fileName: p.fileName,
          fileUrl: p.fileUrl,
          sortOrder: p.sortOrder || 1,
          capturedAt: new Date(p.capturedAt),
        }));

      await prisma.inspectionPhoto.createMany({
        data: validPhotos,
        skipDuplicates: true,
      });
    }

    const validRoomIds = new Set((data.rooms || []).map((r) => r.id));
    if (data.evaluations && data.evaluations.length > 0) {
      const validEvals = data.evaluations
        .filter((e) => validRoomIds.has(e.roomId))
        .map((e) => ({
          id: e.id,
          roomId: e.roomId,
          roomTypeId: e.roomTypeId,
          rating: e.rating,
          ratingLabel: e.ratingLabel,
          aspectCodes: typeof e.aspectCodes === "string" ? e.aspectCodes : JSON.stringify(e.aspectCodes || []),
          comment: e.comment || null,
          dateKey: e.dateKey,
          weekStart: e.weekStart || null,
          monthKey: e.monthKey,
          submittedAt: new Date(e.submittedAt),
          source: e.source || "QR_ANONYMOUS",
          userAgent: e.userAgent || null,
        }));

      await prisma.evaluation.createMany({
        data: validEvals,
        skipDuplicates: true,
      });
    }
  }

  console.log("✨ Sinkronisasi database Neon PostgreSQL selesai 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
  })
  .finally(() => prisma.$disconnect());
