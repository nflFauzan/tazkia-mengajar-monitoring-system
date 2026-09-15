import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { putFile } from "@/lib/storage";
import { isRejection, processUpload } from "@/lib/storage/upload";

/**
 * Server-side documentation upload.
 *
 * Deliberately not a client-direct upload: keeping the write on the server
 * means the storage token never reaches the browser, and every file is
 * validated and converted before anything is persisted.
 *
 * Runs on the Node.js runtime because sharp and the Blob SDK both need it.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Route handlers are reachable without passing through the proxy, so the
  // session is checked here too rather than assumed.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const activityId = formData.get("activityId");
  if (typeof activityId !== "string" || !activityId) {
    return NextResponse.json(
      { error: "Kegiatan tidak ditemukan." },
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

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada berkas yang diunggah." },
      { status: 400 },
    );
  }

  const uploaded: Array<{ id: string; originalFilename: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    const processed = await processUpload(file);

    if (isRejection(processed)) {
      errors.push(processed.error);
      continue;
    }

    try {
      const stored = await putFile(
        `kegiatan/${activityId}/${Date.now()}-${processed.filename}`,
        processed.buffer,
        processed.mimeType,
      );

      const row = await prisma.documentation.create({
        data: {
          activityId,
          originalFilename: file.name.slice(0, 255),
          storedFilename: processed.filename,
          mimeType: processed.mimeType,
          size: processed.size,
          storageKey: stored.key,
          url: stored.url,
          isImage: processed.isImage,
        },
        select: { id: true, originalFilename: true },
      });

      uploaded.push(row);
    } catch (error) {
      console.error("[upload]", error);
      errors.push(`"${file.name}" gagal diunggah.`);
    }
  }

  revalidatePath(`/kegiatan/${activityId}`);

  // Partial success is reported as success with the failures listed, so one bad
  // file in a multi-file drop does not discard the ones that worked.
  return NextResponse.json({ uploaded, errors }, {
    status: uploaded.length > 0 ? 200 : 400,
  });
}
