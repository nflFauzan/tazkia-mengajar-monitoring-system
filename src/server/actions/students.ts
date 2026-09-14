"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import {
  studentGroupSchema,
  studentSchema,
} from "@/lib/validation/master-data";

import { describeBlockingReferences } from "../services/deletion";
import { fail, fromZodError, handleUnexpected, ok, readCheckbox } from "./types";
import type { ActionResult } from "./types";

const GROUP_PATH = "/murid/kelompok";
const STUDENT_PATH = "/murid";

// ---------------------------------------------------------------------------
// Student groups
// ---------------------------------------------------------------------------

function parseGroupForm(formData: FormData) {
  return studentGroupSchema.safeParse({
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
}

/**
 * StudentGroup has a unique constraint on (locationId, name). Prisma raises
 * P2002 for that, which is a user mistake rather than a server fault, so it is
 * translated into a field error instead of the generic failure message.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function createStudentGroupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = parseGroupForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.studentGroup.create({ data: parsed.data });
    revalidatePath(GROUP_PATH);
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Periksa kembali data yang diisi.", {
        name: "Kelompok dengan nama ini sudah ada di tempat tersebut.",
      });
    }
    return handleUnexpected(
      "createStudentGroupAction",
      error,
      "Gagal menyimpan kelompok. Silakan coba lagi.",
    );
  }
}

export async function updateStudentGroupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Kelompok tidak ditemukan.");

  const parsed = parseGroupForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.studentGroup.update({ where: { id }, data: parsed.data });
    revalidatePath(GROUP_PATH);
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Periksa kembali data yang diisi.", {
        name: "Kelompok dengan nama ini sudah ada di tempat tersebut.",
      });
    }
    return handleUnexpected(
      "updateStudentGroupAction",
      error,
      "Gagal memperbarui kelompok. Silakan coba lagi.",
    );
  }
}

export async function deleteStudentGroupAction(
  id: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    // Students cascade with their group, so the question is not "does this
    // group have students" but "does any of those students have history".
    const attendanceCount = await prisma.activityStudent.count({
      where: { student: { studentGroupId: id } },
    });
    const scheduleCount = await prisma.scheduleStudentGroup.count({
      where: { studentGroupId: id },
    });

    const blocked = describeBlockingReferences([
      { label: "absensi murid", count: attendanceCount },
      { label: "jadwal", count: scheduleCount },
    ]);

    if (blocked) return fail(blocked);

    await prisma.studentGroup.delete({ where: { id } });
    revalidatePath(GROUP_PATH);
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteStudentGroupAction",
      error,
      "Gagal menghapus kelompok. Silakan coba lagi.",
    );
  }
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

function parseStudentForm(formData: FormData) {
  return studentSchema.safeParse({
    studentGroupId: formData.get("studentGroupId"),
    fullName: formData.get("fullName"),
    gender: formData.get("gender") ?? undefined,
    birthDate: formData.get("birthDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    isActive: readCheckbox(formData, "isActive"),
  });
}

/** Converts the validated form shape into the row Prisma expects. */
function toStudentData(input: ReturnType<typeof parseStudentForm>) {
  if (!input.success) throw new Error("toStudentData called on invalid input");

  const { birthDate, ...rest } = input.data;

  return {
    ...rest,
    birthDate: birthDate ? parseDateInput(birthDate) : null,
  };
}

export async function createStudentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = parseStudentForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.student.create({ data: toStudentData(parsed) });
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "createStudentAction",
      error,
      "Gagal menyimpan murid. Silakan coba lagi.",
    );
  }
}

export async function updateStudentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Murid tidak ditemukan.");

  const parsed = parseStudentForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.student.update({ where: { id }, data: toStudentData(parsed) });
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "updateStudentAction",
      error,
      "Gagal memperbarui murid. Silakan coba lagi.",
    );
  }
}

export async function setStudentActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.student.update({ where: { id }, data: { isActive } });
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "setStudentActiveAction",
      error,
      "Gagal mengubah status murid. Silakan coba lagi.",
    );
  }
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  await requireUser();

  try {
    const attendanceCount = await prisma.activityStudent.count({
      where: { studentId: id },
    });

    const blocked = describeBlockingReferences([
      { label: "absensi kegiatan", count: attendanceCount },
    ]);

    if (blocked) return fail(blocked);

    await prisma.student.delete({ where: { id } });
    revalidatePath(STUDENT_PATH);
    return ok();
  } catch (error) {
    return handleUnexpected(
      "deleteStudentAction",
      error,
      "Gagal menghapus murid. Silakan coba lagi.",
    );
  }
}
