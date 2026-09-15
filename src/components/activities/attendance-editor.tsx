"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@prisma/client";

import { EmptyState } from "@/components/common/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/server/actions/types";
import { cn } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["HADIR", "IZIN", "SAKIT", "ALPA"];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

export interface AttendanceCandidate {
  id: string;
  name: string;
  /** Secondary line, e.g. the student's group or the member's role. */
  detail?: string;
}

export interface AttendanceEntry {
  id: string;
  attendance: AttendanceStatus;
  note: string;
}

interface AttendanceEditorProps {
  candidates: AttendanceCandidate[];
  initialEntries: AttendanceEntry[];
  emptyTitle: string;
  emptyDescription: string;
  /** Warning shown above the list, e.g. a beneficiary count mismatch. */
  warning?: string | null;
  onSave: (
    entries: Array<{
      id: string;
      attendance: AttendanceStatus;
      note?: string;
    }>,
  ) => Promise<ActionResult>;
}

/**
 * Selection plus per-person attendance, shared by the Tim and Murid steps.
 *
 * Both steps are the same interaction over different entities, so they share
 * one component rather than two near-identical ones. Only selected people are
 * submitted; unchecking someone removes their record on the next save.
 */
export function AttendanceEditor({
  candidates,
  initialEntries,
  emptyTitle,
  emptyDescription,
  warning,
  onSave,
}: AttendanceEditorProps) {
  const [entries, setEntries] = useState<Map<string, AttendanceEntry>>(
    () => new Map(initialEntries.map((entry) => [entry.id, entry])),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(candidateId: string) {
    setEntries((previous) => {
      const next = new Map(previous);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.set(candidateId, {
          id: candidateId,
          attendance: "HADIR",
          note: "",
        });
      }
      return next;
    });
  }

  function update(candidateId: string, patch: Partial<AttendanceEntry>) {
    setEntries((previous) => {
      const existing = previous.get(candidateId);
      if (!existing) return previous;

      const next = new Map(previous);
      next.set(candidateId, { ...existing, ...patch });
      return next;
    });
  }

  function selectAll() {
    setEntries((previous) => {
      const next = new Map(previous);
      for (const candidate of candidates) {
        if (!next.has(candidate.id)) {
          next.set(candidate.id, {
            id: candidate.id,
            attendance: "HADIR",
            note: "",
          });
        }
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);

    startTransition(async () => {
      const result = await onSave(
        [...entries.values()].map((entry) => ({
          id: entry.id,
          attendance: entry.attendance,
          note: entry.note.trim() || undefined,
        })),
      );

      if (result.ok) {
        toast.success("Absensi tersimpan.");
      } else {
        setError(result.error);
      }
    });
  }

  if (candidates.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {warning ? (
        <Alert>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {entries.size} dari {candidates.length} dipilih
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Pilih semua
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEntries(new Map())}
            disabled={entries.size === 0}
          >
            Kosongkan
          </Button>
        </div>
      </div>

      <ul className="divide-y rounded-lg border">
        {candidates.map((candidate) => {
          const entry = entries.get(candidate.id);
          const selected = Boolean(entry);

          return (
            <li
              key={candidate.id}
              className={cn("p-3", selected && "bg-muted/30")}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(candidate.id)}
                    className="border-input size-4 shrink-0 rounded border"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {candidate.name}
                    </span>
                    {candidate.detail ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {candidate.detail}
                      </span>
                    ) : null}
                  </span>
                </label>

                {selected && entry ? (
                  <div
                    role="radiogroup"
                    aria-label={`Kehadiran ${candidate.name}`}
                    className="flex shrink-0 gap-1"
                  >
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={entry.attendance === status}
                        onClick={() => update(candidate.id, { attendance: status })}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          entry.attendance === status
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selected && entry && entry.attendance !== "HADIR" ? (
                <Input
                  value={entry.note}
                  onChange={(event) =>
                    update(candidate.id, { note: event.target.value })
                  }
                  placeholder="Catatan (opsional)"
                  aria-label={`Catatan untuk ${candidate.name}`}
                  className="mt-2"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Simpan Absensi
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
