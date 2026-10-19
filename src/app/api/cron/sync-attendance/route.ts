import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { syncWeeklyAttendance } from "@/server/services/weekly-attendance";

export const runtime = "nodejs";

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");

  // 1. Authorized if CRON_SECRET matches
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}` || xCronSecret === cronSecret) {
      return true;
    }
  }

  // 2. Authorized if called by a logged-in Admin
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") {
    return true;
  }

  // 3. Authorized in local development if no secret is configured
  if (process.env.NODE_ENV === "development" && !cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncWeeklyAttendance();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[cron/sync-attendance] Error syncing weekly attendance:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync weekly attendance" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
