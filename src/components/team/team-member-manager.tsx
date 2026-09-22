"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Copy,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  ActiveField,
  FormDialog,
  TextAreaField,
  TextField,
} from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generatePengajarUsername,
  generateTemporaryPassword,
} from "@/lib/auth/credentials-generator";
import {
  buildLoginCredentialsMessage,
  buildWhatsAppLink,
} from "@/lib/whatsapp";
import {
  CredentialSuccessDialog,
  type CredentialSuccessData,
} from "@/components/common/credential-success-dialog";
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
  const [createdData, setCreatedData] = useState<CredentialSuccessData | null>(
    null,
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Anggota
      </Button>
      {open ? (
        <TeamMemberFormDialog
          open={open}
          onOpenChange={setOpen}
          onSuccessCreated={(data) => setCreatedData(data)}
        />
      ) : null}
      <CredentialSuccessDialog
        open={Boolean(createdData)}
        onOpenChange={(next) => {
          if (!next) setCreatedData(null);
        }}
        data={createdData}
      />
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
          {member.phone ? (
            <DropdownMenuItem
              onClick={() => {
                window.open(
                  buildWhatsAppLink(member.phone, ""),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <MessageCircle className="size-4 text-emerald-600" />
              Chat WhatsApp
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen ? (
        <TeamMemberFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          member={member}
        />
      ) : null}

      {archiveOpen ? (
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
      ) : null}

      {deleteOpen ? (
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
      ) : null}
    </>
  );
}

function TeamMemberFormDialog({
  open,
  onOpenChange,
  member,
  onSuccessCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMemberRow;
  onSuccessCreated?: (data: CredentialSuccessData) => void;
}) {
  const isEdit = Boolean(member);

  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [nickname, setNickname] = useState(member?.nickname ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [createAccount, setCreateAccount] = useState(true);
  const [isFounder, setIsFounder] = useState(false);
  const [customUsername, setCustomUsername] = useState<string | null>(null);
  const [password, setPassword] = useState(() => generateTemporaryPassword());

  const autoUsername = generatePengajarUsername(fullName, nickname, {
    isFounder,
  });
  const username = customUsername ?? autoUsername;
  const isUsernameEdited = customUsername !== null;

  const handleCopyCredentials = () => {
    const text = buildLoginCredentialsMessage({
      fullName,
      nickname,
      username,
      temporaryPassword: password,
    });
    navigator.clipboard.writeText(text);
    toast.success("Kredensial login disalin ke clipboard!");
  };

  const handleSendWhatsApp = () => {
    const text = buildLoginCredentialsMessage({
      fullName,
      nickname,
      username,
      temporaryPassword: password,
    });
    const link = buildWhatsAppLink(phone, text);
    if (!phone.trim()) {
      toast.info(
        "Nomor kontak belum diisi. Anda dapat memilih kontak secara manual di WhatsApp.",
      );
    } else {
      toast.success("Membuka WhatsApp ke relawan pengajar...");
    }
    window.open(link, "_blank", "noopener,noreferrer");
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
      title={isEdit ? "Ubah Anggota Tim" : "Tambah Anggota Tim"}
      description="Pengajar, pembimbing, dan anggota tim dicatat sebagai satu daftar."
      successMessage={isEdit ? "Anggota diperbarui." : "Anggota ditambahkan."}
      onSuccess={() => {
        if (!isEdit && createAccount) {
          onSuccessCreated?.({
            name: fullName,
            nickname,
            username,
            password,
            phone,
            isReset: false,
          });
        }
      }}
      action={isEdit ? updateTeamMemberAction : createTeamMemberAction}
    >
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <TextField
        name="fullName"
        label="Nama lengkap"
        required
        defaultValue={member?.fullName}
        value={isEdit ? undefined : fullName}
        onChange={isEdit ? undefined : (e) => setFullName(e.target.value)}
      />
      <TextField
        name="nickname"
        label="Nama panggilan"
        defaultValue={member?.nickname}
        value={isEdit ? undefined : nickname}
        onChange={isEdit ? undefined : (e) => setNickname(e.target.value)}
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
        label="Nomor kontak / WhatsApp"
        defaultValue={member?.phone}
        value={isEdit ? undefined : phone}
        onChange={isEdit ? undefined : (e) => setPhone(e.target.value)}
        placeholder="08xxxxxxxxxx"
        hint="Gunakan nomor WhatsApp aktif untuk pengiriman kredensial akun."
      />
      <TextAreaField name="notes" label="Catatan" defaultValue={member?.notes} />
      <ActiveField defaultChecked={member?.isActive ?? true} />

      {!isEdit ? (
        <div className="rounded-lg border-2 border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createAccount"
              name="createAccount"
              checked={createAccount}
              onCheckedChange={(checked) => setCreateAccount(Boolean(checked))}
            />
            <Label
              htmlFor="createAccount"
              className="text-sm font-bold cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="size-4 text-primary" />
              Buatkan akun login pengajar langsung
            </Label>
          </div>

          {createAccount ? (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  Format Akun:
                </span>
                <div className="flex gap-1.5">
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
                  required={createAccount}
                  placeholder="nama.26@tazkiamengajar.id"
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="initialPassword"
                    name="initialPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={createAccount}
                    className="font-mono font-bold"
                  />
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCredentials}
                      title="Salin Kredensial untuk dikirimkan"
                      className="flex items-center gap-1.5 px-3 text-xs font-bold"
                    >
                      <Copy className="size-3.5" />
                      Salin
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendWhatsApp}
                      title="Kirim kredensial via WhatsApp"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-3 text-xs border-2 border-border shadow-[var(--shadow-brutal-sm)]"
                    >
                      <MessageCircle className="size-3.5" />
                      Kirim WA
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pengajar akan diminta mengganti password ini saat pertama kali login.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </FormDialog>
  );
}
