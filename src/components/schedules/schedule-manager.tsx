"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAY_NAMES } from "@/lib/dates";
import {
  deleteScheduleAction,
  saveScheduleAction,
  setScheduleActiveAction,
} from "@/server/actions/schedules";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

export interface ScheduleRow {
  id: string;
  locationId: string;
  title: string;
  recurrence: "WEEKLY" | "CUSTOM";
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
  isActive: boolean;
  teamMemberIds: string[];
  studentGroupIds: string[];
}

interface Options {
  locations: Option[];
  teamMembers: Option[];
  studentGroups: Option[];
}

export function AddScheduleButton({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);

  if (options.locations.length === 0) {
    return (
      <Button disabled title="Buat tempat terlebih dahulu.">
        <Plus className="size-4" />
        Tambah Jadwal
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Jadwal
      </Button>
      <ScheduleDialog open={open} onOpenChange={setOpen} options={options} />
    </>
  );
}

export function ScheduleRowActions({
  schedule,
  options,
}: {
  schedule: ScheduleRow;
  options: Options;
}) {
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
            {schedule.isActive ? (
              <>
                <Archive className="size-4" />
                Nonaktifkan
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Aktifkan
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ScheduleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        options={options}
        schedule={schedule}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={schedule.isActive ? "Nonaktifkan jadwal?" : "Aktifkan jadwal?"}
        description={
          schedule.isActive
            ? `"${schedule.title}" tidak lagi muncul di kalender, tetapi datanya tetap tersimpan.`
            : `"${schedule.title}" akan muncul kembali di kalender.`
        }
        confirmLabel={schedule.isActive ? "Nonaktifkan" : "Aktifkan"}
        successMessage="Status jadwal diperbarui."
        action={() => setScheduleActiveAction(schedule.id, !schedule.isActive)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus jadwal?"
        description={`"${schedule.title}" akan dihapus permanen. Kegiatan yang pernah mengacu ke jadwal ini tetap tersimpan.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Jadwal dihapus."
        destructive
        action={() => deleteScheduleAction(schedule.id)}
      />
    </>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  options,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Options;
  schedule?: ScheduleRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState(() => ({
    locationId: schedule?.locationId ?? options.locations[0]?.value ?? "",
    title: schedule?.title ?? "",
    recurrence: schedule?.recurrence ?? ("WEEKLY" as const),
    daysOfWeek: schedule?.daysOfWeek ?? [6],
    startDate: schedule?.startDate ?? "",
    endDate: schedule?.endDate ?? "",
    startTime: schedule?.startTime ?? "13:00",
    endTime: schedule?.endTime ?? "14:30",
    notes: schedule?.notes ?? "",
    teamMemberIds: schedule?.teamMemberIds ?? [],
    studentGroupIds: schedule?.studentGroupIds ?? [],
    isActive: schedule?.isActive ?? true,
  }));

  function toggleDay(day: number) {
    setForm((previous) => ({
      ...previous,
      daysOfWeek: previous.daysOfWeek.includes(day)
        ? previous.daysOfWeek.filter((entry) => entry !== day)
        : [...previous.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  function toggleId(key: "teamMemberIds" | "studentGroupIds", id: string) {
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(id)
        ? previous[key].filter((entry) => entry !== id)
        : [...previous[key], id],
    }));
  }

  function handleSubmit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await saveScheduleAction({
        id: schedule?.id,
        ...form,
        endDate: form.endDate || undefined,
        notes: form.notes || undefined,
      });

      if (result.ok) {
        toast.success(schedule ? "Jadwal diperbarui." : "Jadwal ditambahkan.");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Ubah Jadwal" : "Tambah Jadwal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">
              Nama jadwal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Kelas Anak — Sabtu Siang"
            />
            {fieldErrors.title ? (
              <p className="text-destructive text-sm">{fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationId">
              Tempat <span className="text-destructive">*</span>
            </Label>
            <select
              id="locationId"
              value={form.locationId}
              onChange={(event) =>
                setForm({ ...form, locationId: event.target.value })
              }
              className="border-input bg-card h-9 w-full rounded-md border-2 px-3 text-sm font-medium shadow-[var(--shadow-brutal-sm)]"
            >
              {options.locations.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Pengulangan</legend>
            <div className="flex gap-2">
              {(["WEEKLY", "CUSTOM"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, recurrence: value })}
                  aria-pressed={form.recurrence === value}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    form.recurrence === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {value === "WEEKLY" ? "Mingguan" : "Sekali (custom)"}
                </button>
              ))}
            </div>
          </fieldset>

          {form.recurrence === "WEEKLY" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Hari <span className="text-destructive">*</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((name, day) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={form.daysOfWeek.includes(day)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      form.daysOfWeek.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {fieldErrors.daysOfWeek ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.daysOfWeek}
                </p>
              ) : null}
            </fieldset>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Tanggal mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
              />
              {fieldErrors.startDate ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.startDate}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal berakhir</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm({ ...form, endDate: event.target.value })
                }
              />
              {fieldErrors.endDate ? (
                <p className="text-destructive text-sm">{fieldErrors.endDate}</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Kosongkan jika berjalan terus.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Waktu mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm({ ...form, startTime: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">
                Waktu selesai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm({ ...form, endTime: event.target.value })
                }
              />
              {fieldErrors.endTime ? (
                <p className="text-destructive text-sm">{fieldErrors.endTime}</p>
              ) : null}
            </div>
          </div>

          <CheckboxGroup
            label="Tim yang bertugas"
            options={options.teamMembers}
            selected={form.teamMemberIds}
            onToggle={(id) => toggleId("teamMemberIds", id)}
          />

          <CheckboxGroup
            label="Kelompok murid"
            options={options.studentGroups}
            selected={form.studentGroupIds}
            onToggle={(id) => toggleId("studentGroupIds", id)}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
              className="border-input size-4 rounded-sm border-2 accent-[var(--brand)]"
            />
            Aktif
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button disabled={isPending} onClick={handleSubmit}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {label}{" "}
        <span className="text-muted-foreground font-normal">
          ({selected.length} dipilih)
        </span>
      </legend>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="border-input size-4 rounded-sm border-2 accent-[var(--brand)]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
