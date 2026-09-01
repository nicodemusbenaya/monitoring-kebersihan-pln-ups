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

    // 5. Total expected sessions across all rooms
    let totalExpectedSessions = 0;
    rooms.forEach((r) => {
      totalExpectedSessions += r.roomType.slots.length;
    });

    // 6. Room completion matrix for today with 4 status levels
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
      const totalSlots = room.roomType.slots.length;
      const dirtyCount = roomInsps.reduce((acc, curr) => acc + curr.dirtyCount, 0);
      const hasFindings = roomInsps.some((i) => i.overallStatus === "ADA_TEMUAN");

      let status = "EMPTY"; // Merah
      if (totalFinished === 0) {
        status = "EMPTY";
        redCount++;
      } else if (petugasSlots.length > 0 && petugasFinished < petugasSlots.length) {
        status = "PARTIAL"; // Kuning
        yellowCount++;
      } else if (spvSlots.length > 0 && spvFinished < spvSlots.length) {
        status = "WAITING_SPV"; // Ungu
        purpleCount++;
      } else {
        status = "COMPLETE"; // Hijau
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
        petugasTotal: petugasSlots.length,
        spvFinished,
        spvTotal: spvSlots.length,
        dirtyCount,
        hasFindings,
        status,
      };
    });

    const completionRate =
      totalExpectedSessions > 0
        ? Math.round((todayInspections.length / totalExpectedSessions) * 100)
        : 0;

    return NextResponse.json({
      ok: true,
      data: {
        today,
        dateKey: today,
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
        },
        metrics: {
          totalRooms,
          inspectionsTodayCount: todayInspections.length,
          cleanCount: todayCleanCount,
          findingCount: todayFindingCount,
          totalEvaluations: totalEvals,
          averageRating: avgRating,
          satisfactionRate,
        },
        findings: attentionItems,
        attentionItems,
        roomSummaries,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat dashboard." }, { status: 500 });
  }
}
