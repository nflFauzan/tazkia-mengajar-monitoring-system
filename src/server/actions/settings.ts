"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { testGoogleDriveToken } from "@/lib/gdrive/client";
import { fail, handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

export async function updateGoogleDriveTokenAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const token = formData.get("refreshToken");
  if (typeof token !== "string" || !token.trim()) {
    return fail("Token tidak boleh kosong.");
  }

  const cleanToken = token.trim().replace(/^["']|["']$/g, "");

  try {
    const testResult = await testGoogleDriveToken(cleanToken);
    if (!testResult.ok) {
      return fail(
        `Token tidak dapat mengakses Google Drive: ${testResult.error || "Periksa izin akun"}`
      );
    }

    await prisma.systemSetting.upsert({
      where: { key: "GOOGLE_REFRESH_TOKEN" },
      update: { value: cleanToken },
      create: { key: "GOOGLE_REFRESH_TOKEN", value: cleanToken },
    });

    revalidatePath("/pengaturan");
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateGoogleDriveTokenAction",
      error,
      "Gagal menyimpan token Google Drive ke database.",
    );
  }
}
