"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { saveActivityMaterialsAction } from "@/server/actions/activities";
import { cn } from "@/lib/utils";

export interface MaterialChoice {
  id: string;
  title: string;
  meetingLabel: string | null;
  objective: string | null;
  curriculumName: string;
  periodName: string;
}

interface MaterialPickerProps {
  activityId: string;
  materials: MaterialChoice[];
  selectedIds: string[];
}

/** Step 4: links the curriculum material actually covered to this activity. */
export function MaterialPicker({
  activityId,
  materials,
  selectedIds,
}: MaterialPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedIds),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveActivityMaterialsAction(activityId, [
        ...selected,
      ]);
      if (result.ok) {
        toast.success("Materi tersimpan.");
      } else {
        setError(result.error);
      }
    });
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        title="Belum ada materi kurikulum."
        description="Tambahkan kurikulum, periode, dan materi terlebih dahulu agar bisa dikaitkan ke kegiatan."
      />
    );
  }

  // Grouped so the admin sees materials in their curriculum context rather than
  // as one flat list of titles.
  const grouped = new Map<string, MaterialChoice[]>();
  for (const material of materials) {
    const key = `${material.curriculumName} — ${material.periodName}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(material);
    } else {
      grouped.set(key, [material]);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {selected.size} materi dipilih. Langkah ini opsional.
      </p>

      <div className="space-y-4">
        {[...grouped.entries()].map(([group, items]) => (
          <div key={group}>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {group}
            </h3>
            <ul className="divide-y rounded-lg border">
              {items.map((material) => (
                <li key={material.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 p-3",
                      selected.has(material.id) && "bg-muted/30",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(material.id)}
                      onChange={() => toggle(material.id)}
                      className="border-input mt-0.5 size-4 shrink-0 rounded border"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {material.meetingLabel
                          ? `${material.meetingLabel} — `
                          : ""}
                        {material.title}
                      </span>
                      {material.objective ? (
                        <span className="text-muted-foreground block text-xs">
                          {material.objective}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

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
              Simpan Materi
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
