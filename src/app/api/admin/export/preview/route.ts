import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const startDate = searchParams.get("startDate") || todayKey();

    // Default to first room if not specified
    const room = roomId
      ? await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            roomType: {
              include: {
                activities: { orderBy: { sortOrder: "asc" } },
                slots: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        })
      : await prisma.room.findFirst({
          where: { active: true },
          include: {
            roomType: {
              include: {
                activities: { orderBy: { sortOrder: "asc" } },
                slots: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        });

    if (!room) {
      return NextResponse.json({ ok: false, message: "Ruangan tidak ditemukan." }, { status: 404 });
    }

    // Generate 6 days from startDate
    const days: { dayIndex: number; dateKey: string; dateFormatted: string }[] = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      const dateFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);

      days.push({
        dayIndex: i + 1,
        dateKey,
        dateFormatted,
      });
    }

    const dateKeys = days.map((d) => d.dateKey);

    const inspections = await prisma.inspection.findMany({
      where: {
        roomId: room.id,
        dateKey: { in: dateKeys },
        state: "SUBMITTED",
      },
      include: {
        slot: true,
        user: true,
        details: {
          include: { activity: true },
        },
        photos: true,
      },
    });

    let totalResultsCount = 0;
    inspections.forEach((i) => {
      totalResultsCount += i.details.length;
    });

    // Check which officers worked on startDate
    const day1Inspections = inspections.filter((i) => i.dateKey === startDate);
    const arifPagi = day1Inspections.some(
      (i) =>
        (i.user?.username === "arif" || i.user?.fullName.toLowerCase().includes("arif")) &&
        (i.slot?.code?.includes("PAGI") || i.slotCode?.includes("PAGI"))
    );
    const arifSore = day1Inspections.some(
      (i) =>
        (i.user?.username === "arif" || i.user?.fullName.toLowerCase().includes("arif")) &&
        (i.slot?.code?.includes("SORE") || i.slotCode?.includes("SORE"))
    );
    const sulaimanPagi = day1Inspections.some(
      (i) =>
        (i.user?.username === "sulaiman" || i.user?.fullName.toLowerCase().includes("sulaiman")) &&
        (i.slot?.code?.includes("PAGI") || i.slotCode?.includes("PAGI"))
    );
    const sulaimanSore = day1Inspections.some(
      (i) =>
        (i.user?.username === "sulaiman" || i.user?.fullName.toLowerCase().includes("sulaiman")) &&
        (i.slot?.code?.includes("SORE") || i.slotCode?.includes("SORE"))
    );

    // Build matrix of results: [activityId][dateKey][slotCode] -> { S, B, Y, T, isClean, isNormal, note }
    const matrix: Record<string, Record<string, Record<string, any>>> = {};
    room.roomType?.activities.forEach((act) => {
      matrix[act.id] = {};
      days.forEach((day) => {
        matrix[act.id][day.dateKey] = {};
      });
    });

    inspections.forEach((insp) => {
      const sCode = insp.slot?.code || insp.slotCode || "PAGI";
      insp.details.forEach((dt) => {
        if (matrix[dt.activityId] && matrix[dt.activityId][insp.dateKey]) {
          const isClean = dt.qualityResult === "POSITIVE" || dt.qualityResult === "BERSIH";
          const isNormal =
            dt.functionResult === "POSITIVE" ||
            dt.functionResult === "NORMAL" ||
            dt.functionResult === "BERFUNGSI";

          matrix[dt.activityId][insp.dateKey][sCode] = {
            qualityResult: dt.qualityResult,
            functionResult: dt.functionResult,
            isClean,
            isNormal,
            // S: Sudah, B: Belum, Y: Ya/Normal, T: Tidak/Rusak
            S: isClean ? "v" : "",
            B: !isClean && dt.qualityResult === "NEGATIVE" ? "v" : "",
            Y: isNormal ? "v" : "",
            T: !isNormal && dt.functionResult === "NEGATIVE" ? "v" : "",
            note: dt.note || null,
          };
        }
      });
    });

    return NextResponse.json({
      ok: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          typeName: room.roomType?.name,
          isToilet: room.roomType?.id === "TOILET" || room.roomType?.templateSheet === "TOILET",
        },
        startDate,
        endDate: days[days.length - 1].dateKey,
        days,
        slots: room.roomType?.slots || [],
        activities: room.roomType?.activities || [],
        officersStatus: {
          arif: { pagi: arifPagi, sore: arifSore },
          sulaiman: { pagi: sulaimanPagi, sore: sulaimanSore },
          supervisor: "Ipal Hapidz",
        },
        matrix,
        totalInspections: inspections.length,
        totalResultsCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal memuat preview workbook." },
      { status: 500 }
    );
  }
}
