"use client";

import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildLoginCredentialsMessage,
  buildPasswordResetMessage,
  buildWhatsAppLink,
} from "@/lib/whatsapp";

export interface CredentialSuccessData {
  name: string;
  nickname?: string | null;
  username: string;
  password?: string;
  phone?: string | null;
  isReset?: boolean;
}

export function CredentialSuccessDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CredentialSuccessData | null;
}) {
  if (!data) return null;

  const getMessage = () => {
    if (data.isReset) {
      return buildPasswordResetMessage({
        fullName: data.name,
        nickname: data.nickname,
        username: data.username,
        temporaryPassword: data.password || "",
      });
    }
    return buildLoginCredentialsMessage({
      fullName: data.name,
      nickname: data.nickname,
      username: data.username,
      temporaryPassword: data.password,
    });
  };

  const handleCopy = () => {
    const text = getMessage();
    navigator.clipboard.writeText(text);
    toast.success("Kredensial login disalin ke clipboard!");
  };

  const handleSendWhatsApp = () => {
    const text = getMessage();
    const link = buildWhatsAppLink(data.phone, text);
    if (!data.phone?.trim()) {
      toast.info(
        "Nomor kontak pengajar belum terdaftar. Anda dapat memilih kontak secara manual di WhatsApp.",
      );
    } else {
      toast.success("Membuka WhatsApp ke pengajar...");
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border sm:max-w-md border-2 shadow-[var(--shadow-brutal)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            {data.isReset
              ? "Password Berhasil Direset!"
              : "Akun Pengajar Berhasil Dibuat!"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {data.isReset
              ? "Password sementara baru telah aktif. Kirimkan segera ke WhatsApp pengajar."
              : "Akun login telah aktif. Kirimkan detail akun langsung ke WhatsApp pengajar."}
          </DialogDescription>
        </DialogHeader>

        <div className="border-border bg-muted/30 space-y-2 rounded-lg border-2 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Nama:</span>
            <span className="font-bold">{data.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">
              WhatsApp:
            </span>
            <span className="font-mono font-bold">
              {data.phone?.trim() ? data.phone : "Belum diisi"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">
              Username:
            </span>
            <span className="text-primary font-mono font-bold">
              {data.username}
            </span>
          </div>
          {data.password ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">
                Password Sementara:
              </span>
              <span className="border-border bg-background rounded border px-2 py-0.5 font-mono font-bold">
                {data.password}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground text-[11px] font-bold">
            Pratinjau Pesan yang Dikirimkan:
          </span>
          <div className="border-border/80 bg-muted/20 max-h-36 overflow-y-auto whitespace-pre-wrap rounded border p-2.5 font-mono text-[11px] leading-relaxed select-all">
            {getMessage()}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Copy className="size-3.5" />
            Salin Pesan
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSendWhatsApp}
            className="border-border shadow-[var(--shadow-brutal-sm)] flex items-center gap-1.5 border-2 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="size-3.5" />
            Kirim via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
