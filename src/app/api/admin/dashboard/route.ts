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

    // 5. Room completion matrix for today with 4 status levels:
    // - EMPTY (Merah): Tidak ada sesi sama sekali
    // - PARTIAL (Kuning): Ada sesi tapi sesi petugas belum lengkap
    // - WAITING_SPV (Ungu): Sesi petugas lengkap, belum inspeksi SPV
    // - COMPLETE (Hijau): Semua sesi selesai (Petugas & SPV)
    const roomSummaries = rooms.map((room) => {
      const roomInsps = todayInspections.filter((i) => i.roomId === room.id);
      const petugasSlots = room.roomType.slots.filter((s) => s.role === "PETUGAS");
      const spvSlots = room.roomType.slots.filter((s) => s.role === "SUPERVISOR");

      const petugasFinished = roomInsps.filter((i) => i.slot.role === "PETUGAS").length;
      const spvFinished = roomInsps.filter((i) => i.slot.role === "SUPERVISOR").length;
      const totalFinished = roomInsps.length;
      const totalSlots = room.roomType.slots.length;
      const hasFindings = roomInsps.some((i) => i.overallStatus === "ADA_TEMUAN");

      let status = "EMPTY"; // Merah
      if (totalFinished === 0) {
        status = "EMPTY";
      } else if (petugasSlots.length > 0 && petugasFinished < petugasSlots.length) {
        status = "PARTIAL"; // Kuning
      } else if (spvSlots.length > 0 && spvFinished < spvSlots.length) {
        status = "WAITING_SPV"; // Ungu
      } else {
        status = "COMPLETE"; // Hijau
      }

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        roomTypeName: room.roomType.name,
        totalSlots,
        completedSlots: totalFinished,
        petugasFinished,
        petugasTotal: petugasSlots.length,
        spvFinished,
        spvTotal: spvSlots.length,
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
