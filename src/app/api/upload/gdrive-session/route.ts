import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createResumableUploadSession, isGoogleDriveConfigured } from "@/lib/gdrive";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Drive belum dikonfigurasi. Periksa kredensial Service Account dan ID folder di pengaturan sistem.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      activityId?: string;
      filename?: string;
      mimeType?: string;
      size?: number;
    };

    const { activityId, filename, mimeType, size } = body;

    if (!activityId || !filename) {
      return NextResponse.json(
        { error: "Parameter activityId dan filename wajib diisi." },
        { status: 400 },
      );
    }

    const rawOrigin =
      request.headers.get("origin") ||
      request.headers.get("referer") ||
      undefined;

    let origin: string | undefined;
    if (rawOrigin) {
      try {
        origin = new URL(rawOrigin).origin;
      } catch {
        origin = rawOrigin;
      }
    }

    const session = await createResumableUploadSession({
      activityId,
      filename,
      mimeType: mimeType || "application/octet-stream",
      size,
      origin,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("[gdrive-session]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyiapkan sesi upload Google Drive.",
      },
      { status: 500 },
    );
  }
}
