"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MoreHorizontal, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { ActivityStatus } from "@prisma/client";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  completeActivityAction,
  deleteActivityAction,
  setActivityStatusAction,
} from "@/server/actions/activities";

/**
 * Status transitions for an activity.
 *
 * Completing is gated server-side on the report checklist, so the button is
 * offered freely and the failure explains exactly what is missing rather than
 * the UI trying to predict it.
 */
export function ActivityActions({
  activityId,
  status,
}: {
  activityId: string;
  status: ActivityStatus;
}) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {status === "DRAFT" ? (
        <Button onClick={() => setCompleteOpen(true)}>
          <CheckCircle2 className="size-4" />
          Selesaikan
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Aksi kegiatan">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {status !== "DRAFT" ? (
            <DropdownMenuItem onClick={() => setReopenOpen(true)}>
              <RotateCcw className="size-4" />
              Kembalikan ke Draft
            </DropdownMenuItem>
          ) : null}
          {status !== "CANCELLED" ? (
            <DropdownMenuItem onClick={() => setCancelOpen(true)}>
              <XCircle className="size-4" />
              Batalkan
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

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Selesaikan kegiatan?"
        description="Kegiatan akan ditandai selesai dan ikut dihitung pada statistik serta rekap. Data wajib harus sudah lengkap."
        confirmLabel="Selesaikan"
        successMessage="Kegiatan ditandai selesai."
        action={() => completeActivityAction(activityId)}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Batalkan kegiatan?"
        description="Kegiatan yang dibatalkan tidak dihitung pada statistik, tetapi datanya tetap tersimpan."
        confirmLabel="Batalkan"
        successMessage="Kegiatan dibatalkan."
        action={() => setActivityStatusAction(activityId, "CANCELLED")}
      />

      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Kembalikan ke draft?"
        description="Kegiatan bisa diubah kembali dan tidak lagi dihitung sebagai selesai."
        confirmLabel="Kembalikan"
        successMessage="Kegiatan dikembalikan ke draft."
        action={() => setActivityStatusAction(activityId, "DRAFT")}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus kegiatan?"
        description="Seluruh absensi, materi, dokumentasi, dan laporan kegiatan ini akan ikut terhapus permanen."
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Kegiatan dihapus."
        destructive
        action={async () => {
          const result = await deleteActivityAction(activityId);
          if (result.ok) router.push("/kegiatan");
          return result;
        }}
      />
    </>
  );
}
