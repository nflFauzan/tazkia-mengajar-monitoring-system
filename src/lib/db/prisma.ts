import path from "path";
import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 drives PostgreSQL through a driver adapter rather than a bundled
 * query engine, so the connection string is supplied here rather than in
 * schema.prisma.
 *
 * The client is cached on globalThis so that hot reload in development does not
 * open a new connection pool on every edit, and so that a warm serverless
 * instance reuses the pool it already has.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const req = createRequire(path.join(process.cwd(), "package.json"));
      if (req.cache) {
        for (const key of Object.keys(req.cache)) {
          if (key.includes("@prisma") || key.includes(".prisma")) {
            delete req.cache[key];
          }
        }
      }
      const { PrismaClient: FreshClient } = req("@prisma/client");
      const { PrismaPg: FreshAdapter } = req("@prisma/adapter-pg");
      const adapter = new FreshAdapter({ connectionString });
      return new FreshClient({
        adapter,
        log: ["warn", "error"],
      });
    } catch (e) {
      console.warn("[prisma.ts] Dynamic require failed, falling back to static import:", e);
    }
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrismaClient(): PrismaClient {
  let cached = globalForPrisma.prisma;
  if (
    cached &&
    process.env.NODE_ENV === "development" &&
    (!("attendanceAppeal" in cached) || !("contentIdea" in cached))
  ) {
    globalForPrisma.prisma = undefined;
    cached = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
  has(_target, prop) {
    const client = getPrismaClient();
    return prop in client;
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = getPrismaClient();
}
