"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  Save,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@prisma/client";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getStudentAttendanceListAction,
  savePengajarStudentAttendanceAction,
} from "@/server/actions/attendance-self";
import type {
  ActivityStudentsData,
  StudentAttendanceItem,
} from "@/server/services/attendance-self";

const STATUSES: AttendanceStatus[] = ["HADIR", "IZIN", "SAKIT", "ALPA"];

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; activeClass: string }
> = {
  HADIR: {
    label: "Hadir",
    activeClass: "bg-green-600 text-white border-green-700 hover:bg-green-700",
  },
  IZIN: {
    label: "Izin",
    activeClass: "bg-blue-600 text-white border-blue-700 hover:bg-blue-700",
  },
  SAKIT: {
    label: "Sakit",
    activeClass:
      "bg-amber-500 text-white border-amber-600 hover:bg-amber-600",
  },
  ALPA: {
    label: "Alpa",
    activeClass: "bg-red-600 text-white border-red-700 hover:bg-red-700",
  },
};

interface StudentAttendanceDialogProps {
  sessionKey: string;
  sessionTitle: string;
  locationName: string;
  dateStr: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  studentAttendanceCount?: number;
}

export function StudentAttendanceDialog({
  sessionKey,
  sessionTitle,
  locationName,
  dateStr,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  studentAttendanceCount = 0,
}: StudentAttendanceDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled
    ? (value: boolean) => controlledOnOpenChange?.(value)
    : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [data, setData] = useState<ActivityStudentsData | null>(null);
  const [entries, setEntries] = useState<
    Map<string, { attendance: AttendanceStatus; note: string }>
  >(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadData() {
    setIsLoading(true);
    setErrorMessage(null);

    getStudentAttendanceListAction(sessionKey).then((result) => {
      setIsLoading(false);

      if (result.ok) {
        setData(result.data);
        const initialMap = new Map<
          string,
          { attendance: AttendanceStatus; note: string }
        >();
        for (const s of result.data.students) {
          if (s.attendance) {
            initialMap.set(s.id, {
              attendance: s.attendance,
              note: s.note ?? "",
            });
          }
        }
        setEntries(initialMap);
      } else {
        setErrorMessage(result.error ?? "Gagal memuat data murid.");
      }
    });
  }

  function handleOpen() {
    setIsOpen(true);
    loadData();
  }

  function handleSetStatus(studentId: string, status: AttendanceStatus) {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      if (existing?.attendance === status) {
        // Toggle off if clicked again
        next.delete(studentId);
      } else {
        next.set(studentId, {
          attendance: status,
          note: existing?.note ?? "",
        });
      }
      return next;
    });
  }

  function handleSetNote(studentId: string, note: string) {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      if (existing) {
        next.set(studentId, { ...existing, note });
      }
      return next;
    });
  }

  function handleMarkAllHadir() {
    if (!data) return;
    setEntries((prev) => {
      const next = new Map(prev);
      for (const s of data.students) {
        const existing = next.get(s.id);
        next.set(s.id, {
          attendance: "HADIR",
          note: existing?.note ?? "",
        });
      }
      return next;
    });
  }

  function handleClearAll() {
    setEntries(new Map());
  }

  function handleSave() {
    if (!data) return;
    setErrorMessage(null);

    startTransition(async () => {
      const payload = Array.from(entries.entries()).map(([studentId, item]) => ({
        studentId,
        attendance: item.attendance,
        note: item.note.trim() || undefined,
      }));

      const result = await savePengajarStudentAttendanceAction(
        sessionKey,
        payload,
      );

      if (result.ok) {
        toast.success("Presensi murid berhasil disimpan!");
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorMessage(result.error ?? "Gagal menyimpan presensi murid.");
      }
    });
  }

  // Summary counts
  const totalStudents = data?.students.length ?? 0;
  let hadirCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alpaCount = 0;

  for (const item of entries.values()) {
    if (item.attendance === "HADIR") hadirCount++;
    else if (item.attendance === "IZIN") izinCount++;
    else if (item.attendance === "SAKIT") sakitCount++;
    else if (item.attendance === "ALPA") alpaCount++;
  }

    return (
    <>
      {trigger ? (
        <span
          onClick={handleOpen}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          variant={studentAttendanceCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={handleOpen}
          className="gap-1.5"
        >
          <UsersRound
            className={cn(
              "size-3.5",
              studentAttendanceCount > 0 && "text-emerald-600 dark:text-emerald-400",
            )}
          />
          <span>Presensi Murid</span>
          {studentAttendanceCount > 0 ? (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              {studentAttendanceCount}
            </Badge>
          ) : null}
        </Button>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) loadData();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-2 border-border shadow-[var(--shadow-brutal-lg)]">
        <DialogHeader className="p-5 pb-3 border-b-2 border-border bg-card">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="font-heading text-lg tracking-tight">
              Presensi Murid
            </DialogTitle>
            <Badge variant="outline" className="text-xs font-semibold gap-1">
              <MapPin className="size-3 text-primary" />
              {locationName}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {sessionTitle} · Tanggal {dateStr}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Location Isolation Notice */}
          <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-3 text-xs flex items-start gap-2.5">
            <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                Lokasi: <span className="font-bold">{locationName}</span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                Hanya murid yang terdaftar di lokasi ini yang ditampilkan. Data
                murid antar tempat mengajar terpisah dan tidak bercampur.
              </p>
            </div>
          </div>

          {/* Sync Status Notice */}
          {data && data.students.some((s) => s.attendance !== null) ? (
            <div className="rounded-md border-2 border-emerald-500/30 bg-emerald-500/10 p-3 text-xs flex items-start gap-2.5">
              <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Presensi Murid Sudah Tercatat ({data.students.filter((s) => s.attendance !== null).length} murid)
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 mt-0.5 text-[11px]">
                  Data presensi tersimpan secara otomatis dan tersinkronisasi antar sesama pengajar di lokasi ini. Pengajar lain tidak perlu mengulang input, namun tetap dapat memperbarui status murid jika diperlukan.
                </p>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Memuat data murid di {locationName}...
              </p>
            </div>
          ) : !data || data.students.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-2">
              <UsersRound className="size-8 text-muted-foreground/60 mx-auto" />
              <p className="font-medium text-sm">
                Belum ada murid di tempat ini.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Silakan hubungi Admin untuk mendaftarkan kelompok dan murid di
                lokasi {locationName}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick Actions & Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-3 rounded-lg border-2 border-border/40">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Total: {totalStudents}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                  >
                    Hadir: {hadirCount}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                  >
                    Izin: {izinCount}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  >
                    Sakit: {sakitCount}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                  >
                    Alpa: {alpaCount}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllHadir}
                    className="h-7 text-xs gap-1"
                  >
                    <Check className="size-3" />
                    Semua Hadir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={entries.size === 0}
                    className="h-7 text-xs"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              {/* Students List */}
              <ul className="divide-y-2 divide-border/20 border-2 border-border rounded-lg shadow-[var(--shadow-brutal-sm)] overflow-hidden bg-card">
                {data.students.map((student: StudentAttendanceItem) => {
                  const entry = entries.get(student.id);
                  const selectedStatus = entry?.attendance;

                  return (
                    <li
                      key={student.id}
                      className={cn(
                        "p-3 transition-colors",
                        selectedStatus ? "bg-muted/20" : "",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {student.fullName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {student.groupName}
                          </p>
                        </div>

                        <div
                          role="radiogroup"
                          aria-label={`Status kehadiran ${student.fullName}`}
                          className="flex shrink-0 gap-1"
                        >
                          {STATUSES.map((status) => {
                            const active = selectedStatus === status;
                            const config = STATUS_CONFIG[status];

                            return (
                              <button
                                key={status}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() =>
                                  handleSetStatus(student.id, status)
                                }
                                className={cn(
                                  "rounded-md border-2 px-2.5 py-1 text-xs font-bold transition-all",
                                  active
                                    ? config.activeClass
                                    : "border-border/40 bg-background text-foreground/80 hover:bg-muted hover:border-border",
                                )}
                              >
                                {config.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Note input for non-HADIR attendance */}
                      {selectedStatus && selectedStatus !== "HADIR" ? (
                        <div className="mt-2.5 pl-0.5">
                          <Input
                            value={entry?.note ?? ""}
                            onChange={(e) =>
                              handleSetNote(student.id, e.target.value)
                            }
                            placeholder={`Catatan untuk ${student.fullName} (${STATUS_CONFIG[selectedStatus].label}, misal: sakit demam / acara keluarga)...`}
                            aria-label={`Catatan untuk ${student.fullName}`}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t-2 border-border bg-card flex flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {entries.size} dari {totalStudents} murid dicatat
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isLoading || totalStudents === 0}
              className="gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Simpan Presensi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
