import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const roomTypes = await prisma.roomType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });

    const slots = await prisma.slot.findMany({ where: { active: true } });
    const activities = await prisma.activity.findMany({ where: { active: true } });

    return NextResponse.json({ ok: true, data: { rooms, roomTypes, slots, activities } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat data ruangan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const { code, name, roomTypeId, qrToken } = await request.json();

    if (!code || !name || !roomTypeId) {
      return NextResponse.json({ ok: false, message: "Kode, nama, dan tipe ruangan wajib diisi." }, { status: 400 });
    }

    const token = qrToken ? qrToken.trim() : `ROOM-${code.toUpperCase().replace(/\s+/g, "_")}-${Date.now().toString(36).toUpperCase()}`;

    const count = await prisma.room.count();

    const newRoom = await prisma.room.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        roomTypeId,
        qrToken: token,
        sortOrder: count + 1,
        active: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_ROOM",
        entityType: "ROOM",
        entityId: newRoom.id,
        detail: JSON.stringify({ code: newRoom.code, name: newRoom.name, qrToken: token }),
      },
    });

    return NextResponse.json({ ok: true, data: newRoom, message: "Ruangan berhasil ditambahkan." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal menyimpan ruangan." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAuth(["ADMIN"]);
    const { id, name, roomTypeId, active, hidden, sortOrder, qrToken } = await request.json();

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID ruangan diperlukan." }, { status: 400 });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        roomTypeId: roomTypeId || undefined,
        active: typeof active === "boolean" ? active : undefined,
        hidden: typeof hidden === "boolean" ? hidden : undefined,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
        qrToken: qrToken ? String(qrToken).trim() : undefined,
      },
    });

    return NextResponse.json({ ok: true, data: updated, message: "Ruangan berhasil diperbarui." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memperbarui ruangan." }, { status: 500 });
  }
}
