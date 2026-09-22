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
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    process.env.NODE_ENV === "development" &&
    !("attendanceAppeal" in cached)
  ) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma ?? createPrismaClient();
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
