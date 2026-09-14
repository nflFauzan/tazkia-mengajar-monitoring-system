import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * Connection URLs live here rather than in schema.prisma, which no longer
 * accepts them.
 *
 * Migrations run against DIRECT_URL, which on Neon is the non-pooled endpoint —
 * PgBouncer cannot run the DDL and advisory locks that Migrate needs. The
 * application itself connects through the pooled DATABASE_URL (see
 * src/lib/db/prisma.ts). Locally the two are the same database, so DIRECT_URL
 * falls back to DATABASE_URL when it is not set.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },

  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
