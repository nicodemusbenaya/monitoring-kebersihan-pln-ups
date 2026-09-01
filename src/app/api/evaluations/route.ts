import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey, monthKey, formatDisplayDate } from "@/lib/utils";

// GET evaluation context for anonymous user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || searchParams.get("roomToken");

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token evaluasi tidak ditemukan." }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ qrToken: token }, { code: token }],
        active: true,
      },
      include: {
        roomType: {
          include: {
            aspects: {
              where: { active: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ ok: false, message: "Ruangan tidak valid atau sudah tidak aktif." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          qrToken: room.qrToken,
          roomTypeName: room.roomType.name,
        },
        aspects: room.roomType.aspects.map((a) => ({
          id: a.id,
          code: a.code,
          label: a.label,
        })),
        ratingLabels: {
          1: "Sangat Tidak Puas",
          2: "Kurang Puas",
          3: "Puas",
          4: "Sangat Puas",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat form evaluasi." }, { status: 500 });
  }
}

// POST submit anonymous evaluation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, rating, aspectCodes, comment } = body;

    const numRating = Number(rating);
    if (!token || isNaN(numRating) || numRating < 1 || numRating > 4) {
      return NextResponse.json({ ok: false, message: "Rating wajib dipilih antara 1 sampai 4." }, { status: 400 });
    }

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ qrToken: token }, { code: token }],
        active: true,
      },
    });

    if (!room) {
      return NextResponse.json({ ok: false, message: "Ruangan tidak ditemukan." }, { status: 404 });
    }

    const labels: Record<number, string> = {
      1: "Sangat Tidak Puas",
      2: "Kurang Puas",
      3: "Puas",
      4: "Sangat Puas",
    };

    const ratingLabel = labels[numRating] || "Puas";
    const selectedAspects = Array.isArray(aspectCodes) ? aspectCodes : [];

    if (numRating <= 2 && (selectedAspects.length === 0 || !String(comment || "").trim())) {
      return NextResponse.json(
        { ok: false, message: "Pilih aspek yang perlu ditingkatkan dan tuliskan alasannya." },
        { status: 400 }
      );
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        roomId: room.id,
        roomTypeId: room.roomTypeId,
        rating: numRating,
        ratingLabel,
        aspectCodes: JSON.stringify(selectedAspects),
        comment: comment ? String(comment).trim() : null,
        dateKey: todayKey(),
        monthKey: monthKey(),
        userAgent: request.headers.get("user-agent") || "",
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: evaluation.id,
        roomName: room.name,
        rating: evaluation.rating,
        ratingLabel: evaluation.ratingLabel,
        submittedAt: evaluation.submittedAt,
        displayTime: formatDisplayDate(evaluation.submittedAt),
      },
      message: "Terima kasih, evaluasi kepuasan Anda telah berhasil dikirim.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal mengirim evaluasi." }, { status: 500 });
  }
}
