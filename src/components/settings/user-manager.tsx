"use client";

import { useState } from "react";
import {
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Sparkles,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog, TextField } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generatePengajarUsername,
  generateTemporaryPassword,
} from "@/lib/auth/credentials-generator";
import {
  changePasswordAction,
  createAdminAction,
  createPengajarUserAction,
  resetPengajarPasswordAction,
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

export function AddPengajarButton({
  teamMembers,
}: {
  teamMembers: Array<{
    id: string;
    fullName: string;
    nickname?: string | null;
    status: string | null;
  }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={teamMembers.length === 0}>
        <Plus className="size-4" />
        Tambah Akun Pengajar
      </Button>
      {open ? (
        <AddPengajarDialog
          open={open}
          onOpenChange={setOpen}
          teamMembers={teamMembers}
        />
      ) : null}
    </>
  );
}

function AddPengajarDialog({
  open,
  onOpenChange,
  teamMembers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: Array<{
    id: string;
    fullName: string;
    nickname?: string | null;
    status: string | null;
  }>;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(
    () => teamMembers[0]?.id ?? "",
  );
  const [isFounder, setIsFounder] = useState(true);
  const [customUsername, setCustomUsername] = useState<string | null>(null);
  const [password, setPassword] = useState(() => generateTemporaryPassword());

  const effectiveMemberId = selectedMemberId || teamMembers[0]?.id || "";
  const selectedMember =
    teamMembers.find((m) => m.id === effectiveMemberId) ?? teamMembers[0];

  const autoUsername = selectedMember
    ? generatePengajarUsername(selectedMember.fullName, selectedMember.nickname, {
        isFounder,
      })
    : "";

  const username = customUsername ?? autoUsername;
  const isUsernameEdited = customUsername !== null;

  const handleCopyCredentials = () => {
    const displayName =
      selectedMember?.nickname || selectedMember?.fullName || "Pengajar";
    const text = `Assalamu'alaikum ${displayName},\nAkun Tazkia Mengajar kamu sudah dibuatkan:\n\nUsername: ${username}\nPassword Sementara: ${password}\n\nSilakan login dan kamu akan diminta mengganti password baru saat pertama kali login.`;
    navigator.clipboard.writeText(text);
    toast.success("Kredensial login disalin ke clipboard!");
  };

  const handleRegeneratePassword = () => {
    const newPass = generateTemporaryPassword();
    setPassword(newPass);
    toast.info("Password baru telah diacak.");
  };

  const handleResetUsername = () => {
    setCustomUsername(null);
    toast.info("Username dikembalikan ke format otomatis.");
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Akun Pengajar"
      description="Tautkan anggota tim ke akun login baru. Pengajar akan diminta mengubah password sementara pada login pertama."
      successMessage="Akun pengajar berhasil dibuat."
      action={createPengajarUserAction}
    >
      <div className="space-y-2">
        <Label htmlFor="teamMemberId">Pilih Anggota Tim / Pengajar *</Label>
        <select
          id="teamMemberId"
          name="teamMemberId"
          value={effectiveMemberId}
          onChange={(e) => {
            setSelectedMemberId(e.target.value);
            setCustomUsername(null);
          }}
          className="h-9 w-full rounded-md border-2 border-input bg-card px-3 text-sm font-medium shadow-[var(--shadow-brutal-sm)] outline-none focus-visible:border-ring"
          required
        >
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName}
              {member.status ? ` (${member.status})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs pt-1">
        <span className="font-semibold text-muted-foreground">Format Akun:</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setIsFounder(true)}
            className={`px-2.5 py-1 text-xs font-bold rounded border transition-colors ${
              isFounder
                ? "bg-primary text-primary-foreground border-border shadow-[1px_1px_0_0_black]"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            Pendiri / Core (Tanpa Angka)
          </button>
          <button
            type="button"
            onClick={() => setIsFounder(false)}
            className={`px-2.5 py-1 text-xs font-bold rounded border transition-colors ${
              !isFounder
                ? "bg-primary text-primary-foreground border-border shadow-[1px_1px_0_0_black]"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            Anggota Baru (.26)
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="username" className="text-xs font-bold">
            Username Login
          </Label>
          {isUsernameEdited ? (
            <button
              type="button"
              onClick={handleResetUsername}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="size-3" />
              Reset otomatis
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              Otomatis
            </span>
          )}
        </div>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setCustomUsername(e.target.value)}
          required
          placeholder="nama@tazkiamengajar.id"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="initialPassword" className="text-xs font-bold">
            Password Sementara
          </Label>
          <button
            type="button"
            onClick={handleRegeneratePassword}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="size-3" />
            Acak Ulang
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            id="initialPassword"
            name="initialPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="font-mono font-bold"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCredentials}
            title="Salin Kredensial untuk dikirimkan"
            className="shrink-0 flex items-center gap-1.5 px-3 text-xs font-bold"
          >
            <Copy className="size-3.5" />
            Salin
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pengajar akan diminta mengganti password ini saat pertama kali login.
        </p>
      </div>
    </FormDialog>
  );
}

export function PengajarRowActions({
  pengajar,
}: {
  pengajar: {
    id: string;
    username: string;
    name: string;
    isActive: boolean;
    mustChangePassword: boolean;
  };
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [activeOpen, setActiveOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setResetOpen(true)}
        aria-label={`Reset password ${pengajar.name}`}
        title="Reset password sementara (wajib ubah di login berikutnya)"
      >
        <KeyRound className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveOpen(true)}
        aria-label={
          pengajar.isActive
            ? `Nonaktifkan ${pengajar.name}`
            : `Aktifkan ${pengajar.name}`
        }
      >
        {pengajar.isActive ? (
          <UserMinus className="size-4" />
        ) : (
          <UserPlus className="size-4" />
        )}
      </Button>

      {resetOpen ? (
        <ResetPengajarPasswordDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          pengajar={pengajar}
        />
      ) : null}

      {activeOpen ? (
        <ConfirmDialog
          open={activeOpen}
          onOpenChange={setActiveOpen}
          title={
            pengajar.isActive
              ? "Nonaktifkan akun pengajar?"
              : "Aktifkan akun pengajar?"
          }
          description={
            pengajar.isActive
              ? `${pengajar.name} tidak akan bisa masuk lagi sampai diaktifkan kembali.`
              : `${pengajar.name} akan bisa masuk kembali.`
          }
          confirmLabel={pengajar.isActive ? "Nonaktifkan" : "Aktifkan"}
          successMessage="Status pengajar diperbarui."
          destructive={pengajar.isActive}
          action={() => setUserActiveAction(pengajar.id, !pengajar.isActive)}
        />
      ) : null}
    </div>
  );
}

function ResetPengajarPasswordDialog({
  open,
  onOpenChange,
  pengajar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pengajar: {
    id: string;
    username: string;
    name: string;
  };
}) {
  const [tempPassword, setTempPassword] = useState(() =>
    generateTemporaryPassword(),
  );

  const handleCopyResetPassword = () => {
    const text = `Assalamu'alaikum ${pengajar.name},\nPassword akun Tazkia Mengajar kamu telah direset:\n\nUsername: ${pengajar.username}\nPassword Sementara Baru: ${tempPassword}\n\nSilakan login dan kamu akan diminta mengganti password baru.`;
    navigator.clipboard.writeText(text);
    toast.success("Password baru disalin ke clipboard!");
  };

  const handleRegenerateResetPassword = () => {
    const newPass = generateTemporaryPassword();
    setTempPassword(newPass);
    toast.info("Password baru telah diacak.");
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reset Password — ${pengajar.name}`}
      description="Set password sementara baru. Pengajar akan diwajibkan mengubah password ini saat login berikutnya."
      successMessage="Password berhasil direset."
      action={(_prev, formData) =>
        resetPengajarPasswordAction(pengajar.id, formData)
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="temporaryPassword" className="text-xs font-bold">
            Password Sementara Baru
          </Label>
          <button
            type="button"
            onClick={handleRegenerateResetPassword}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="size-3" />
            Acak Ulang
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            id="temporaryPassword"
            name="temporaryPassword"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            required
            className="font-mono font-bold"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyResetPassword}
            title="Salin Password Baru"
            className="shrink-0 flex items-center gap-1.5 px-3 text-xs font-bold"
          >
            <Copy className="size-3.5" />
            Salin
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Minimal 8 karakter. Pengajar wajib menggantinya saat login.
        </p>
      </div>
    </FormDialog>
  );
}

