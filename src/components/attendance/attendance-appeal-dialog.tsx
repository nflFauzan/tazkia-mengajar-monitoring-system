"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, FileQuestion, HelpCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitAttendanceAppealAction } from "@/server/actions/appeals";

interface AttendanceAppealDialogProps {
  activityId: string;
  locationName: string;
  dateStr: string;
  appealStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  appealReason?: string | null;
  appealAdminNote?: string | null;
}

export function AttendanceAppealDialog({
  activityId,
  locationName,
  dateStr,
  appealStatus,
  appealReason,
  appealAdminNote,
}: AttendanceAppealDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [proposedAttendance, setProposedAttendance] = useState<"HADIR" | "IZIN" | "SAKIT">("HADIR");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already appealed, clicking the badge opens info dialog
  const isAppealed = Boolean(appealStatus);

  function handleSubmit() {
    if (!reason.trim()) {
      setErrorMessage("Mohon sertakan alasan pengajuan banding.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const result = await submitAttendanceAppealAction({
        activityId,
        proposedAttendance,
        reason: reason.trim(),
      });

      if (result.ok) {
        toast.success("Banding presensi berhasil diajukan ke admin!");
        setOpen(false);
        router.refresh();
      } else {
        setErrorMessage(result.error ?? "Gagal mengajukan banding.");
      }
    });
  }

  return (
    <>
      {isAppealed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center focus:outline-none"
        >
          {appealStatus === "PENDING" ? (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400 gap-1 text-[11px]"
            >
              <Clock className="size-3" />
              Banding Diproses
            </Badge>
          ) : appealStatus === "APPROVED" ? (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 gap-1 text-[11px]"
            >
              Banding Diterima
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400 gap-1 text-[11px]"
            >
              Banding Ditolak
            </Badge>
          )}
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setReason("");
            setErrorMessage(null);
            setOpen(true);
          }}
          className="h-7 text-xs border-dashed gap-1"
        >
          <HelpCircle className="size-3" />
          Ajukan Banding
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="size-5 text-primary" />
              {isAppealed ? "Detail Pengajuan Banding" : "Ajukan Banding Presensi"}
            </DialogTitle>
            <DialogDescription>
              Kegiatan di <strong>{locationName}</strong> ({dateStr})
            </DialogDescription>
          </DialogHeader>

          {isAppealed ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Status Banding:</span>
                  <Badge
                    variant={
                      appealStatus === "APPROVED"
                        ? "default"
                        : appealStatus === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {appealStatus === "PENDING"
                      ? "Menunggu Review Admin"
                      : appealStatus === "APPROVED"
                        ? "Disetujui"
                        : "Ditolak"}
                  </Badge>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs block">Alasan Pengajuan Anda:</span>
                  <p className="mt-1 text-xs font-medium">{appealReason || "—"}</p>
                </div>

                {appealAdminNote ? (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs block">Catatan Admin:</span>
                    <p className="mt-1 text-xs italic text-foreground">{appealAdminNote}</p>
                  </div>
                ) : null}
              </div>

              {appealStatus === "PENDING" ? (
                <p className="text-muted-foreground text-xs">
                  Pengajuan Anda sedang ditinjau oleh Admin. Setelah disetujui, catatan presensi Anda akan otomatis diperbarui.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {errorMessage ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="proposedAttendance">Status Sebenarnya</Label>
                <Select
                  value={proposedAttendance}
                  onValueChange={(val) =>
                    setProposedAttendance(val as "HADIR" | "IZIN" | "SAKIT")
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="proposedAttendance">
                    <SelectValue placeholder="Pilih status kehadiran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HADIR">Hadir (Terlambat Check-in / Kendala Sistem)</SelectItem>
                    <SelectItem value="IZIN">Izin (Ada keperluan penting)</SelectItem>
                    <SelectItem value="SAKIT">Sakit (Kondisi kesehatan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appealReason">
                  Alasan Banding <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="appealReason"
                  placeholder="Jelaskan alasan mengapa Anda tidak dapat melakukan presensi tepat waktu..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  disabled={isPending}
                />
                <p className="text-muted-foreground text-[11px]">
                  Banding akan diverifikasi oleh Admin. Harap berikan alasan yang jujur dan jelas.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {isAppealed ? "Tutup" : "Batal"}
            </Button>
            {!isAppealed ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Kirim Banding
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
