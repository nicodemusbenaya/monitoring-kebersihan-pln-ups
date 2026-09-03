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

    const isToilet = room.roomType?.id === "TOILET" || room.roomType?.templateSheet === "TOILET" || room.roomType?.name.toLowerCase().includes("toilet");
    const numDays = room.roomType?.workDays || (isToilet ? 5 : 6);

    // Generate days from startDate
    const days: { dayIndex: number; dateKey: string; dateFormatted: string }[] = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < numDays; i++) {
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

    // Check which officers worked during the period
    const hasPagi = inspections.some((i) => (i.slot?.code || i.slotCode || "").toUpperCase().includes("PAGI"));
    const hasSore = inspections.some((i) => (i.slot?.code || i.slotCode || "").toUpperCase().includes("SORE"));

    const sulaimanPagi = inspections.some(
      (i) =>
        (i.user?.username === "sulaiman" || i.user?.fullName?.toLowerCase().includes("sulaiman")) &&
        (i.slot?.code || i.slotCode || "").toUpperCase().includes("PAGI")
    );
    const sulaimanSore = inspections.some(
      (i) =>
        (i.user?.username === "sulaiman" || i.user?.fullName?.toLowerCase().includes("sulaiman")) &&
        (i.slot?.code || i.slotCode || "").toUpperCase().includes("SORE")
    );

    const arifPagi = inspections.some(
      (i) =>
        (i.user?.username === "arif" || i.user?.fullName?.toLowerCase().includes("arif")) &&
        (i.slot?.code || i.slotCode || "").toUpperCase().includes("PAGI")
    ) || (!sulaimanPagi && hasPagi);

    const arifSore = inspections.some(
      (i) =>
        (i.user?.username === "arif" || i.user?.fullName?.toLowerCase().includes("arif")) &&
        (i.slot?.code || i.slotCode || "").toUpperCase().includes("SORE")
    ) || (!sulaimanSore && hasSore);

    const spvUser = inspections.find((i) => i.user?.role === "SUPERVISOR")?.user;

    // Build matrix of results: [activityId][dateKey][slotCode] -> { S, B, Y, T, isClean, isNormal, note }
    const matrix: Record<string, Record<string, Record<string, any>>> = {};
    room.roomType?.activities.forEach((act) => {
      matrix[act.id] = {};
      days.forEach((day) => {
        matrix[act.id][day.dateKey] = {};
      });
    });

    inspections.forEach((insp) => {
      const sCode = (insp.slot?.code || insp.slotCode || "PAGI").toUpperCase();
      insp.details.forEach((dt) => {
        if (matrix[dt.activityId] && matrix[dt.activityId][insp.dateKey]) {
          const isClean = dt.qualityResult !== "NEGATIVE" && dt.qualityResult !== "KOTOR";
          const isNormal =
            dt.functionResult !== "NEGATIVE" &&
            dt.functionResult !== "RUSAK" &&
            dt.functionResult !== "TIDAK";

          matrix[dt.activityId][insp.dateKey][sCode] = {
            qualityResult: dt.qualityResult,
            functionResult: dt.functionResult,
            isClean,
            isNormal,
            // S: Sudah, B: Belum, Y: Ya/Normal, T: Tidak/Rusak - pastikan terisi penuh
            S: isClean ? "v" : "",
            B: !isClean ? "v" : "",
            Y: isNormal ? "v" : "",
            T: !isNormal ? "v" : "",
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
          isToilet,
          workDays: numDays,
        },
        startDate,
        endDate: days[days.length - 1].dateKey,
        days,
        slots: room.roomType?.slots || [],
        activities: room.roomType?.activities || [],
        officersStatus: {
          arif: { pagi: arifPagi, sore: arifSore },
          sulaiman: { pagi: sulaimanPagi, sore: sulaimanSore },
          supervisor: spvUser?.fullName || "Ipal Hapidz",
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
