import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const sessionUser = await requireAuth(["ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const inspectionId = String(body.inspectionId || body.id || "").trim();

    if (!inspectionId) {
      return NextResponse.json({ ok: false, message: "ID laporan tidak ditemukan." }, { status: 400 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { room: { select: { name: true, code: true } }, slot: { select: { name: true, code: true } } },
    });

    if (!inspection) {
      return NextResponse.json({ ok: false, message: "Laporan tidak ditemukan." }, { status: 404 });
    }

    if (inspection.state !== "SUBMITTED") {
      return NextResponse.json({ ok: false, message: "Laporan sudah dibuka/dihapus." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.inspection.delete({ where: { id: inspectionId } });
      await tx.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: "REOPEN_INSPECTION",
          entityType: "INSPECTION",
          entityId: inspectionId,
          detail: JSON.stringify({
            roomCode: inspection.room.code,
            roomName: inspection.room.name,
            slotCode: inspection.slot.code,
            slotName: inspection.slot.name,
            dateKey: inspection.dateKey,
            reopenedBy: sessionUser.username,
          }),
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: `Laporan ${inspection.room.name} - ${inspection.slot.name} (${inspection.dateKey}) berhasil dibuka kembali. Petugas dapat mengisi ulang.`,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Silakan login kembali." }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, message: "Hanya ADMIN yang dapat membuka kembali laporan." }, { status: 403 });
    }
    console.error("Reopen inspection error:", error);
    return NextResponse.json({ ok: false, message: error.message || "Gagal membuka kembali laporan." }, { status: 500 });
  }
}
