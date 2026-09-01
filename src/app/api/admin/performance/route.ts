import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const selectedMonth = searchParams.get("month") || monthKey();

    const officers = await prisma.user.findMany({
      where: { role: { in: ["PETUGAS", "SUPERVISOR"] }, active: true },
      select: { id: true, username: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });

    const inspections = await prisma.inspection.findMany({
      where: {
        dateKey: { startsWith: selectedMonth },
        state: "SUBMITTED",
      },
      include: {
        room: true,
        slot: true,
      },
    });

    const evaluations = await prisma.evaluation.findMany({
      where: { monthKey: selectedMonth },
    });

    const officerStats = officers.map((officer) => {
      const userInsps = inspections.filter((i) => i.userId === officer.id);
      const totalInspections = userInsps.length;
      const cleanCount = userInsps.filter((i) => i.overallStatus === "BERSIH").length;
      const findingCount = userInsps.filter((i) => i.overallStatus === "ADA_TEMUAN").length;
      const distinctRooms = new Set(userInsps.map((i) => i.roomId)).size;

      return {
        id: officer.id,
        username: officer.username,
        fullName: officer.fullName,
        role: officer.role,
        totalInspections,
        cleanCount,
        findingCount,
        distinctRooms,
        cleanPercentage: totalInspections > 0 ? Math.round((cleanCount / totalInspections) * 100) : 100,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        month: selectedMonth,
        officers: officerStats,
        totalInspections: inspections.length,
        totalEvaluations: evaluations.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat performa petugas." }, { status: 500 });
  }
}
