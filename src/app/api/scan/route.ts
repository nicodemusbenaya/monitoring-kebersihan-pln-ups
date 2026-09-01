import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, formatDisplayDate } from "@/lib/utils";

function parseQrToken(raw: string): string {
  if (!raw) return "";
  let clean = String(raw).trim();

  // 1. If it's a full URL containing query parameters (?room=... or ?evaluate=...)
  if (clean.includes("?")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://dummy.com/${clean}`);
      const roomParam = url.searchParams.get("room");
      const evalParam = url.searchParams.get("evaluate");
      if (roomParam) return roomParam.trim();
      if (evalParam) return evalParam.trim();
    } catch {
      // fallback regex
      const match = clean.match(/[?&](?:room|evaluate)=([^&#]+)/i);
      if (match) return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. If it has prefix PLNUPS:ROOM:token
  if (clean.toUpperCase().startsWith("PLNUPS:ROOM:")) {
    return clean.slice(12).trim();
  }

  return clean;
}

async function processScan(tokenRaw: string, sessionUser: any) {
  const token = parseQrToken(tokenRaw);

  if (!token) {
    return { status: 400, body: { ok: false, message: "Token QR tidak valid." } };
  }

  const room = await prisma.room.findFirst({
    where: {
      OR: [
        { qrToken: token },
        { code: token },
        { id: token },
        { qrToken: { equals: token } },
        { code: { equals: token } },
      ],
      active: true,
    },
    include: {
      roomType: true,
    },
  });

  if (!room) {
    return {
      status: 404,
      body: { ok: false, message: `QR Code ruangan tidak valid (${token}) atau ruangan sudah tidak aktif.` },
    };
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
      details: {
        include: {
          activity: true,
        },
      },
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

  const payload = {
    ok: true,
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      qrToken: room.qrToken,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomType.name,
    },
    currentUser: {
      id: sessionUser.id,
      username: sessionUser.username,
      fullName: sessionUser.fullName,
      role: sessionUser.role,
    },
    scan: {
      scanId: scanEvent.id,
      scannedAt: scanEvent.scannedAt,
      displayTime: formatDisplayDate(scanEvent.scannedAt),
    },
    dateKey: today,
    scanTime: formatDisplayDate(scanEvent.scannedAt),
    slots: slots.map((s) => ({
      id: s.id,
      slotId: s.id,
      code: s.code,
      name: s.name,
      role: s.role,
      available: true,
      completed: Boolean(completedMap[s.id]),
      completedAt: completedMap[s.id]?.displayTime,
      officerName: completedMap[s.id]?.officerName,
      overallStatus: completedMap[s.id]?.overallStatus,
    })),
    activities: activities.map((a) => ({
      id: a.id,
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
    existingInspections: inspectionsToday,
    petugasResults,
  };

  return { status: 200, body: payload };
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenRaw = searchParams.get("token") || searchParams.get("room") || searchParams.get("qrToken") || "";

    const res = await processScan(tokenRaw, sessionUser);
    return NextResponse.json(res.body, { status: res.status });
  } catch (error: any) {
    console.error("GET /api/scan error:", error);
    return NextResponse.json({ ok: false, message: error.message || "Gagal memproses QR." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await request.json();
    const tokenRaw = body.token || body.qrToken || body.qrPayload || "";

    const res = await processScan(tokenRaw, sessionUser);
    return NextResponse.json(res.body, { status: res.status });
  } catch (error: any) {
    console.error("POST /api/scan error:", error);
    return NextResponse.json({ ok: false, message: error.message || "Gagal memproses QR." }, { status: 500 });
  }
}
