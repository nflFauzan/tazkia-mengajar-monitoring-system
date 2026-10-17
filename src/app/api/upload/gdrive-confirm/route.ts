import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      activityId?: string;
      fileId?: string;
      originalFilename?: string;
      mimeType?: string;
      size?: number;
      webViewLink?: string;
    };

    const {
      activityId,
      fileId,
      originalFilename,
      mimeType = "application/octet-stream",
      size = 0,
      webViewLink,
    } = body;

    if (!activityId || !fileId || !originalFilename) {
      return NextResponse.json(
        { error: "Data konfirmasi upload tidak lengkap." },
        { status: 400 },
      );
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan." },
        { status: 404 },
      );
    }

    const effectiveUrl =
      webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    const doc = await prisma.documentation.create({
      data: {
        activityId,
        originalFilename: originalFilename.slice(0, 255),
        storedFilename: originalFilename.slice(0, 255),
        mimeType,
        size,
        storageKey: fileId,
        url: effectiveUrl,
        isImage: mimeType.startsWith("image/"),
      },
      select: { id: true, originalFilename: true },
    });

    revalidatePath(`/kegiatan/${activityId}`);

    return NextResponse.json({ ok: true, doc });
  } catch (error) {
    console.error("[gdrive-confirm]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan catatan dokumentasi ke database.",
      },
      { status: 500 },
    );
  }
}
