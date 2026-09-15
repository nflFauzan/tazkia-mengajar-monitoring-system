/**
 * The seven wizard steps from PRD section 34.
 *
 * Deliberately a plain module with no "use client": the activity page is a
 * server component and needs `isWizardStep` to validate the `?step=` parameter
 * before querying, which it cannot do if these live in a client module.
 */
export const WIZARD_STEPS = [
  { id: "informasi", label: "Informasi" },
  { id: "tim", label: "Tim" },
  { id: "murid", label: "Murid" },
  { id: "kurikulum", label: "Kurikulum" },
  { id: "dokumentasi", label: "Dokumentasi" },
  { id: "review", label: "Review" },
  { id: "laporan", label: "Laporan" },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];

export function isWizardStep(value: string | undefined): value is WizardStep {
  return WIZARD_STEPS.some((step) => step.id === value);
}
