"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, HardDrive, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGoogleDriveTokenAction } from "@/server/actions/settings";

interface GoogleDriveCardProps {
  status: {
    isConfigured: boolean;
    source: "database" | "env" | "none";
    folderId: string | null;
    updatedAt: Date | null;
  };
}

export function GoogleDriveCard({ status }: GoogleDriveCardProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error("Masukkan token terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("refreshToken", tokenInput.trim());

      const res = await updateGoogleDriveTokenAction(null, formData);
      if (res.ok) {
        toast.success("Token Google Drive berhasil disimpan dan diverifikasi!");
        setTokenInput("");
        setShowInput(false);
      } else {
        toast.error(res.error || "Gagal menyimpan token.");
      }
    });
  };

  return (
    <div className="rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="text-primary size-5" />
            <h3 className="font-heading text-base font-semibold">
              Google Drive (Penyimpanan Dokumentasi)
            </h3>
            {status.isConfigured ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="mr-1 size-3" />
                Terhubung
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                Perlu Token
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Foto dan video kegiatan otomatis dibuatkan subfolder dan disimpan langsung ke Google Drive.
          </p>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
            <span>
              Penyimpanan token:{" "}
              <strong className="text-foreground">
                {status.source === "database"
                  ? "Database (Otomatis)"
                  : status.source === "env"
                  ? "Environment Variable"
                  : "Belum disetel"}
              </strong>
            </span>
            {status.updatedAt && (
              <span>
                Terakhir update:{" "}
                <strong className="text-foreground">
                  {new Date(status.updatedAt).toLocaleString("id-ID")}
                </strong>
              </span>
            )}
          </div>
        </div>

        <div>
          <Button
            variant={showInput ? "outline" : "default"}
            size="sm"
            onClick={() => setShowInput((prev) => !prev)}
          >
            <KeyRound className="mr-1.5 size-4" />
            {showInput ? "Tutup" : "Perbarui Token"}
          </Button>
        </div>
      </div>

      {showInput && (
        <form onSubmit={handleSubmit} className="mt-4 border-t pt-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="refreshToken" className="text-xs font-medium">
                Refresh Token Google Drive
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="refreshToken"
                  placeholder="Tempel Refresh Token baru di sini (1//...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-xs"
                  disabled={isPending}
                />
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 size-4" />
                      Simpan & Verifikasi
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Token langsung disimpan ke database aplikasi dan otomatis aktif di web Vercel tanpa perlu redeploy atau menyuruh admin Vercel.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
