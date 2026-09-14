"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  ActiveField,
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createStudentAction,
  deleteStudentAction,
  setStudentActiveAction,
  updateStudentAction,
} from "@/server/actions/students";

/** Groups the student can belong to, passed down from the server component. */
export interface GroupOption {
  value: string;
  label: string;
}

export interface StudentRow {
  id: string;
  fullName: string;
  gender: "LAKI_LAKI" | "PEREMPUAN" | null;
  birthDate: string | null;
  notes: string | null;
  isActive: boolean;
  studentGroupId: string;
}

const GENDER_OPTIONS = [
  { value: "LAKI_LAKI", label: "Laki-laki" },
  { value: "PEREMPUAN", label: "Perempuan" },
];

export function AddStudentButton({ groups }: { groups: GroupOption[] }) {
  const [open, setOpen] = useState(false);

  // Without a group there is nowhere to put a student, so the button explains
  // that rather than opening a form that cannot be submitted.
  if (groups.length === 0) {
    return (
      <Button disabled title="Buat kelompok murid terlebih dahulu.">
        <Plus className="size-4" />
        Tambah Murid
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Murid
      </Button>
      <StudentFormDialog open={open} onOpenChange={setOpen} groups={groups} />
    </>
  );
}

export function StudentRowActions({
  student,
  groups,
}: {
  student: StudentRow;
  groups: GroupOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="Aksi">
              Aksi
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Ubah
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
            {student.isActive ? (
              <>
                <Archive className="size-4" />
                Arsipkan
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Aktifkan
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StudentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        groups={groups}
        student={student}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={student.isActive ? "Arsipkan murid?" : "Aktifkan murid?"}
        description={
          student.isActive
            ? `${student.fullName} tidak akan muncul saat mencatat absensi kegiatan baru. Riwayat tetap utuh.`
            : `${student.fullName} akan bisa dicatat lagi pada kegiatan baru.`
        }
        confirmLabel={student.isActive ? "Arsipkan" : "Aktifkan"}
        successMessage={
          student.isActive ? "Murid diarsipkan." : "Murid diaktifkan."
        }
        action={() => setStudentActiveAction(student.id, !student.isActive)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus murid?"
        description={`${student.fullName} akan dihapus permanen. Jika sudah pernah tercatat pada absensi, penghapusan akan ditolak dan Anda bisa mengarsipkannya.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Murid dihapus."
        destructive
        action={() => deleteStudentAction(student.id)}
      />
    </>
  );
}

function StudentFormDialog({
  open,
  onOpenChange,
  groups,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupOption[];
  student?: StudentRow;
}) {
  const isEdit = Boolean(student);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Murid" : "Tambah Murid"}
      successMessage={isEdit ? "Murid diperbarui." : "Murid ditambahkan."}
      action={isEdit ? updateStudentAction : createStudentAction}
    >
      {student ? <input type="hidden" name="id" value={student.id} /> : null}

      <TextField
        name="fullName"
        label="Nama murid"
        required
        defaultValue={student?.fullName}
      />
      <SelectField
        name="studentGroupId"
        label="Kelompok"
        required
        options={groups}
        defaultValue={student?.studentGroupId}
        placeholder="Pilih kelompok"
      />
      <SelectField
        name="gender"
        label="Jenis kelamin"
        options={GENDER_OPTIONS}
        defaultValue={student?.gender ?? ""}
        placeholder="Tidak diisi"
      />
      <TextField
        name="birthDate"
        label="Tanggal lahir"
        type="date"
        defaultValue={student?.birthDate}
      />
      <TextAreaField
        name="notes"
        label="Catatan"
        defaultValue={student?.notes}
      />
      <ActiveField defaultChecked={student?.isActive ?? true} />
    </FormDialog>
  );
}
