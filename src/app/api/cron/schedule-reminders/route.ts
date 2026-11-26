import { NextResponse } from "next/server";
import { sendDailyAutomatedReminders } from "@/server/services/push-notification";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized cron trigger." },
        { status: 401 },
      );
    }
  }

  try {
    const result = await sendDailyAutomatedReminders();
    return NextResponse.json({
      ok: true,
      message: "Daily automated reminders (schedules & commemorative days) dispatched successfully.",
      result,
    });
  } catch (error) {
    console.error("[Cron] Daily automated reminders error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to dispatch automated reminders." },
      { status: 500 },
    );
  }
}

