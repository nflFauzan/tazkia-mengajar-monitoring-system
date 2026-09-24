import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/dates";
import {
  contentIdeaSchema,
  updateContentStatusSchema,
} from "@/lib/validation/content-idea";
import type {
  ContentIdeaInput,
  UpdateContentStatusInput,
} from "@/lib/validation/content-idea";
import type { ContentPlatform, ContentStatus, Prisma } from "@prisma/client";

export interface ContentIdeaItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  contentType: string | null;
  referenceUrl: string | null;
  description: string;
  status: ContentStatus;
  targetDate: Date | null;
  targetDateStr: string | null;
  locationId: string | null;
  locationName: string | null;
  publishedUrl: string | null;
  publishedAt: Date | null;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getContentIdeas(filters?: {
  status?: ContentStatus;
  locationId?: string;
  search?: string;
}): Promise<ContentIdeaItem[]> {
  try {
    if (!prisma || !("contentIdea" in prisma) || !prisma.contentIdea) {
      return [];
    }

    const where: Prisma.ContentIdeaWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { contentType: { contains: term, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.contentIdea.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        location: { select: { id: true, name: true } },
        author: {
          select: {
            id: true,
            name: true,
            teamMember: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      platform: r.platform,
      contentType: r.contentType,
      referenceUrl: r.referenceUrl,
      description: r.description,
      status: r.status,
      targetDate: r.targetDate,
      targetDateStr: r.targetDate ? r.targetDate.toISOString().split("T")[0] : null,
      locationId: r.locationId,
      locationName: r.location?.name ?? null,
      publishedUrl: r.publishedUrl,
      publishedAt: r.publishedAt,
      authorId: r.authorId,
      authorName: r.author.teamMember?.fullName || r.author.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (error) {
    console.error("Failed to load content ideas:", error);
    return [];
  }
}

export async function getContentIdeasStats(): Promise<{
  total: number;
  ideCount: number;
  rencanaCount: number;
  prosesEditCount: number;
  tayangCount: number;
}> {
  const fallback = {
    total: 0,
    ideCount: 0,
    rencanaCount: 0,
    prosesEditCount: 0,
    tayangCount: 0,
  };

  try {
    if (!prisma || !("contentIdea" in prisma) || !prisma.contentIdea) {
      return fallback;
    }

    const [total, ideCount, rencanaCount, prosesEditCount, tayangCount] =
      await Promise.all([
        prisma.contentIdea.count(),
        prisma.contentIdea.count({ where: { status: "IDE" } }),
        prisma.contentIdea.count({ where: { status: "RENCANA" } }),
        prisma.contentIdea.count({ where: { status: "PROSES_EDIT" } }),
        prisma.contentIdea.count({ where: { status: "TAYANG" } }),
      ]);

    return {
      total,
      ideCount,
      rencanaCount,
      prosesEditCount,
      tayangCount,
    };
  } catch (error) {
    console.error("Failed to load content ideas stats:", error);
    return fallback;
  }
}

export async function createContentIdea(
  rawInput: ContentIdeaInput,
  authorId: string,
): Promise<{ id: string }> {
  const validated = contentIdeaSchema.parse(rawInput);

  const targetDate = validated.targetDate
    ? parseDateInput(validated.targetDate)
    : null;

  const idea = await prisma.contentIdea.create({
    data: {
      title: validated.title,
      platform: validated.platform,
      contentType: validated.contentType?.trim() || null,
      referenceUrl: validated.referenceUrl?.trim() || null,
      description: validated.description,
      targetDate,
      locationId: validated.locationId?.trim() || null,
      authorId,
      status: "IDE",
    },
    select: { id: true },
  });

  return { id: idea.id };
}

export async function updateContentIdea(
  id: string,
  rawInput: ContentIdeaInput,
  userId: string,
  userRole: string,
): Promise<{ id: string }> {
  const validated = contentIdeaSchema.parse(rawInput);

  const existing = await prisma.contentIdea.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    throw new Error("Ide konten tidak ditemukan.");
  }

  if (userRole !== "ADMIN" && existing.authorId !== userId) {
    throw new Error("Anda hanya dapat mengubah ide konten yang Anda buat.");
  }

  const targetDate = validated.targetDate
    ? parseDateInput(validated.targetDate)
    : null;

  const idea = await prisma.contentIdea.update({
    where: { id },
    data: {
      title: validated.title,
      platform: validated.platform,
      contentType: validated.contentType?.trim() || null,
      referenceUrl: validated.referenceUrl?.trim() || null,
      description: validated.description,
      targetDate,
      locationId: validated.locationId?.trim() || null,
    },
    select: { id: true },
  });

  return { id: idea.id };
}

export async function updateContentIdeaStatus(
  id: string,
  rawInput: UpdateContentStatusInput,
): Promise<{ id: string }> {
  const validated = updateContentStatusSchema.parse(rawInput);

  const existing = await prisma.contentIdea.findUnique({
    where: { id },
    select: { id: true, status: true, publishedUrl: true, publishedAt: true },
  });

  if (!existing) {
    throw new Error("Ide konten tidak ditemukan.");
  }

  const isPublishing = validated.status === "TAYANG";
  const publishedUrl = isPublishing
    ? validated.publishedUrl?.trim() || existing.publishedUrl
    : existing.publishedUrl;
  const publishedAt = isPublishing
    ? existing.publishedAt || new Date()
    : existing.publishedAt;

  const idea = await prisma.contentIdea.update({
    where: { id },
    data: {
      status: validated.status,
      publishedUrl,
      publishedAt,
    },
    select: { id: true },
  });

  return { id: idea.id };
}

export async function deleteContentIdea(
  id: string,
  userId: string,
  userRole: string,
): Promise<{ id: string }> {
  const existing = await prisma.contentIdea.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    throw new Error("Ide konten tidak ditemukan.");
  }

  if (userRole !== "ADMIN" && existing.authorId !== userId) {
    throw new Error("Anda hanya dapat menghapus ide konten yang Anda buat.");
  }

  await prisma.contentIdea.delete({
    where: { id },
  });

  return { id };
}
