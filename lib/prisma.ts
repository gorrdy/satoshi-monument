import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// SQLite ladění pro souběh dvou instancí (webhook/cron/admin píší, /api/stats čte):
// - WAL: čtenáři neblokují writera (a naopak) — persistuje v souboru.
// - busy_timeout: contendovaná operace počká, místo okamžitého SQLITE_BUSY.
// - synchronous=NORMAL: bezpečné s WAL, levnější fsync.
// Best-effort při startu procesu; chyby ignorujeme (např. v testech bez SQLite).
const pragmas = [
  "PRAGMA journal_mode=WAL;",
  "PRAGMA busy_timeout=5000;",
  "PRAGMA synchronous=NORMAL;",
];
void (async () => {
  for (const p of pragmas) {
    try {
      await prisma.$queryRawUnsafe(p);
    } catch {
      /* ignore */
    }
  }
})();
