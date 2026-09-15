"use client";

import { useState } from "react";
import { KeyRound, Plus, UserMinus, UserPlus } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog, TextField } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import {
  createAdminAction,
  changePasswordAction,
  setUserActiveAction,
} from "@/server/actions/users";

export interface UserRow {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
  isCurrentUser: boolean;
}

export function AddAdminButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Admin
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah Admin"
        description="Semua pengguna aplikasi ini berperan sebagai Admin."
        successMessage="Admin ditambahkan."
        action={createAdminAction}
      >
        <TextField name="name" label="Nama lengkap" required />
        <TextField
          name="username"
          label="Username"
          required
          hint="Huruf, angka, titik, garis bawah, dan strip."
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          required
          hint="Minimal 8 karakter."
        />
      </FormDialog>
    </>
  );
}

export function UserRowActions({ user }: { user: UserRow }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [activeOpen, setActiveOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setPasswordOpen(true)}
        aria-label={`Ubah password ${user.name}`}
      >
        <KeyRound className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveOpen(true)}
        aria-label={
          user.isActive ? `Nonaktifkan ${user.name}` : `Aktifkan ${user.name}`
        }
        disabled={user.isCurrentUser && user.isActive}
        title={
          user.isCurrentUser && user.isActive
            ? "Anda tidak bisa menonaktifkan akun sendiri."
            : undefined
        }
      >
        {user.isActive ? (
          <UserMinus className="size-4" />
        ) : (
          <UserPlus className="size-4" />
        )}
      </Button>

      <FormDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title={`Ubah Password — ${user.name}`}
        successMessage="Password diperbarui."
        action={changePasswordAction}
      >
        <input type="hidden" name="userId" value={user.id} />
        <TextField
          name="password"
          label="Password baru"
          type="password"
          required
          hint="Minimal 8 karakter."
        />
      </FormDialog>

      <ConfirmDialog
        open={activeOpen}
        onOpenChange={setActiveOpen}
        title={user.isActive ? "Nonaktifkan admin?" : "Aktifkan admin?"}
        description={
          user.isActive
            ? `${user.name} tidak akan bisa masuk lagi sampai diaktifkan kembali.`
            : `${user.name} akan bisa masuk kembali.`
        }
        confirmLabel={user.isActive ? "Nonaktifkan" : "Aktifkan"}
        successMessage="Status pengguna diperbarui."
        destructive={user.isActive}
        action={() => setUserActiveAction(user.id, !user.isActive)}
      />
    </div>
  );
}
