import { NextResponse } from "next/server";
import { sendScheduleRemindersToday } from "@/server/services/push-notification";

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
    const result = await sendScheduleRemindersToday();
    return NextResponse.json({
      ok: true,
      message: "Schedule reminders push dispatched.",
      result,
    });
  } catch (error) {
    console.error("[Cron] Schedule reminders push error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to dispatch reminders." },
      { status: 500 },
    );
  }
}
