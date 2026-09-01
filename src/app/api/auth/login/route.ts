import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { ok: false, message: "Username atau password tidak valid." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, message: "Username atau password tidak valid." },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as "PETUGAS" | "SUPERVISOR" | "ADMIN",
      mustChangePassword: user.mustChangePassword,
    };

    const token = await signToken(sessionUser);

    const response = NextResponse.json({
      ok: true,
      user: sessionUser,
      message: "Login berhasil.",
    });

    // 10 tahun (Sesi Permanen di HP & Browser)
    const tenYearsInSeconds = 3650 * 24 * 60 * 60;
    const expiresDate = new Date(Date.now() + tenYearsInSeconds * 1000);

    response.cookies.set({
      name: "pln_ups_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tenYearsInSeconds,
      expires: expiresDate,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "USER",
        entityId: user.id,
        detail: JSON.stringify({ role: user.role, permanentSession: true }),
      },
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Terjadi kesalahan pada server saat login." },
      { status: 500 }
    );
  }
}
