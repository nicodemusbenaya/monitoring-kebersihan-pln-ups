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

    const contentType = request.headers.get("content-type") || "";

    let roomId = "";
    let slotId = "";
    let scanId: string | null = null;
    let answers: any[] = [];
    let rawPhotos: (File | string)[] = [];

    // 1. Handle Multipart FormData or JSON
    if (contentType.includes("multipart/form-data") || contentType.includes("form-data")) {
      const formData = await request.formData();
      roomId = String(formData.get("roomId") || "").trim();
      slotId = String(formData.get("slotId") || "").trim();
      scanId = (formData.get("scanId") as string) || null;

      const rawItems = formData.get("items") || formData.get("answers");
      if (typeof rawItems === "string") {
        try {
          answers = JSON.parse(rawItems);
        } catch {
          answers = [];
        }
      }

      const photoFiles = formData.getAll("photos");
      if (photoFiles && photoFiles.length > 0) {
        rawPhotos = photoFiles as (File | string)[];
      }
    } else {
      const body = await request.json();
      roomId = String(body.roomId || "").trim();
      slotId = String(body.slotId || "").trim();
      scanId = body.scanId || null;
      answers = Array.isArray(body.answers) ? body.answers : Array.isArray(body.items) ? body.items : [];
      rawPhotos = Array.isArray(body.photos) ? body.photos : Array.isArray(body.evidenceDataList) ? body.evidenceDataList : [];
    }

    if (!slotId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ ok: false, message: "Data pemeriksaan / checklist tidak lengkap." }, { status: 400 });
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { roomType: true },
    });

    if (!slot || !slot.active) {
      return NextResponse.json({ ok: false, message: "Slot pemeriksaan tidak valid." }, { status: 400 });
    }

    // Resolve room from scanId or slot if roomId is missing
    if (!roomId && scanId) {
      const scan = await prisma.scanEvent.findUnique({ where: { id: scanId } });
      if (scan) roomId = scan.roomId;
    }

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

    // Count findings and validate notes
    let dirtyCount = 0;
    for (const a of answers) {
      if (a.qualityResult === "NEGATIVE" || a.functionResult === "NEGATIVE") {
        dirtyCount++;
        if (!a.note || !String(a.note).trim()) {
          return NextResponse.json(
            { ok: false, message: "Catatan wajib diisi pada setiap indikator yang memiliki temuan kotor/rusak." },
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

    // Process photo uploads sequentially to prevent network congestion on cellular / DDNS
    const photoRecords: { fileName: string; fileUrl: string; sortOrder: number }[] = [];
    for (let i = 0; i < rawPhotos.length; i++) {
      const item = rawPhotos[i];
      const photoName = `${evidenceBaseName}-${i + 1}.jpg`;
      let base64 = "";
      let photoContentType = "image/jpeg";

      if (typeof item === "object" && item !== null && "arrayBuffer" in item) {
        // It's a File / Blob
        const fileObj = item as File;
        photoContentType = fileObj.type || "image/jpeg";
        const buffer = Buffer.from(await fileObj.arrayBuffer());
        base64 = buffer.toString("base64");
      } else if (typeof item === "string") {
        if (item.startsWith("data:")) {
          const match = item.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            photoContentType = match[1];
            base64 = match[2];
          } else {
            base64 = item;
          }
        } else {
          base64 = item;
        }
      }

      let storedPath = `EVIDENCE/${today.replace(/-/g, "/")}/${photoName}`;

      if (base64) {
        try {
          const nasRes = await uploadEvidenceToNas({
            fileName: photoName,
            contentType: photoContentType,
            base64,
          });

          if (nasRes.ok && nasRes.path) {
            storedPath = nasRes.path;
          } else {
            console.error(`[SUBMIT_NAS_FAILED] Photo ${photoName} failed to upload to NAS: ${nasRes.message}`);
          }
        } catch (nasErr) {
          console.warn("NAS upload failed in submit route, fallback to default path:", nasErr);
        }
      }

      photoRecords.push({
        fileName: photoName,
        fileUrl: storedPath,
        sortOrder: i + 1,
      });
    }

    // Execute atomic transaction in Database
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
          scanId: scanId || null,
          scannedAt: now,
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
    if (error?.code === "P2002") {
      return NextResponse.json(
        { ok: false, message: "Pemeriksaan untuk slot ruangan ini sudah berhasil disimpan sebelumnya." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal menyimpan pemeriksaan." },
      { status: 500 }
    );
  }
}
