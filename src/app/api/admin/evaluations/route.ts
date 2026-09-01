import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const currentMonth = monthKey();

    const startDate = searchParams.get("startDate") || `${currentMonth}-01`;
    const endDate = searchParams.get("endDate") || `${currentMonth}-31`;
    const roomId = searchParams.get("roomId");

    const whereClause: any = {
      dateKey: { gte: startDate, lte: endDate },
    };
    if (roomId && roomId !== "ALL") {
      whereClause.roomId = roomId;
    }

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: {
        room: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const totalEvaluations = evaluations.length;
    const satisfiedCount = evaluations.filter((e) => e.rating >= 3).length;
    const satisfactionRate = totalEvaluations > 0 ? Math.round((satisfiedCount / totalEvaluations) * 100) : 0;
    const totalRatingSum = evaluations.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = totalEvaluations > 0 ? (totalRatingSum / totalEvaluations).toFixed(1) : "0";
    const attentionCount = evaluations.filter((e) => e.rating <= 2).length;

    // Rating distribution
    const count1 = evaluations.filter((e) => e.rating === 1).length;
    const count2 = evaluations.filter((e) => e.rating === 2).length;
    const count3 = evaluations.filter((e) => e.rating === 3).length;
    const count4 = evaluations.filter((e) => e.rating === 4).length;

    const distribution = [
      {
        rating: 1,
        label: "Sangat perlu ditingkatkan",
        count: count1,
        percentage: totalEvaluations > 0 ? Math.round((count1 / totalEvaluations) * 100) : 0,
      },
      {
        rating: 2,
        label: "Perlu ditingkatkan",
        count: count2,
        percentage: totalEvaluations > 0 ? Math.round((count2 / totalEvaluations) * 100) : 0,
      },
      {
        rating: 3,
        label: "Baik",
        count: count3,
        percentage: totalEvaluations > 0 ? Math.round((count3 / totalEvaluations) * 100) : 0,
      },
      {
        rating: 4,
        label: "Sangat baik",
        count: count4,
        percentage: totalEvaluations > 0 ? Math.round((count4 / totalEvaluations) * 100) : 0,
      },
    ];

    // Aspects analysis
    const aspectCounts: Record<string, { total: number; lowRating: number }> = {};
    evaluations.forEach((ev) => {
      let aspectList: string[] = [];
      try {
        if (ev.aspectCodes) {
          const parsed = JSON.parse(ev.aspectCodes);
          if (Array.isArray(parsed)) aspectList = parsed;
        }
      } catch (e) {}

      aspectList.forEach((asp) => {
        if (!aspectCounts[asp]) aspectCounts[asp] = { total: 0, lowRating: 0 };
        aspectCounts[asp].total++;
        if (ev.rating <= 2) aspectCounts[asp].lowRating++;
      });
    });

    const aspectsAnalysis = Object.entries(aspectCounts).map(([name, data]) => ({
      name,
      chosenCount: data.total,
      allRatingsPercentage: totalEvaluations > 0 ? Math.round((data.total / totalEvaluations) * 100) : 0,
      lowRatingsPercentage: attentionCount > 0 ? Math.round((data.lowRating / attentionCount) * 100) : 0,
    }));

    // Find last officer for each evaluation
    const history = await Promise.all(
      evaluations.map(async (ev) => {
        let aspectList: string[] = [];
        try {
          if (ev.aspectCodes) {
            const parsed = JSON.parse(ev.aspectCodes);
            if (Array.isArray(parsed)) aspectList = parsed;
          }
        } catch (e) {}

        const lastInsp = await prisma.inspection.findFirst({
          where: {
            roomId: ev.roomId,
            submittedAt: { lte: ev.submittedAt },
            state: "SUBMITTED",
          },
          include: { user: true },
          orderBy: { submittedAt: "desc" },
        });

        const formattedTime = new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(ev.submittedAt)) + " WIB";

        return {
          id: ev.id,
          createdAt: ev.submittedAt,
          timeFormatted: formattedTime,
          roomName: ev.room?.name || "Ruangan",
          rating: ev.rating,
          aspects: aspectList,
          comment: ev.comment || "—",
          lastOfficer: lastInsp?.user?.fullName || "Petugas Kebersihan",
        };
      })
    );

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          totalEvaluations,
          satisfactionRate,
          averageRating,
          attentionCount,
        },
        distribution,
        aspectsAnalysis,
        history,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal memuat data kepuasan." },
      { status: 500 }
    );
  }
}
