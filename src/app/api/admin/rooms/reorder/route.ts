import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ ok: false, message: "orderedIds diperlukan." }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id: string, idx: number) =>
        prisma.room.update({ where: { id }, data: { sortOrder: idx + 1 } })
      )
    );

    return NextResponse.json({ ok: true, message: "Urutan ruangan berhasil dirapikan." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal merapikan urutan." }, { status: 500 });
  }
}
