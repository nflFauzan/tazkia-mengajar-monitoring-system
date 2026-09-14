import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * Connection URLs live here rather than in schema.prisma, which no longer
 * accepts `url`/`directUrl`. `directUrl` is what migrations run against: on
 * Neon that is the non-pooled endpoint, while the application itself uses the
 * pooled `DATABASE_URL`. Locally both point at the same database.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },

  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
