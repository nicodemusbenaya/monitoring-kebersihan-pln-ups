import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, monthKey, formatDisplayDate } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const selectedMonth = searchParams.get("month") || monthKey();
    const selectedRoomId = searchParams.get("roomId");
    const today = todayKey();
    const startDate = searchParams.get("startDate") || today;
    const endDate = searchParams.get("endDate") || today;
    const daysCount = Math.max(1, parseInt(searchParams.get("daysCount") || "1", 10) || 1);

    const roomWhere: any = selectedRoomId && selectedRoomId !== "ALL" ? { id: selectedRoomId, active: true, hidden: false } : { active: true, hidden: false };

    // 1. Total rooms and active rooms (hidden excluded from display)
    const hiddenRoomIdsForFilter = (await prisma.room.findMany({ where: { hidden: true }, select: { id: true } })).map((r: any) => r.id);
    const hiddenFilter = hiddenRoomIdsForFilter.length > 0 ? { roomId: { notIn: hiddenRoomIdsForFilter } } : {};
    const totalRooms = await prisma.room.count({ where: { active: true, hidden: false } });
    const rooms = await prisma.room.findMany({
      where: roomWhere,
      include: {
        roomType: {
          include: {
            slots: { where: { active: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // 2. Submitted inspections for the requested period (exclude hidden rooms)
    const dateFilter =
      startDate === endDate
        ? { dateKey: startDate }
        : { dateKey: { gte: startDate, lte: endDate } };

    const todayInspections = await prisma.inspection.findMany({
      where: {
        ...dateFilter,
        state: "SUBMITTED",
        ...(hiddenFilter as any),
        ...(selectedRoomId && selectedRoomId !== "ALL" ? { roomId: selectedRoomId } : {}),
      },
      include: { room: true, slot: true, user: true, photos: true },
      orderBy: { submittedAt: "desc" },
    });

    const todayCleanCount = todayInspections.filter((i) => i.overallStatus === "BERSIH").length;
    const todayFindingCount = todayInspections.filter((i) => i.overallStatus === "ADA_TEMUAN").length;

    // 3. Monthly evaluations
    const monthlyEvaluations = await prisma.evaluation.findMany({
      where: {
        monthKey: selectedMonth,
        ...(selectedRoomId && selectedRoomId !== "ALL" ? { roomId: selectedRoomId } : {}),
      },
    });

    const totalEvals = monthlyEvaluations.length;
    const avgRating =
      totalEvals > 0
        ? (monthlyEvaluations.reduce((acc, curr) => acc + curr.rating, 0) / totalEvals).toFixed(1)
        : "0.0";
    const satisfactionRate =
      totalEvals > 0
        ? Math.round(
            (monthlyEvaluations.filter((e) => e.rating >= 3).length / totalEvals) * 100
          )
        : 0;

    // Rating distribution
    const ratingDist: Record<number, number> = { 4: 0, 3: 0, 2: 0, 1: 0 };
    monthlyEvaluations.forEach((ev) => {
      if (ratingDist[ev.rating] !== undefined) {
        ratingDist[ev.rating]++;
      }
    });

    // 4. Monthly Inspections & Daily Trend (exclude hidden)
    const monthlyInspections = await prisma.inspection.findMany({
      where: {
        dateKey: { startsWith: selectedMonth },
        state: "SUBMITTED",
        ...(hiddenFilter as any),
        ...(selectedRoomId && selectedRoomId !== "ALL" ? { roomId: selectedRoomId } : {}),
      },
      select: {
        dateKey: true,
        overallStatus: true,
        dirtyCount: true,
      },
    });

    // Days in selected month (e.g. 30 or 31)
    const [yearStr, monthStr] = selectedMonth.split("-");
    const yearNum = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthNum = parseInt(monthStr, 10) || new Date().getMonth() + 1;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const dayMap: Record<number, { total: number; clean: number; finding: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = { total: 0, clean: 0, finding: 0 };
    }

    monthlyInspections.forEach((insp) => {
      const dayPart = parseInt(insp.dateKey.slice(8, 10), 10);
      if (dayMap[dayPart]) {
        dayMap[dayPart].total++;
        if (insp.overallStatus === "ADA_TEMUAN") {
          dayMap[dayPart].finding++;
        } else {
          dayMap[dayPart].clean++;
        }
      }
    });

    const dailyTrend = Object.entries(dayMap).map(([day, val]) => ({
      day: parseInt(day, 10),
      dateKey: `${selectedMonth}-${String(day).padStart(2, "0")}`,
      total: val.total,
      clean: val.clean,
      finding: val.finding,
    }));

    // 5. Attention items (inspections with findings today)
    const attentionItems = todayInspections
      .filter((i) => i.overallStatus === "ADA_TEMUAN")
      .map((i) => ({
        id: i.id,
        inspectionId: i.id,
        roomName: i.room.name,
        slotName: i.slot.name,
        officerName: i.user.fullName,
        activityName: "Pemeriksaan Fisik",
        dirtyCount: i.dirtyCount,
        note: i.evidenceName || `${i.dirtyCount} temuan kotor/rusak`,
        time: new Date(i.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        submittedAt: i.submittedAt,
        photos: i.photos.map((p) => p.fileUrl),
      }));

    // 6. Recent Activity Feed (Latest 20 inspections in system, exclude hidden)
    const recentInspections = await prisma.inspection.findMany({
      take: 20,
      where: {
        ...(hiddenFilter as any),
      },
      orderBy: { submittedAt: "desc" },
      include: {
        room: { select: { name: true, code: true } },
        slot: { select: { name: true, code: true, role: true } },
        user: { select: { fullName: true, username: true, role: true } },
        photos: { select: { fileName: true, fileUrl: true } },
      },
    });

    const recentActivities = recentInspections.map((i) => ({
      id: i.id,
      roomName: i.room.name,
      roomCode: i.room.code,
      slotName: i.slot.name,
      slotCode: i.slot.code,
      slotRole: i.slot.role,
      officerName: i.user.fullName,
      officerRole: i.user.role,
      submittedAt: i.submittedAt,
      displayTime: formatDisplayDate(i.submittedAt),
      dateKey: i.dateKey,
      overallStatus: i.overallStatus,
      dirtyCount: i.dirtyCount,
      evidenceName: i.evidenceName,
      photos: i.photos.map((p) => p.fileUrl),
    }));

    // 7. Total expected sessions across all active rooms for the selected period
    let totalExpectedSessions = 0;
    rooms.forEach((r) => {
      totalExpectedSessions += r.roomType.slots.length * daysCount;
    });

    // 8. Room completion matrix
    let greenCount = 0;
    let purpleCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    const roomSummaries = rooms.map((room) => {
      const roomInsps = todayInspections.filter((i) => i.roomId === room.id);
      const petugasSlots = room.roomType.slots.filter((s) => s.role === "PETUGAS");
      const spvSlots = room.roomType.slots.filter((s) => s.role === "SUPERVISOR");

      const petugasFinished = roomInsps.filter((i) => i.slot.role === "PETUGAS").length;
      const spvFinished = roomInsps.filter((i) => i.slot.role === "SUPERVISOR").length;
      const totalFinished = roomInsps.length;
      const totalSlots = room.roomType.slots.length * daysCount;
      const petugasTotal = petugasSlots.length * daysCount;
      const spvTotal = spvSlots.length * daysCount;
      const dirtyCount = roomInsps.reduce((acc, curr) => acc + curr.dirtyCount, 0);
      const hasFindings = roomInsps.some((i) => i.overallStatus === "ADA_TEMUAN");

      let status = "EMPTY";
      if (totalFinished === 0) {
        status = "EMPTY";
        redCount++;
      } else if (petugasTotal > 0 && petugasFinished < petugasTotal) {
        status = "PARTIAL";
        yellowCount++;
      } else if (spvTotal > 0 && spvFinished < spvTotal) {
        status = "WAITING_SPV";
        purpleCount++;
      } else {
        status = "COMPLETE";
        greenCount++;
      }

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          roomType: { name: room.roomType.name },
        },
        roomTypeName: room.roomType.name,
        totalSlots,
        completedCount: totalFinished,
        completedSlots: totalFinished,
        petugasFinished,
        petugasTotal,
        spvFinished,
        spvTotal,
        dirtyCount,
        hasFindings,
        status,
      };
    });

    const completionRate =
      totalExpectedSessions > 0
        ? Math.min(100, Math.round((todayInspections.length / totalExpectedSessions) * 100))
        : 0;

    return NextResponse.json({
      ok: true,
      data: {
        today,
        dateKey: today,
        startDate,
        endDate,
        daysCount,
        selectedMonth,
        summary: {
          completionRate,
          completedSessions: todayInspections.length,
          totalExpectedSessions,
          cleanCount: todayCleanCount,
          findingCount: todayFindingCount,
          greenCount,
          purpleCount,
          yellowCount,
          redCount,
          startDate,
          endDate,
          daysCount,
        },
        metrics: {
          totalRooms,
          inspectionsTodayCount: todayInspections.length,
          cleanCount: todayCleanCount,
          findingCount: todayFindingCount,
          monthlyInspectionsCount: monthlyInspections.length,
          monthlyCleanCount: monthlyInspections.filter((i) => i.overallStatus === "BERSIH").length,
          monthlyFindingCount: monthlyInspections.filter((i) => i.overallStatus === "ADA_TEMUAN").length,
          totalEvaluations: totalEvals,
          averageRating: avgRating,
          satisfactionRate,
        },
        dailyTrend,
        ratingDist,
        recentActivities,
        findings: attentionItems,
        attentionItems,
        roomSummaries,
      },
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat dashboard." }, { status: 500 });
  }
}
