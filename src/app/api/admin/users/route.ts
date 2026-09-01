import { NextResponse } from "next/server";
import { requireAuth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ ok: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memuat pengguna." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAuth(["ADMIN"]);
    const { username, fullName, role, password } = await request.json();

    if (!username || !fullName || !role || !password) {
      return NextResponse.json({ ok: false, message: "Seluruh kolom wajib diisi." }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "Username sudah digunakan." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullName: String(fullName).trim(),
        role: String(role).toUpperCase(),
        passwordHash,
        active: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { id: newUser.id, username: newUser.username, fullName: newUser.fullName, role: newUser.role },
      message: "Pengguna berhasil dibuat.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal membuat pengguna." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAuth(["ADMIN"]);
    const { id, fullName, role, active, password } = await request.json();

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID pengguna diperlukan." }, { status: 400 });
    }

    let passwordHash: string | undefined;
    if (password && String(password).trim().length >= 6) {
      passwordHash = await hashPassword(String(password).trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName ? String(fullName).trim() : undefined,
        role: role ? String(role).toUpperCase() : undefined,
        active: typeof active === "boolean" ? active : undefined,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true, data: updated, message: "Data pengguna berhasil diperbarui." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memperbarui pengguna." }, { status: 500 });
  }
}
