"use client";

import { useState, useTransition } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
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
  broadcastTodayScheduleRemindersAction,
} from "@/server/actions/notifications";
import type { ScheduleReminderResult } from "@/server/services/push-notification";

export function AdminScheduleReminderButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ScheduleReminderResult | null>(null);
  const [open, setOpen] = useState(false);

  const handleBroadcast = () => {
    startTransition(async () => {
      const res = await broadcastTodayScheduleRemindersAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      setResult(res.data);
      setOpen(true);

      if (res.data.totalDevicesNotified > 0) {
        toast.success(
          `Pengingat terkirim ke ${res.data.totalDevicesNotified} perangkat pengajar!`,
        );
      } else if (res.data.totalTargetTeachers === 0) {
        toast.info("Tidak ada jadwal mengajar aktif untuk hari ini.");
      } else {
        toast.warning(
          `Ada ${res.data.totalTargetTeachers} pengajar terjadwal hari ini, namun belum ada yang mengaktifkan notifikasi di HP mereka.`,
        );
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBroadcast}
        disabled={isPending}
        className="gap-2"
        title="Kirim pengingat Web Push ke semua pengajar yang bertugas hari ini"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : (
          <BellRing className="size-4 text-primary" />
        )}
        <span>Kirim Pengingat Hari Ini</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Laporan Pengiriman Pengingat
            </DialogTitle>
            <DialogDescription>
              Hasil pengiriman Web Push Notification untuk jadwal kegiatan hari ini.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border-2 border-border p-3 bg-muted/30">
                <div>
                  <p className="text-muted-foreground text-xs">Total Sesi Hari Ini</p>
                  <p className="font-heading text-lg font-bold">{result.totalSessionsToday}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pengajar Terjadwal</p>
                  <p className="font-heading text-lg font-bold">{result.totalTargetTeachers}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <p className="text-muted-foreground text-xs">Notifikasi Terkirim</p>
                  <p className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {result.totalDevicesNotified} Perangkat
                  </p>
                </div>
              </div>

              {result.details.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Daftar Pengajar:
                  </p>
                  {result.details.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded border border-border/60 p-2 text-xs bg-card"
                    >
                      <div>
                        <p className="font-semibold">{d.teacherName}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {d.locationName} · {d.startTime} WIB
                        </p>
                      </div>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          d.devicesNotified > 0
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {d.devicesNotified > 0
                          ? `${d.devicesNotified} perangkat`
                          : "Belum aktif"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-muted-foreground">
                  Tidak ada pengajar yang terjadwal untuk hari ini.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
