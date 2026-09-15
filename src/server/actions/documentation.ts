"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/storage";

import { fail, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

export async function deleteDocumentationAction(
  id: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    const doc = await prisma.documentation.findUnique({
      where: { id },
      select: { id: true, activityId: true, storageKey: true, url: true },
    });

    if (!doc) return fail("Dokumentasi tidak ditemukan.");

    // The row goes first. If the blob delete fails afterwards the worst case is
    // an orphaned object, whereas the reverse order can leave a row pointing at
    // a file that no longer exists — a broken image in every report.
    await prisma.documentation.delete({ where: { id } });

    try {
      await deleteFile(doc.storageKey, doc.url);
    } catch (error) {
      console.error("[deleteDocumentationAction] orphaned blob", error);
    }

    revalidatePath(`/kegiatan/${doc.activityId}`);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteDocumentationAction",
      error,
      "Gagal menghapus dokumentasi. Silakan coba lagi.",
    );
  }
}
