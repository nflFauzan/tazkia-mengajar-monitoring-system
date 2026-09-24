import { z } from "zod";

export const contentPlatformEnum = z.enum([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "LAINNYA",
]);

export const contentStatusEnum = z.enum([
  "IDE",
  "RENCANA",
  "PROSES_EDIT",
  "TAYANG",
]);

export const contentIdeaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul atau topik ide konten wajib diisi.")
    .max(200, "Judul terlalu panjang (maksimal 200 karakter)."),
  platform: contentPlatformEnum.default("INSTAGRAM"),
  contentType: z
    .string()
    .trim()
    .max(100, "Jenis konten terlalu panjang.")
    .optional()
    .or(z.literal("")),
  referenceUrl: z
    .string()
    .trim()
    .url("URL referensi tidak valid.")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(1, "Konsep atau deskripsi ide wajib diisi.")
    .max(2000, "Deskripsi terlalu panjang (maksimal 2000 karakter)."),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.")
    .optional()
    .or(z.literal("")),
  locationId: z
    .string()
    .optional()
    .or(z.literal("")),
});

export const updateContentStatusSchema = z
  .object({
    status: contentStatusEnum,
    publishedUrl: z
      .string()
      .trim()
      .url("URL postingan tidak valid.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.status === "TAYANG") {
        return !!data.publishedUrl && data.publishedUrl.trim().length > 0;
      }
      return true;
    },
    {
      message: "Tautan postingan sosmed wajib diisi saat status tayang.",
      path: ["publishedUrl"],
    },
  );

export type ContentIdeaInput = z.infer<typeof contentIdeaSchema>;
export type UpdateContentStatusInput = z.infer<typeof updateContentStatusSchema>;
