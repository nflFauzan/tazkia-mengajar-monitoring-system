/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import {
  contentIdeaSchema,
  updateContentStatusSchema,
} from "@/lib/validation/content-idea";
import {
  createContentIdea,
  deleteContentIdea,
  updateContentIdea,
  updateContentIdeaStatus,
} from "./content-ideas";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    contentIdea: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("Content Idea Validation", () => {
  it("validates valid content idea input", () => {
    const parsed = contentIdeaSchema.safeParse({
      title: "Kegiatan Belajar di Ciampea",
      platform: "INSTAGRAM",
      contentType: "Reels / Video Pendek",
      referenceUrl: "https://instagram.com/reel/123",
      description: "Merekam antusiasme adik-adik saat sesi mewarnai.",
    });

    expect(parsed.success).toBe(true);
  });

  it("fails when title is empty", () => {
    const parsed = contentIdeaSchema.safeParse({
      title: "   ",
      platform: "TIKTOK",
      description: "Deskripsi konsep konten.",
    });

    expect(parsed.success).toBe(false);
  });

  it("fails when referenceUrl is not a valid URL", () => {
    const parsed = contentIdeaSchema.safeParse({
      title: "Ide Konten",
      platform: "TIKTOK",
      referenceUrl: "bukan-sebuah-url",
      description: "Deskripsi konsep konten.",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates update status schema requiring publishedUrl when status is TAYANG", () => {
    const invalidTayang = updateContentStatusSchema.safeParse({
      status: "TAYANG",
      publishedUrl: "",
    });
    expect(invalidTayang.success).toBe(false);

    const validTayang = updateContentStatusSchema.safeParse({
      status: "TAYANG",
      publishedUrl: "https://instagram.com/reel/xyz",
    });
    expect(validTayang.success).toBe(true);

    const validRencana = updateContentStatusSchema.safeParse({
      status: "RENCANA",
    });
    expect(validRencana.success).toBe(true);
  });
});

describe("Content Idea Service", () => {
  it("creates content idea with authorId", async () => {
    vi.mocked(prisma.contentIdea.create).mockResolvedValueOnce({
      id: "idea-123",
    } as any);

    const result = await createContentIdea(
      {
        title: "Vlog Relawan Hari Minggu",
        platform: "TIKTOK",
        description: "Dokumentasi perjalanan relawan ke tempat belajar.",
      },
      "user-author-1",
    );

    expect(result.id).toBe("idea-123");
    expect(prisma.contentIdea.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Vlog Relawan Hari Minggu",
          platform: "TIKTOK",
          authorId: "user-author-1",
          status: "IDE",
        }),
      }),
    );
  });

  it("updates content idea status to TAYANG with publishedUrl and date", async () => {
    vi.mocked(prisma.contentIdea.findUnique).mockResolvedValueOnce({
      id: "idea-123",
      status: "IDE",
      publishedUrl: null,
      publishedAt: null,
    } as any);
    vi.mocked(prisma.contentIdea.update).mockResolvedValueOnce({
      id: "idea-123",
    } as any);

    const result = await updateContentIdeaStatus("idea-123", {
      status: "TAYANG",
      publishedUrl: "https://instagram.com/reel/abc12345",
    });

    expect(result.id).toBe("idea-123");
    expect(prisma.contentIdea.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idea-123" },
        data: expect.objectContaining({
          status: "TAYANG",
          publishedUrl: "https://instagram.com/reel/abc12345",
        }),
      }),
    );
  });

  it("forbids non-author non-admin from updating content idea", async () => {
    vi.mocked(prisma.contentIdea.findUnique).mockResolvedValueOnce({
      id: "idea-123",
      authorId: "user-author-1",
    } as any);

    await expect(
      updateContentIdea(
        "idea-123",
        {
          title: "Judul Baru",
          platform: "INSTAGRAM",
          description: "Deskripsi baru",
        },
        "user-other",
        "PENGAJAR",
      ),
    ).rejects.toThrow("Anda hanya dapat mengubah ide konten yang Anda buat.");
  });

  it("allows admin to update any content idea", async () => {
    vi.mocked(prisma.contentIdea.findUnique).mockResolvedValueOnce({
      id: "idea-123",
      authorId: "user-author-1",
    } as any);
    vi.mocked(prisma.contentIdea.update).mockResolvedValueOnce({
      id: "idea-123",
    } as any);

    const result = await updateContentIdea(
      "idea-123",
      {
        title: "Judul Diedit Admin",
        platform: "INSTAGRAM",
        description: "Deskripsi",
      },
      "user-admin",
      "ADMIN",
    );

    expect(result.id).toBe("idea-123");
  });

  it("forbids non-author non-admin from deleting content idea", async () => {
    vi.mocked(prisma.contentIdea.findUnique).mockResolvedValueOnce({
      id: "idea-123",
      authorId: "user-author-1",
    } as any);

    await expect(
      deleteContentIdea("idea-123", "user-other", "PENGAJAR"),
    ).rejects.toThrow("Anda hanya dapat menghapus ide konten yang Anda buat.");
  });

  it("allows author to delete their own content idea", async () => {
    vi.mocked(prisma.contentIdea.findUnique).mockResolvedValueOnce({
      id: "idea-123",
      authorId: "user-author-1",
    } as any);
    vi.mocked(prisma.contentIdea.delete).mockResolvedValueOnce({
      id: "idea-123",
    } as any);

    const result = await deleteContentIdea("idea-123", "user-author-1", "PENGAJAR");
    expect(result.id).toBe("idea-123");
    expect(prisma.contentIdea.delete).toHaveBeenCalledWith({
      where: { id: "idea-123" },
    });
  });
});
