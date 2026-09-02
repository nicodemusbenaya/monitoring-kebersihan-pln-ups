import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, monthKey, monthEndKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const today = todayKey();
    const currentMonth = monthKey();

    const startDate = searchParams.get("startDate") || `${currentMonth}-01`;
    const endDate = searchParams.get("endDate") || monthEndKey(currentMonth);

    const hiddenIds = (await prisma.room.findMany({ where: { hidden: true }, select: { id: true } })).map((r) => r.id);
    const hiddenFilter = hiddenIds.length > 0 ? { roomId: { notIn: hiddenIds } } : {};
    const totalRooms = await prisma.room.count({ where: { active: true, hidden: false } });
    const allRooms = await prisma.room.findMany({ where: { active: true, hidden: false } });

    // Strictly cleaning officers (role PETUGAS, exclude test/admin/spv)
    const officers = await prisma.user.findMany({
      where: {
        role: "PETUGAS",
        active: true,
        NOT: { username: "test" },
      },
      select: { id: true, username: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });

    const inspections = await prisma.inspection.findMany({
      where: {
        dateKey: { gte: startDate, lte: endDate },
        state: "SUBMITTED",
        ...(hiddenFilter as any),
      },
      include: {
        room: true,
        slot: true,
        user: true,
      },
    });

    const evaluations = await prisma.evaluation.findMany({
      where: {
        dateKey: { gte: startDate, lte: endDate },
        ...(hiddenFilter as any),
      },
    });

    // Calculate total days in the selected period
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    const validStartTime = isNaN(dStart.getTime()) ? Date.now() : dStart.getTime();
    const validEndTime = isNaN(dEnd.getTime()) ? Date.now() : dEnd.getTime();
    const diffTime = Math.abs(validEndTime - validStartTime);
    const totalDaysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const cleanInspections = inspections.filter((i) => i.overallStatus === "BERSIH").length;
    const findingInspections = inspections.filter((i) => i.overallStatus === "ADA_TEMUAN").length;
    const cleanlinessRate = inspections.length > 0 ? Math.round((cleanInspections / inspections.length) * 100) : 100;

    const totalEvals = evaluations.length;
    const avgRating = totalEvals > 0 ? (evaluations.reduce((acc, curr) => acc + curr.rating, 0) / totalEvals).toFixed(1) : "0";

    // Overall uncovered rooms in this period
    const allInspectedRoomIds = new Set(inspections.map((i) => i.roomId));
    const uncoveredRoomsOverall = allRooms.filter((r) => !allInspectedRoomIds.has(r.id)).map((r) => r.name);

    let activeOfficersCount = 0;

    const officerStats = officers.map((officer) => {
      const userInsps = inspections.filter((i) => i.userId === officer.id);
      const totalCompleted = userInsps.length;
      if (totalCompleted > 0) activeOfficersCount++;

      const cleanCount = userInsps.filter((i) => i.overallStatus === "BERSIH").length;
      const findingsCount = userInsps.filter((i) => i.overallStatus === "ADA_TEMUAN").length;
      const cleanPercentage = totalCompleted > 0 ? Math.round((cleanCount / totalCompleted) * 100) : 100;

      const morningCount = userInsps.filter((i) => i.slot?.code?.includes("PAGI")).length;
      const noonCount = userInsps.filter((i) => i.slot?.code?.includes("SIANG")).length;
      const afternoonCount = userInsps.filter((i) => i.slot?.code?.includes("SORE")).length;

      const coveredRoomIds = new Set(userInsps.map((i) => i.roomId));
      const coveredRoomsCount = coveredRoomIds.size;
      const coveragePercentage = totalRooms > 0 ? Math.round((coveredRoomsCount / totalRooms) * 100) : 0;
      const uncoveredRooms = allRooms.filter((r) => !coveredRoomIds.has(r.id)).map((r) => r.name);

      const activeDates = new Set(userInsps.map((i) => i.dateKey));
      const activeDaysCount = activeDates.size;
      const activeDaysPercentage = ((activeDaysCount / totalDaysInPeriod) * 100).toFixed(1);
      const avgRoomsPerActiveDay = activeDaysCount > 0 ? Math.round(totalCompleted / activeDaysCount) : 0;

      return {
        id: officer.id,
        username: officer.username,
        fullName: officer.fullName,
        role: officer.role,
        totalCompleted,
        cleanCount,
        findingsCount,
        cleanPercentage,
        morningCount,
        noonCount,
        afternoonCount,
        coveredRoomsCount,
        coveragePercentage,
        uncoveredRooms,
        uncoveredCount: uncoveredRooms.length,
        activeDaysCount,
        activeDaysPercentage,
        avgRoomsPerActiveDay,
        score: cleanPercentage,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        startDate,
        endDate,
        summary: {
          totalInspections: inspections.length,
          activeOfficersCount: activeOfficersCount > 0 ? activeOfficersCount : officers.length,
          totalRegisteredOfficers: officers.length,
          cleanlinessRate,
          dirtyCount: findingInspections,
          avgRating,
          totalEvaluations: totalEvals,
        },
        uncoveredRoomsOverall,
        uncoveredRoomsCount: uncoveredRoomsOverall.length,
        officers: officerStats,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat performa petugas." }, { status: 500 });
  }
}
