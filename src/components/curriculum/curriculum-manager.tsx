"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  ActiveField,
  FormDialog,
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
  createCurriculumAction,
  createMaterialAction,
  createPeriodAction,
  deleteCurriculumAction,
  deleteMaterialAction,
  deletePeriodAction,
  updateCurriculumAction,
  updateMaterialAction,
} from "@/server/actions/curriculum";

export interface MaterialRow {
  id: string;
  title: string;
  meetingLabel: string | null;
  objective: string | null;
  description: string | null;
  notes: string | null;
  orderIndex: number;
  isActive: boolean;
  periodId: string;
}

export interface CurriculumRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export function AddCurriculumButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Kurikulum
      </Button>
      <CurriculumFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CurriculumActions({
  curriculum,
}: {
  curriculum: CurriculumRow;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="Aksi kurikulum">
              Aksi
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Ubah
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

      <CurriculumFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        curriculum={curriculum}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus kurikulum?"
        description={`"${curriculum.name}" beserta seluruh periode dan materinya akan dihapus permanen. Jika ada materi yang sudah dipakai pada kegiatan, penghapusan akan ditolak.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Kurikulum dihapus."
        destructive
        action={() => deleteCurriculumAction(curriculum.id)}
      />
    </>
  );
}

function CurriculumFormDialog({
  open,
  onOpenChange,
  curriculum,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculum?: CurriculumRow;
}) {
  const isEdit = Boolean(curriculum);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Kurikulum" : "Tambah Kurikulum"}
      successMessage={
        isEdit ? "Kurikulum diperbarui." : "Kurikulum ditambahkan."
      }
      action={isEdit ? updateCurriculumAction : createCurriculumAction}
    >
      {curriculum ? (
        <input type="hidden" name="id" value={curriculum.id} />
      ) : null}
      <TextField
        name="name"
        label="Nama kurikulum"
        required
        defaultValue={curriculum?.name}
        placeholder="Tazkia Mengajar"
      />
      <TextAreaField
        name="description"
        label="Deskripsi"
        defaultValue={curriculum?.description}
      />
      <ActiveField defaultChecked={curriculum?.isActive ?? true} />
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Period
// ---------------------------------------------------------------------------

export function AddPeriodButton({ curriculumId }: { curriculumId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Periode
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah Periode"
        description="Misalnya Semester 1, Semester 2, atau Triwulan I."
        successMessage="Periode ditambahkan."
        action={createPeriodAction}
      >
        <input type="hidden" name="curriculumId" value={curriculumId} />
        <TextField name="name" label="Nama periode" required placeholder="Semester 1" />
        <TextField
          name="orderIndex"
          label="Urutan"
          type="number"
          defaultValue="0"
          hint="Menentukan urutan tampil. Boleh dibiarkan 0."
        />
      </FormDialog>
    </>
  );
}

export function DeletePeriodButton({
  periodId,
  periodName,
}: {
  periodId: string;
  periodName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Hapus periode ${periodName}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus periode?"
        description={`"${periodName}" beserta materinya akan dihapus permanen. Jika ada materi yang sudah dipakai pada kegiatan, penghapusan akan ditolak.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Periode dihapus."
        destructive
        action={() => deletePeriodAction(periodId)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

export function AddMaterialButton({ periodId }: { periodId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Materi
      </Button>
      <MaterialFormDialog
        open={open}
        onOpenChange={setOpen}
        periodId={periodId}
      />
    </>
  );
}

export function MaterialActions({ material }: { material: MaterialRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Ubah ${material.title}`}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Hapus ${material.title}`}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <MaterialFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        periodId={material.periodId}
        material={material}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus materi?"
        description={`"${material.title}" akan dihapus permanen. Jika sudah dipakai pada kegiatan, penghapusan akan ditolak.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Materi dihapus."
        destructive
        action={() => deleteMaterialAction(material.id)}
      />
    </>
  );
}

function MaterialFormDialog({
  open,
  onOpenChange,
  periodId,
  material,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  material?: MaterialRow;
}) {
  const isEdit = Boolean(material);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Materi" : "Tambah Materi"}
      successMessage={isEdit ? "Materi diperbarui." : "Materi ditambahkan."}
      action={isEdit ? updateMaterialAction : createMaterialAction}
    >
      {material ? <input type="hidden" name="id" value={material.id} /> : null}
      <input type="hidden" name="periodId" value={periodId} />

      <TextField
        name="title"
        label="Judul materi"
        required
        defaultValue={material?.title}
        placeholder="Adab kepada Orang Tua"
      />
      <TextField
        name="meetingLabel"
        label="Pertemuan"
        defaultValue={material?.meetingLabel}
        placeholder="Pertemuan 5"
      />
      <TextAreaField
        name="objective"
        label="Target pembelajaran"
        defaultValue={material?.objective}
        placeholder="Murid memahami adab dasar kepada orang tua."
      />
      <TextAreaField
        name="description"
        label="Deskripsi"
        defaultValue={material?.description}
      />
      <TextAreaField
        name="notes"
        label="Catatan"
        defaultValue={material?.notes}
      />
      <TextField
        name="orderIndex"
        label="Urutan"
        type="number"
        defaultValue={String(material?.orderIndex ?? 0)}
      />
      <ActiveField defaultChecked={material?.isActive ?? true} />
    </FormDialog>
  );
}
