import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkNasHealth } from "@/lib/nas";

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);
    const status = await checkNasHealth();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || "Gagal memeriksa status NAS" }, { status: 500 });
  }
}
