"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  createContentIdea,
  deleteContentIdea,
  getContentIdeas,
  updateContentIdea,
  updateContentIdeaStatus,
} from "../services/content-ideas";
import type { ContentIdeaItem } from "../services/content-ideas";
import type {
  ContentIdeaInput,
  UpdateContentStatusInput,
} from "@/lib/validation/content-idea";
import type { ContentStatus } from "@prisma/client";
import { handleUnexpected, ok } from "./types";
import type { ActionResult } from "./types";

export async function getContentIdeasAction(filters?: {
  status?: ContentStatus;
  locationId?: string;
  search?: string;
}): Promise<ActionResult<ContentIdeaItem[]>> {
  await requireUser();

  try {
    const data = await getContentIdeas(filters);
    return ok(data);
  } catch (error) {
    return handleUnexpected(
      "getContentIdeasAction",
      error,
      "Gagal memuat ide konten.",
    );
  }
}

export async function createContentIdeaAction(
  input: ContentIdeaInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  try {
    const result = await createContentIdea(input, user.id);
    revalidatePath("/konten");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "createContentIdeaAction",
      error,
      error instanceof Error ? error.message : "Gagal menyimpan ide konten.",
    );
  }
}

export async function updateContentIdeaAction(
  id: string,
  input: ContentIdeaInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  try {
    const result = await updateContentIdea(id, input, user.id, user.role);
    revalidatePath("/konten");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "updateContentIdeaAction",
      error,
      error instanceof Error ? error.message : "Gagal memperbarui ide konten.",
    );
  }
}

export async function updateContentIdeaStatusAction(
  id: string,
  input: UpdateContentStatusInput,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  try {
    const result = await updateContentIdeaStatus(id, input);
    revalidatePath("/konten");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "updateContentIdeaStatusAction",
      error,
      error instanceof Error ? error.message : "Gagal memperbarui status konten.",
    );
  }
}

export async function deleteContentIdeaAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  try {
    const result = await deleteContentIdea(id, user.id, user.role);
    revalidatePath("/konten");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return handleUnexpected(
      "deleteContentIdeaAction",
      error,
      error instanceof Error ? error.message : "Gagal menghapus ide konten.",
    );
  }
}
