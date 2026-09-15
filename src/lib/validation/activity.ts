import { z } from "zod";

/**
 * Activity schemas, one per wizard step.
 *
 * The wizard persists a DRAFT row as soon as step 1 is submitted and edits it
 * from then on, so each step validates only its own slice. That is why these
 * are separate schemas rather than one big object with everything optional:
 * each step can be strict about what it owns without forcing later steps to be
 * filled in first.
 */

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const activityInfoSchema = z
  .object({
    locationId: z.string().min(1, "Tempat wajib dipilih."),
    scheduleId: z
      .union([z.string(), z.literal("")])
      .optional()
      .transform((value) => (value ? value : undefined)),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal kegiatan wajib diisi."),
    startTime: z.string().regex(timePattern, "Waktu mulai tidak valid."),
    endTime: z.string().regex(timePattern, "Waktu selesai tidak valid."),
    partner: z
      .string()
      .trim()
      .min(1, "Mitra wajib diisi.")
      .max(160, "Mitra terlalu panjang."),
    beneficiary: z
      .string()
      .trim()
      .min(1, "Penerima manfaat wajib diisi.")
      .max(300, "Penerima manfaat terlalu panjang."),
    beneficiaryCount: z.coerce
      .number()
      .int("Jumlah penerima manfaat harus bilangan bulat.")
      .min(0, "Jumlah penerima manfaat tidak boleh negatif.")
      .max(100_000, "Jumlah penerima manfaat terlalu besar."),
    aidType: z
      .string()
      .trim()
      .min(1, "Jenis bantuan wajib diisi.")
      .max(300, "Jenis bantuan terlalu panjang."),
    notes: z
      .string()
      .trim()
      .max(2000, "Catatan terlalu panjang.")
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  // An activity that ends before it starts is always a typo, and catching it
  // here keeps the report from printing an impossible time range.
  .refine((data) => data.endTime > data.startTime, {
    message: "Waktu selesai harus setelah waktu mulai.",
    path: ["endTime"],
  });

export type ActivityInfoInput = z.infer<typeof activityInfoSchema>;

export const attendanceStatusSchema = z.enum([
  "HADIR",
  "IZIN",
  "SAKIT",
  "ALPA",
]);

export const activityTeamSchema = z.object({
  entries: z
    .array(
      z.object({
        teamMemberId: z.string().min(1),
        attendance: attendanceStatusSchema,
        note: z
          .string()
          .trim()
          .max(500)
          .optional()
          .transform((value) => (value ? value : undefined)),
      }),
    )
    .max(200),
});

export const activityStudentsSchema = z.object({
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        attendance: attendanceStatusSchema,
        note: z
          .string()
          .trim()
          .max(500)
          .optional()
          .transform((value) => (value ? value : undefined)),
      }),
    )
    .max(500),
});

export const activityMaterialsSchema = z.object({
  materialIds: z.array(z.string().min(1)).max(50),
});

export const narrativeSchema = z
  .string()
  .trim()
  .min(1, "Narasi wajib diisi.")
  .max(5000, "Narasi terlalu panjang.");

export const activityStatusSchema = z.enum([
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
]);
