"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  generateReportAction,
  updateNarrativeAction,
} from "@/server/actions/activities";
import type { ReportChecklistItem } from "@/lib/reports";

interface ReportPanelProps {
  activityId: string;
  /** Stored report, if one has been generated. */
  report: { content: string; narrative: string; narrativeEdited: boolean } | null;
  checklist: ReportChecklistItem[];
  isComplete: boolean;
}

/**
 * Step 7. Shows the required-data checklist, the generated report, and the
 * narrative editor.
 *
 * Final generation stays disabled until the checklist is clean (PRD section
 * 20), and the narrative is only ever replaced by the explicit regenerate
 * action, never as a side effect of rebuilding the report body.
 */
export function ReportPanel({
  activityId,
  report,
  checklist,
  isComplete,
}: ReportPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [narrative, setNarrative] = useState(report?.narrative ?? "");
  const [editingNarrative, setEditingNarrative] = useState(false);

  function runAction(
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        setError(result.error ?? "Terjadi kesalahan.");
      }
    });
  }

  async function copyReport() {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report.content);
      setCopied(true);
      toast.success("Laporan berhasil disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access needs a secure context and can be blocked outright, so
      // failure is reported rather than silently doing nothing.
      setError(
        "Browser menolak akses clipboard. Salin manual dari kotak laporan.",
      );
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-medium">Kelengkapan data</h3>
        <ul className="grid gap-1.5 rounded-lg border p-3 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={
                  item.satisfied ? "text-green-600" : "text-destructive"
                }
              >
                {item.satisfied ? "✓" : "✗"}
              </span>
              <span
                className={item.satisfied ? "" : "text-muted-foreground"}
              >
                {item.label}
              </span>
              <span className="sr-only">
                {item.satisfied ? "sudah lengkap" : "belum lengkap"}
              </span>
            </li>
          ))}
        </ul>
        {isComplete ? null : (
          <p className="text-muted-foreground mt-2 text-sm">
            Laporan final bisa dibuat setelah seluruh data wajib terisi. Draft
            tetap tersimpan.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!isComplete || isPending}
          onClick={() =>
            runAction(
              () => generateReportAction(activityId),
              report ? "Laporan diperbarui." : "Laporan dibuat.",
            )
          }
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {report ? "Perbarui Laporan" : "Generate Laporan"}
        </Button>

        {report ? (
          <>
            <Button variant="outline" onClick={copyReport} disabled={isPending}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              Salin Laporan
            </Button>

            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () =>
                    generateReportAction(activityId, {
                      regenerateNarrative: true,
                    }),
                  "Narasi dibuat ulang.",
                )
              }
            >
              <RefreshCw className="size-4" />
              Buat Ulang Narasi
            </Button>
          </>
        ) : null}
      </div>

      {report ? (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                Narasi
                {report.narrativeEdited ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    (sudah diedit manual)
                  </span>
                ) : (
                  <span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-xs font-normal">
                    <Sparkles className="size-3" />
                    dibuat otomatis
                  </span>
                )}
              </h3>
              {editingNarrative ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNarrative(report.narrative);
                    setEditingNarrative(true);
                  }}
                >
                  Edit narasi
                </Button>
              )}
            </div>

            {editingNarrative ? (
              <div className="space-y-2">
                <Textarea
                  value={narrative}
                  onChange={(event) => setNarrative(event.target.value)}
                  rows={10}
                  aria-label="Narasi laporan"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setEditingNarrative(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        const result = await updateNarrativeAction(
                          activityId,
                          narrative,
                        );
                        if (result.ok) setEditingNarrative(false);
                        return result;
                      }, "Narasi tersimpan.")
                    }
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : null}
                    Simpan Narasi
                  </Button>
                </div>
              </div>
            ) : (
              <p className="bg-muted/40 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {report.narrative}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">Pratinjau laporan</h3>
            {/*
              Rendered as pre-wrapped text, not markdown: the asterisks are
              WhatsApp bold markers and the blank lines are part of the format,
              so what is shown here is exactly what gets copied.
            */}
            <pre className="bg-muted/40 overflow-x-auto rounded-lg border p-4 font-sans text-sm whitespace-pre-wrap">
              {report.content}
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}
