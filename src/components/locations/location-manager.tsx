"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";

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
  createLocationAction,
  deleteLocationAction,
  setLocationActiveAction,
  updateLocationAction,
} from "@/server/actions/locations";

export interface LocationRow {
  id: string;
  name: string;
  partner: string;
  address: string;
  category: string;
  description: string | null;
  isActive: boolean;
}

/**
 * Owns the dialogs for the Tempat list.
 *
 * The table itself is rendered on the server; only the interactive bits live
 * here, so the page stays a server component and the list is never shipped to
 * the browser as JSON.
 */
export function AddLocationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Tempat
      </Button>
      <LocationFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function LocationRowActions({ location }: { location: LocationRow }) {
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
            {location.isActive ? (
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
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LocationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        location={location}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={location.isActive ? "Arsipkan tempat?" : "Aktifkan tempat?"}
        description={
          location.isActive
            ? `"${location.name}" tidak akan muncul saat membuat kegiatan atau jadwal baru. Riwayat yang sudah ada tetap utuh.`
            : `"${location.name}" akan bisa dipilih lagi saat membuat kegiatan atau jadwal baru.`
        }
        confirmLabel={location.isActive ? "Arsipkan" : "Aktifkan"}
        successMessage={
          location.isActive ? "Tempat diarsipkan." : "Tempat diaktifkan."
        }
        action={() => setLocationActiveAction(location.id, !location.isActive)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus tempat?"
        description={`"${location.name}" akan dihapus permanen. Jika tempat ini sudah dipakai pada kegiatan atau jadwal, penghapusan akan ditolak dan Anda bisa mengarsipkannya.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Tempat dihapus."
        destructive
        action={() => deleteLocationAction(location.id)}
      />
    </>
  );
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationRow;
}) {
  const isEdit = Boolean(location);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Tempat" : "Tambah Tempat"}
      description="Tempat dipakai ulang untuk jadwal, kelompok murid, dan kegiatan."
      successMessage={isEdit ? "Tempat diperbarui." : "Tempat ditambahkan."}
      action={isEdit ? updateLocationAction : createLocationAction}
    >
      {location ? <input type="hidden" name="id" value={location.id} /> : null}

      <TextField
        name="name"
        label="Nama tempat"
        required
        defaultValue={location?.name}
        placeholder="Desa Binaan Margajaya"
      />
      <TextField
        name="partner"
        label="Mitra"
        required
        defaultValue={location?.partner}
        placeholder="Publik"
      />
      <TextField
        name="category"
        label="Kategori"
        required
        defaultValue={location?.category}
        placeholder="Desa Binaan"
        hint="Bebas diisi sesuai kebutuhan, misalnya Desa Binaan, Sekolah, atau TPQ."
      />
      <TextAreaField
        name="address"
        label="Alamat lengkap"
        required
        rows={3}
        defaultValue={location?.address}
        placeholder="Jalan..., Kel. ..., Kec. ..., Kota ..., Provinsi."
      />
      <TextAreaField
        name="description"
        label="Deskripsi"
        defaultValue={location?.description}
      />
      <ActiveField defaultChecked={location?.isActive ?? true} />
    </FormDialog>
  );
}
