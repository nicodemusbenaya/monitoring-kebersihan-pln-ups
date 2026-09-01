import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey, monthKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const selectedMonth = searchParams.get("month") || monthKey();
    const today = todayKey();

    // 1. Total rooms and active rooms
    const totalRooms = await prisma.room.count({ where: { active: true } });
    const rooms = await prisma.room.findMany({
      where: { active: true },
      include: {
        roomType: {
          include: {
            slots: { where: { active: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // 2. Today's submitted inspections
    const todayInspections = await prisma.inspection.findMany({
      where: { dateKey: today, state: "SUBMITTED" },
      include: { room: true, slot: true, user: true, photos: true },
    });

    const todayCleanCount = todayInspections.filter((i) => i.overallStatus === "BERSIH").length;
    const todayFindingCount = todayInspections.filter((i) => i.overallStatus === "ADA_TEMUAN").length;

    // 3. Monthly evaluations
    const monthlyEvaluations = await prisma.evaluation.findMany({
      where: { monthKey: selectedMonth },
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

    // 4. Attention items (inspections with findings today)
    const attentionItems = todayInspections
      .filter((i) => i.overallStatus === "ADA_TEMUAN")
      .map((i) => ({
        inspectionId: i.id,
        roomName: i.room.name,
        slotName: i.slot.name,
        officerName: i.user.fullName,
        dirtyCount: i.dirtyCount,
        submittedAt: i.submittedAt,
        photos: i.photos.map((p) => p.fileUrl),
      }));

    // 5. Room completion matrix for today
    const roomSummaries = rooms.map((room) => {
      const roomInsps = todayInspections.filter((i) => i.roomId === room.id);
      const totalSlots = room.roomType.slots.length;
      const completedSlots = roomInsps.length;
      const hasFindings = roomInsps.some((i) => i.overallStatus === "ADA_TEMUAN");

      let status = "EMPTY";
      if (completedSlots > 0 && completedSlots >= totalSlots) status = "COMPLETE";
      else if (completedSlots > 0) status = "PARTIAL";

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        roomTypeName: room.roomType.name,
        totalSlots,
        completedSlots,
        hasFindings,
        status,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        today,
        selectedMonth,
        metrics: {
          totalRooms,
          inspectionsTodayCount: todayInspections.length,
          cleanCount: todayCleanCount,
          findingCount: todayFindingCount,
          totalEvaluations: totalEvals,
          averageRating: avgRating,
          satisfactionRate,
        },
        attentionItems,
        roomSummaries,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat dashboard." }, { status: 500 });
  }
}
