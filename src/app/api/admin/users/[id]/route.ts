import { NextResponse } from "next/server";
import { requireAuth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["ADMIN"]);
    const { id } = await params;
    const body = await request.json();
    const { fullName, role, password, active } = body;

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID pengguna tidak valid." }, { status: 400 });
    }

    let passwordHash: string | undefined = undefined;
    if (password && String(password).trim().length > 0) {
      passwordHash = await hashPassword(String(password).trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName ? String(fullName).trim() : undefined,
        role: role ? String(role).toUpperCase() : undefined,
        active: typeof active === "boolean" ? active : undefined,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      data: { id: updated.id, username: updated.username, fullName: updated.fullName, role: updated.role },
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal memperbarui data pengguna." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["ADMIN"]);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID pengguna tidak valid." }, { status: 400 });
    }

    // Soft delete or delete user
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Pengguna berhasil dihapus." });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
