import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { id, hidden } = await request.json();
    if (!id) return NextResponse.json({ ok: false, message: "ID ruangan diperlukan." }, { status: 400 });

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return NextResponse.json({ ok: false, message: "Ruangan tidak ditemukan." }, { status: 404 });

    const nextHidden = typeof hidden === "boolean" ? hidden : !room.hidden;

    const updated = await prisma.room.update({
      where: { id },
      data: { hidden: nextHidden },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: nextHidden ? "HIDE_ROOM" : "UNHIDE_ROOM",
        entityType: "ROOM",
        entityId: id,
        detail: JSON.stringify({ code: room.code, name: room.name, hidden: nextHidden }),
      },
    });

    return NextResponse.json({ ok: true, data: updated, message: nextHidden ? "Ruangan disembunyikan dari ringkasan." : "Ruangan ditampilkan kembali." });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
    }
    return NextResponse.json({ ok: false, message: error.message || "Gagal mengubah status." }, { status: 500 });
  }
}
