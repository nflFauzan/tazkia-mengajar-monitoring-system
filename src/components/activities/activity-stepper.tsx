"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { WIZARD_STEPS, type WizardStep } from "@/lib/wizard-steps";
import { cn } from "@/lib/utils";

/**
 * Renders the wizard steps. The step definitions themselves live in
 * lib/wizard-steps so the server page can validate `?step=` without importing
 * a client module.
 *
 * Steps are links rather than a forced sequence: the activity already exists as
 * a draft, so an admin who only needs to fix the documentation should not have
 * to walk through six screens to reach it. `completed` marks steps that have
 * data, which is what makes the row useful as a progress indicator.
 */
export function ActivityStepper({
  activityId,
  current,
  completed,
}: {
  activityId: string;
  current: WizardStep;
  completed: Partial<Record<WizardStep, boolean>>;
}) {
  return (
    <nav aria-label="Langkah kegiatan" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = completed[step.id] ?? false;

          return (
            <li key={step.id} className="flex items-center">
              {index > 0 ? (
                <span aria-hidden className="bg-border mx-1 h-px w-4" />
              ) : null}
              <Link
                href={`/kegiatan/${activityId}?step=${step.id}`}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isCurrent
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                    isDone &&
                      "bg-primary text-primary-foreground border-primary",
                  )}
                >
                  {isDone ? <Check className="size-3" /> : index + 1}
                </span>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
