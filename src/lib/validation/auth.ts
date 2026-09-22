import { z } from "zod";

/**
 * Shared by the login form (for immediate feedback) and by the server action
 * (as the actual security boundary). Client-side validation is a convenience;
 * the server parses the same schema before touching the database.
 *
 * The rules here are intentionally loose — a login form must accept whatever
 * the user's password already is. Strength rules belong on the create-user
 * schema, not here.
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi.")
    .max(64, "Username terlalu panjang."),
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(200, "Password terlalu panjang."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Rules applied when an admin account is created or its password changed. */
export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(200, "Password terlalu panjang.");

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(64, "Username terlalu panjang.")
    .regex(
      /^[a-zA-Z0-9._@-]+$/,
      "Username hanya boleh berisi huruf, angka, titik, garis bawah, strip, dan @.",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(120, "Nama terlalu panjang."),
  password: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createPengajarUserSchema = z.object({
  teamMemberId: z.string().min(1, "Anggota tim wajib dipilih."),
  phone: z.string().trim().max(32, "Nomor kontak terlalu panjang.").optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(64, "Username terlalu panjang.")
    .regex(
      /^[a-zA-Z0-9._@-]+$/,
      "Username hanya boleh berisi huruf, angka, titik, garis bawah, strip, dan @.",
    ),
  initialPassword: passwordSchema,
});

export type CreatePengajarUserInput = z.infer<typeof createPengajarUserSchema>;

export const firstTimePasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Konfirmasi password baru wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak cocok.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

export type FirstTimePasswordChangeInput = z.infer<
  typeof firstTimePasswordChangeSchema
>;
