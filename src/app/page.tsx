import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const evaluateToken = params.evaluate;
  const roomToken = params.room;

  if (evaluateToken && typeof evaluateToken === "string") {
    redirect(`/evaluate/${encodeURIComponent(evaluateToken)}`);
  }

  const user = await getSessionUser();

  if (!user) {
    if (roomToken && typeof roomToken === "string") {
      redirect(`/login?redirect=${encodeURIComponent(`/scanner/room/${roomToken}`)}`);
    }
    redirect("/login");
  }

  if (roomToken && typeof roomToken === "string") {
    redirect(`/scanner/room/${encodeURIComponent(roomToken)}`);
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/scanner");
}
