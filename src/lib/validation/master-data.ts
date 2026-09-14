import { z } from "zod";

/**
 * Zod schemas for every master-data entity.
 *
 * Each is shared by the React Hook Form resolver and the Server Action that
 * writes the row, so the rules cannot drift apart. The form gets instant
 * feedback; the action is the boundary that actually enforces them.
 *
 * Optional free-text fields normalise "" to undefined, because an empty input
 * should store NULL rather than an empty string — otherwise "has no notes" and
 * "has empty notes" become two states every query has to handle.
 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} terlalu panjang.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} terlalu panjang.`);

// --------------------------------------------------------------------------
// Location
// --------------------------------------------------------------------------

export const locationSchema = z.object({
  name: requiredText(160, "Nama tempat"),
  partner: requiredText(160, "Mitra"),
  address: requiredText(600, "Alamat"),
  category: requiredText(80, "Kategori"),
  description: optionalText(1000, "Deskripsi"),
  isActive: z.boolean().default(true),
});

export type LocationInput = z.infer<typeof locationSchema>;

// --------------------------------------------------------------------------
// Team member — Pengajar, Pembimbing and Anggota Tim are one entity
// --------------------------------------------------------------------------

export const teamMemberSchema = z.object({
  fullName: requiredText(160, "Nama lengkap"),
  nickname: optionalText(80, "Nama panggilan"),
  status: optionalText(80, "Status"),
  phone: z
    .string()
    .trim()
    .max(32, "Nomor kontak terlalu panjang.")
    .regex(
      /^[0-9+\-\s()]*$/,
      "Nomor kontak hanya boleh berisi angka dan simbol telepon.",
    )
    .optional()
    .transform((value) => (value ? value : undefined)),
  photoUrl: z
    .union([z.string().trim().url("URL foto tidak valid."), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  notes: optionalText(1000, "Catatan"),
  isActive: z.boolean().default(true),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

// --------------------------------------------------------------------------
// Student group and student
// --------------------------------------------------------------------------

export const studentGroupSchema = z.object({
  locationId: z.string().min(1, "Tempat wajib dipilih."),
  name: requiredText(120, "Nama kelompok"),
  description: optionalText(600, "Deskripsi"),
  isActive: z.boolean().default(true),
});

export type StudentGroupInput = z.infer<typeof studentGroupSchema>;

export const studentSchema = z.object({
  studentGroupId: z.string().min(1, "Kelompok wajib dipilih."),
  fullName: requiredText(160, "Nama murid"),
  gender: z
    .union([z.enum(["LAKI_LAKI", "PEREMPUAN"]), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  birthDate: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal lahir tidak valid."),
      z.literal(""),
    ])
    .optional()
    .transform((value) => (value ? value : undefined)),
  notes: optionalText(600, "Catatan"),
  isActive: z.boolean().default(true),
});

export type StudentInput = z.infer<typeof studentSchema>;

// --------------------------------------------------------------------------
// Curriculum: Curriculum -> Period -> Material
// --------------------------------------------------------------------------

export const curriculumSchema = z.object({
  name: requiredText(160, "Nama kurikulum"),
  description: optionalText(1000, "Deskripsi"),
  isActive: z.boolean().default(true),
});

export type CurriculumInput = z.infer<typeof curriculumSchema>;

export const curriculumPeriodSchema = z.object({
  curriculumId: z.string().min(1, "Kurikulum wajib dipilih."),
  name: requiredText(120, "Nama periode"),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export type CurriculumPeriodInput = z.infer<typeof curriculumPeriodSchema>;

export const curriculumMaterialSchema = z.object({
  periodId: z.string().min(1, "Periode wajib dipilih."),
  title: requiredText(200, "Judul materi"),
  meetingLabel: optionalText(80, "Pertemuan"),
  objective: optionalText(600, "Target pembelajaran"),
  description: optionalText(1500, "Deskripsi"),
  notes: optionalText(600, "Catatan"),
  orderIndex: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CurriculumMaterialInput = z.infer<typeof curriculumMaterialSchema>;
