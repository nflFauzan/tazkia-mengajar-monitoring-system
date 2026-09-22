"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, X } from "lucide-react";
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
import { formatTanggalSingkat } from "@/lib/dates";
import { reviewAttendanceAppealAction } from "@/server/actions/appeals";
import type { AttendanceAppealItem } from "@/server/services/appeals";

interface AdminAppealsCardProps {
  appeals: AttendanceAppealItem[];
}

export function AdminAppealsCard({ appeals }: AdminAppealsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectDialogItem, setRejectDialogItem] = useState<AttendanceAppealItem | null>(null);
  const [adminNote, setAdminNote] = useState("");

  if (appeals.length === 0) {
    return null;
  }

  function handleApprove(appeal: AttendanceAppealItem) {
    startTransition(async () => {
      const result = await reviewAttendanceAppealAction({
        appealId: appeal.id,
        approved: true,
      });

      if (result.ok) {
        toast.success(`Banding ${appeal.teamMemberName} telah disetujui.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menyetujui banding.");
      }
    });
  }

  function handleRejectSubmit() {
    if (!rejectDialogItem) return;

    startTransition(async () => {
      const result = await reviewAttendanceAppealAction({
        appealId: rejectDialogItem.id,
        approved: false,
        adminNote: adminNote.trim() || undefined,
      });

      if (result.ok) {
        toast.success(`Banding ${rejectDialogItem.teamMemberName} ditolak.`);
        setRejectDialogItem(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menolak banding.");
      }
    });
  }

  return (
    <>
      <div className="border-amber-500/40 bg-amber-500/5 rounded-lg border-2 p-5 shadow-[var(--shadow-brutal)]">
        <div className="flex items-center justify-between gap-2 border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-heading text-base tracking-tight text-foreground">
              Pengajuan Banding Presensi
            </h3>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
              {appeals.length} menunggu
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Tinjau pengajar yang terlewat presensi/alpa
          </span>
        </div>

        <div className="divide-y divide-border">
          {appeals.map((appeal) => (
            <div key={appeal.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{appeal.teamMemberName}</span>
                  <Badge variant="outline" className="text-xs">
                    {appeal.locationName} &bull; {formatTanggalSingkat(appeal.activityDate)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">&rarr; Diajukan:</span>
                  <Badge
                    className={
                      appeal.proposedAttendance === "HADIR"
                        ? "bg-green-600 text-white"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }
                  >
                    {appeal.proposedAttendance}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground italic bg-background/60 p-2 rounded border">
                  &ldquo;{appeal.reason}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setRejectDialogItem(appeal);
                    setAdminNote("");
                  }}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                >
                  <X className="size-3.5" />
                  Tolak
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleApprove(appeal)}
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Setujui
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={Boolean(rejectDialogItem)}
        onOpenChange={(open) => {
          if (!open) setRejectDialogItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Banding Presensi</DialogTitle>
            <DialogDescription>
              {rejectDialogItem ? (
                <>
                  Tolak pengajuan dari <strong>{rejectDialogItem.teamMemberName}</strong> untuk kegiatan di{" "}
                  <strong>{rejectDialogItem.locationName}</strong>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rejectAdminNote">
                Catatan Penolakan <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Textarea
                id="rejectAdminNote"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Berikan alasan penolakan agar pengajar memahami keputusannya..."
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRejectDialogItem(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleRejectSubmit}
              className="gap-1.5"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
