import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, formatDisplayDate } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { qrToken, qrPayload } = await request.json();
    let token = String(qrToken || "").trim();

    if (!token && qrPayload) {
      const payloadStr = String(qrPayload).trim();
      const match = payloadStr.match(/^PLNUPS:ROOM:(.+)$/i);
      token = match ? match[1] : payloadStr;
    }

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token QR tidak valid." }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ qrToken: token }, { code: token }],
        active: true,
      },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { ok: false, message: "QR Code ruangan tidak valid atau ruangan sudah tidak aktif." },
        { status: 404 }
      );
    }

    const today = todayKey();

    // Record scan event
    const scanEvent = await prisma.scanEvent.create({
      data: {
        roomId: room.id,
        userId: sessionUser.id,
        qrPayload: token,
      },
    });

    // Fetch slots for this room type and user role
    const slots = await prisma.slot.findMany({
      where: {
        roomTypeId: room.roomTypeId,
        active: true,
        role: sessionUser.role === "ADMIN" ? undefined : sessionUser.role,
      },
      orderBy: { sortOrder: "asc" },
    });

    // Fetch today's submitted inspections for this room
    const inspectionsToday = await prisma.inspection.findMany({
      where: {
        roomId: room.id,
        dateKey: today,
        state: "SUBMITTED",
      },
      include: {
        user: { select: { fullName: true } },
        slot: true,
      },
    });

    const completedMap: Record<string, any> = {};
    for (const insp of inspectionsToday) {
      completedMap[insp.slotId] = {
        inspectionId: insp.id,
        slotName: insp.slot.name,
        officerName: insp.user.fullName,
        submittedAt: insp.submittedAt,
        displayTime: formatDisplayDate(insp.submittedAt),
        overallStatus: insp.overallStatus,
        dirtyCount: insp.dirtyCount,
      };
    }

    // Fetch activities / 5S indicators
    const activities = await prisma.activity.findMany({
      where: {
        roomTypeId: room.roomTypeId,
        active: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    // Fetch prior petugas results if supervisor
    const petugasResults =
      sessionUser.role === "SUPERVISOR"
        ? inspectionsToday
            .filter((i) => i.slot.role === "PETUGAS")
            .map((i) => ({
              slotName: i.slot.name,
              officerName: i.user.fullName,
              displayTime: formatDisplayDate(i.submittedAt),
              overallStatus: i.overallStatus,
              dirtyCount: i.dirtyCount,
            }))
        : [];

    return NextResponse.json({
      ok: true,
      data: {
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          qrToken: room.qrToken,
          roomTypeId: room.roomTypeId,
          roomTypeName: room.roomType.name,
        },
        scan: {
          scanId: scanEvent.id,
          scannedAt: scanEvent.scannedAt,
          displayTime: formatDisplayDate(scanEvent.scannedAt),
        },
        dateKey: today,
        slots: slots.map((s) => ({
          slotId: s.id,
          code: s.code,
          name: s.name,
          role: s.role,
          completed: completedMap[s.id] || null,
        })),
        activities: activities.map((a) => ({
          activityId: a.id,
          name: a.name,
          standardCategory: a.standardCategory,
          standardText: a.standardText,
          qualityApplicable: a.qualityApplicable,
          qualityPositive: a.qualityPositive,
          qualityNegative: a.qualityNegative,
          functionApplicable: a.functionApplicable,
          functionPositive: a.functionPositive,
          functionNegative: a.functionNegative,
        })),
        petugasResults,
      },
    });
  } catch (error: any) {
    console.error("Scan room error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal memproses pemindaian ruangan." },
      { status: 500 }
    );
  }
}
