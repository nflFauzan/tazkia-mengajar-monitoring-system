import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A schedule is a plan, not proof that anything happened. It never becomes an
 * Activity by itself (CLAUDE.md section 15).
 */
export const scheduleSchema = z
  .object({
    locationId: z.string().min(1, "Tempat wajib dipilih."),
    title: z
      .string()
      .trim()
      .min(1, "Nama jadwal wajib diisi.")
      .max(200, "Nama jadwal terlalu panjang."),
    recurrence: z.enum(["WEEKLY", "CUSTOM"]),
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .max(7, "Hari tidak valid."),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai wajib diisi."),
    endDate: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal berakhir tidak valid."),
        z.literal(""),
      ])
      .optional()
      .transform((value) => (value ? value : undefined)),
    startTime: z.string().regex(timePattern, "Waktu mulai tidak valid."),
    endTime: z.string().regex(timePattern, "Waktu selesai tidak valid."),
    notes: z
      .string()
      .trim()
      .max(1000, "Catatan terlalu panjang.")
      .optional()
      .transform((value) => (value ? value : undefined)),
    teamMemberIds: z.array(z.string().min(1)).max(200),
    studentGroupIds: z.array(z.string().min(1)).max(100),
    isActive: z.boolean(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "Waktu selesai harus setelah waktu mulai.",
    path: ["endTime"],
  })
  .refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    {
      message: "Tanggal berakhir harus setelah tanggal mulai.",
      path: ["endDate"],
    },
  )
  // A weekly schedule with no days selected would never produce an occurrence,
  // which looks like a working schedule but silently shows nothing on the
  // calendar.
  .refine(
    (data) => data.recurrence !== "WEEKLY" || data.daysOfWeek.length > 0,
    {
      message: "Pilih minimal satu hari untuk jadwal mingguan.",
      path: ["daysOfWeek"],
    },
  );

export type ScheduleInput = z.infer<typeof scheduleSchema>;
