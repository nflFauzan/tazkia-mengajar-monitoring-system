"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  createStudentGroupAction,
  deleteStudentGroupAction,
  updateStudentGroupAction,
} from "@/server/actions/students";

export interface LocationOption {
  value: string;
  label: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  locationId: string;
}

export function AddGroupButton({
  locations,
}: {
  locations: LocationOption[];
}) {
  const [open, setOpen] = useState(false);

  if (locations.length === 0) {
    return (
      <Button disabled title="Buat tempat terlebih dahulu.">
        <Plus className="size-4" />
        Tambah Kelompok
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Kelompok
      </Button>
      <GroupFormDialog
        open={open}
        onOpenChange={setOpen}
        locations={locations}
      />
    </>
  );
}

export function GroupRowActions({
  group,
  locations,
}: {
  group: GroupRow;
  locations: LocationOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
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
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        locations={locations}
        group={group}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus kelompok?"
        description={`"${group.name}" dan seluruh murid di dalamnya akan dihapus permanen. Jika ada murid yang sudah tercatat pada absensi, penghapusan akan ditolak.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Kelompok dihapus."
        destructive
        action={() => deleteStudentGroupAction(group.id)}
      />
    </>
  );
}

function GroupFormDialog({
  open,
  onOpenChange,
  locations,
  group,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationOption[];
  group?: GroupRow;
}) {
  const isEdit = Boolean(group);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Kelompok" : "Tambah Kelompok"}
      description="Kelompok bebas dibuat sesuai kebutuhan tempat, misalnya Kelas Anak, Remaja, atau Tahsin."
      successMessage={isEdit ? "Kelompok diperbarui." : "Kelompok ditambahkan."}
      action={isEdit ? updateStudentGroupAction : createStudentGroupAction}
    >
      {group ? <input type="hidden" name="id" value={group.id} /> : null}

      <TextField
        name="name"
        label="Nama kelompok"
        required
        defaultValue={group?.name}
        placeholder="Kelas Anak"
      />
      <SelectField
        name="locationId"
        label="Tempat"
        required
        options={locations}
        defaultValue={group?.locationId}
        placeholder="Pilih tempat"
      />
      <TextAreaField
        name="description"
        label="Deskripsi"
        defaultValue={group?.description}
      />
      <ActiveField defaultChecked={group?.isActive ?? true} />
    </FormDialog>
  );
}
