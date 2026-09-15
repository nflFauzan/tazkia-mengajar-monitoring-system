import { defineConfig } from "vitest/config";

/**
 * Tests cover the business logic that would quietly corrupt records if it
 * regressed: report rendering, narrative generation, the required-data
 * checklist, attendance tallies and schedule expansion.
 *
 * These are pure functions by design, so the suite needs no database, no React
 * renderer and no running server — which is what keeps it fast enough to run on
 * every change.
 *
 * The `.mts` extension makes Vite load this as an ES module; as `.ts` it is
 * treated as CommonJS and warns about the ESM syntax.
 */
export default defineConfig({
  resolve: {
    // Resolves the "@/*" paths from tsconfig natively, so no extra plugin.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
