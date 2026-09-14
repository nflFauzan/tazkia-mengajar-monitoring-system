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
  createTeamMemberAction,
  deleteTeamMemberAction,
  setTeamMemberActiveAction,
  updateTeamMemberAction,
} from "@/server/actions/team-members";

export interface TeamMemberRow {
  id: string;
  fullName: string;
  nickname: string | null;
  status: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

export function AddTeamMemberButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Anggota
      </Button>
      <TeamMemberFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function TeamMemberRowActions({ member }: { member: TeamMemberRow }) {
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
            {member.isActive ? (
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

      <TeamMemberFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={member.isActive ? "Arsipkan anggota?" : "Aktifkan anggota?"}
        description={
          member.isActive
            ? `${member.fullName} tidak akan muncul saat memilih tim untuk kegiatan baru. Riwayat absensi tetap utuh.`
            : `${member.fullName} akan bisa dipilih lagi untuk kegiatan baru.`
        }
        confirmLabel={member.isActive ? "Arsipkan" : "Aktifkan"}
        successMessage={
          member.isActive ? "Anggota diarsipkan." : "Anggota diaktifkan."
        }
        action={() => setTeamMemberActiveAction(member.id, !member.isActive)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus anggota tim?"
        description={`${member.fullName} akan dihapus permanen. Jika sudah pernah tercatat pada absensi kegiatan, penghapusan akan ditolak dan Anda bisa mengarsipkannya.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Anggota tim dihapus."
        destructive
        action={() => deleteTeamMemberAction(member.id)}
      />
    </>
  );
}

function TeamMemberFormDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMemberRow;
}) {
  const isEdit = Boolean(member);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Anggota Tim" : "Tambah Anggota Tim"}
      description="Pengajar, pembimbing, dan anggota tim dicatat sebagai satu daftar."
      successMessage={isEdit ? "Anggota diperbarui." : "Anggota ditambahkan."}
      action={isEdit ? updateTeamMemberAction : createTeamMemberAction}
    >
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <TextField
        name="fullName"
        label="Nama lengkap"
        required
        defaultValue={member?.fullName}
      />
      <TextField
        name="nickname"
        label="Nama panggilan"
        defaultValue={member?.nickname}
      />
      <TextField
        name="status"
        label="Status"
        defaultValue={member?.status}
        placeholder="Pengajar"
        hint="Label bebas, misalnya Pengajar atau Pembimbing."
      />
      <TextField
        name="phone"
        label="Nomor kontak"
        defaultValue={member?.phone}
        placeholder="08xxxxxxxxxx"
      />
      <TextAreaField name="notes" label="Catatan" defaultValue={member?.notes} />
      <ActiveField defaultChecked={member?.isActive ?? true} />
    </FormDialog>
  );
}
