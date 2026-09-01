import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const user = await getSessionUser();
  const response = NextResponse.json({ ok: true, message: "Berhasil keluar." });

  response.cookies.set({
    name: "pln_ups_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
