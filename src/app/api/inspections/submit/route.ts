import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, formatDisplayDate } from "@/lib/utils";
import { uploadEvidenceToNas } from "@/lib/nas";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await request.json();
    const { scanId, slotId, answers, photos, evidenceDataList } = body;

    const photoList = Array.isArray(photos) ? photos : Array.isArray(evidenceDataList) ? evidenceDataList : [];

    if (!slotId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ ok: false, message: "Data pemeriksaan tidak lengkap." }, { status: 400 });
    }

    if (photoList.length === 0) {
      return NextResponse.json({ ok: false, message: "Minimal 1 foto evidence wajib dilampirkan." }, { status: 400 });
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { roomType: true },
    });

    if (!slot || !slot.active) {
      return NextResponse.json({ ok: false, message: "Slot pemeriksaan tidak valid." }, { status: 400 });
    }

    // Resolve room from scanId or slot
    let scan = scanId ? await prisma.scanEvent.findUnique({ where: { id: scanId } }) : null;
    let roomId = scan ? scan.roomId : body.roomId;

    if (!roomId) {
      return NextResponse.json({ ok: false, message: "Ruangan tidak ditemukan." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.active) {
      return NextResponse.json({ ok: false, message: "Ruangan sudah tidak aktif." }, { status: 400 });
    }

    const today = todayKey();

    // Check if slot already submitted today
    const existing = await prisma.inspection.findFirst({
      where: {
        roomId: room.id,
        slotId: slot.id,
        dateKey: today,
        state: "SUBMITTED",
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Slot pemeriksaan ini sudah diisi untuk hari ini." },
        { status: 409 }
      );
    }

    // Count findings
    let dirtyCount = 0;
    for (const a of answers) {
      if (a.qualityResult === "NEGATIVE" || a.functionResult === "NEGATIVE") {
        dirtyCount++;
        if (!a.note || !String(a.note).trim()) {
          return NextResponse.json(
            { ok: false, message: "Catatan wajib diisi pada setiap indikator yang memiliki temuan." },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();
    const dayNumber = now.getDay() === 0 ? 7 : now.getDay();
    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - (dayNumber - 1));
    const weekStart = weekStartDate.toISOString().split("T")[0];

    const evidenceBaseName = `${room.code}-${today}-${slot.code}-${Date.now()}`;

    // Process photo uploads
    const photoRecords: { fileName: string; fileUrl: string; sortOrder: number }[] = [];

    for (let i = 0; i < photoList.length; i++) {
      const dataUrl = photoList[i];
      const photoName = `${evidenceBaseName}-${i + 1}.jpg`;

      // Extract base64
      let base64 = dataUrl;
      let contentType = "image/jpeg";
      if (dataUrl.startsWith("data:")) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          contentType = match[1];
          base64 = match[2];
        }
      }

      // Upload to QNAP NAS
      const nasRes = await uploadEvidenceToNas({
        fileName: photoName,
        contentType,
        base64,
      });

      photoRecords.push({
        fileName: photoName,
        fileUrl: nasRes.ok && nasRes.path ? nasRes.path : dataUrl.slice(0, 500), // fallback reference
        sortOrder: i + 1,
      });
    }

    // Execute atomic transaction in SQLite/Database
    const result = await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          dateKey: today,
          weekStart,
          dayNumber,
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          slotId: slot.id,
          slotCode: slot.code,
          userId: sessionUser.id,
          scanId: scan?.id || null,
          scannedAt: scan?.scannedAt || now,
          submittedAt: now,
          overallStatus: dirtyCount > 0 ? "ADA_TEMUAN" : "BERSIH",
          dirtyCount,
          evidenceName: evidenceBaseName,
          state: "SUBMITTED",
          backupStatus: "SYNCED",
          details: {
            create: answers.map((a: any) => ({
              activityId: a.activityId,
              qualityResult: a.qualityResult || "NA",
              qualityLabel: a.qualityLabel || null,
              functionResult: a.functionResult || "NA",
              functionLabel: a.functionLabel || null,
              note: a.note ? String(a.note).trim() : null,
            })),
          },
          photos: {
            create: photoRecords.map((p) => ({
              fileName: p.fileName,
              fileUrl: p.fileUrl,
              sortOrder: p.sortOrder,
              capturedAt: now,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: "SUBMIT_INSPECTION",
          entityType: "INSPECTION",
          entityId: inspection.id,
          detail: JSON.stringify({
            roomCode: room.code,
            slotCode: slot.code,
            dirtyCount,
            photoCount: photoRecords.length,
          }),
        },
      });

      return inspection;
    });

    return NextResponse.json({
      ok: true,
      data: {
        inspectionId: result.id,
        roomName: room.name,
        slotName: slot.name,
        submittedAt: result.submittedAt,
        displayTime: formatDisplayDate(result.submittedAt),
        overallStatus: result.overallStatus,
        dirtyCount: result.dirtyCount,
        photoCount: photoRecords.length,
      },
      message: "Pemeriksaan berhasil disimpan.",
    });
  } catch (error: any) {
    console.error("Submit inspection error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal menyimpan pemeriksaan." },
      { status: 500 }
    );
  }
}
