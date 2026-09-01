import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseQrToken(raw) {
  if (!raw) return "";
  let clean = String(raw).trim();

  // 1. If it's a full URL containing query parameters (?room=... or ?evaluate=...)
  if (clean.includes("?")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://dummy.com/${clean}`);
      const roomParam = url.searchParams.get("room");
      const evalParam = url.searchParams.get("evaluate");
      if (roomParam) return roomParam.trim();
      if (evalParam) return evalParam.trim();
    } catch {
      // fallback regex
      const match = clean.match(/[?&](?:room|evaluate)=([^&#]+)/i);
      if (match) return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. If it has prefix PLNUPS:ROOM:token
  if (clean.toUpperCase().startsWith("PLNUPS:ROOM:")) {
    return clean.slice(12).trim();
  }

  return clean;
}

async function test(rawToken) {
  const token = parseQrToken(rawToken);
  console.log(`Input: '${rawToken}' -> parsed: '${token}'`);

  const room = await prisma.room.findFirst({
    where: {
      OR: [
        { qrToken: token },
        { code: token },
      ],
      active: true,
    },
    include: {
      roomType: true,
    },
  });

  if (!room) {
    console.log("NOT FOUND 404!");
    // check with case insensitive or trimmed
    const all = await prisma.room.findMany();
    const match = all.find(r => r.qrToken.toLowerCase() === token.toLowerCase());
    if (match) {
      console.log(`Found with case-insensitive! DB has: '${match.qrToken}', input was: '${token}'`);
    }
  } else {
    console.log("FOUND 200 OK:", room.name, room.code);
  }
}

async function run() {
  await test("nvpnj-3HHgJRdSDUlJBwM91yLN6hKKaC31cq3m6xRSI");
  await test("_csTcaAlvTXinBhSfcOkBhpD8k04HawIfyzvIovg5wU");
  await test("_csTcaAlvTXinBhSfcOkBhpD8k04Hawlfyzvlovg5wU"); // notice 'l' vs 'I'
}

run().catch(console.error).finally(() => prisma.$disconnect());
