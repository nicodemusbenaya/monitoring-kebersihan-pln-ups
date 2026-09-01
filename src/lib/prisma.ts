import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || "";
  if (
    envUrl.startsWith("mysql:") ||
    envUrl.startsWith("mariadb:") ||
    envUrl.startsWith("postgresql:") ||
    envUrl.startsWith("postgres:")
  ) {
    return envUrl;
  }

  // On Vercel / AWS Lambda with SQLite, filesystem outside /tmp is read-only.
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDbPath = path.join("/tmp", "dev.db");
    
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), "dev.db"),
        path.join(__dirname, "..", "..", "prisma", "dev.db"),
        path.join(__dirname, "prisma", "dev.db"),
      ];

      let found = false;
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpDbPath);
            console.log(`[Prisma] Copied database from ${cand} to ${tmpDbPath}`);
            found = true;
            break;
          } catch (err) {
            console.error(`[Prisma] Error copying database from ${cand}:`, err);
          }
        }
      }

      if (!found) {
        console.warn("[Prisma] Pre-built dev.db not found in candidates, pointing directly to /tmp/dev.db");
      }
    }

    return `file:${tmpDbPath}`;
  }

  return envUrl || "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
