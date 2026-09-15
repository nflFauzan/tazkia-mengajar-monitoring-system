"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createActivityAction,
  updateActivityInfoAction,
} from "@/server/actions/activities";
import type { ActionResult } from "@/server/actions/types";

export interface LocationChoice {
  id: string;
  name: string;
  partner: string;
}

export interface ActivityInfoDefaults {
  id: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  partner: string;
  beneficiary: string;
  beneficiaryCount: number;
  aidType: string;
  notes: string | null;
}

interface ActivityInfoFormProps {
  locations: LocationChoice[];
  activity?: ActivityInfoDefaults;
}

/**
 * Step 1 of the wizard, reused for editing.
 *
 * On create the action returns the new id and this navigates into the wizard,
 * so the activity is a real DRAFT row from the very first save and nothing
 * afterwards is held only in browser memory.
 */
export function ActivityInfoForm({
  locations,
  activity,
}: ActivityInfoFormProps) {
  const router = useRouter();
  const isEdit = Boolean(activity);

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(isEdit ? updateActivityInfoAction : createActivityAction, null);

  useEffect(() => {
    if (!state?.ok) return;

    if (isEdit) {
      toast.success("Informasi kegiatan diperbarui.");
      router.refresh();
      return;
    }

    toast.success("Draft kegiatan dibuat.");
    router.push(`/kegiatan/${state.data.id}?step=tim`);
  }, [state, isEdit, router]);

  const errorMessage = state && !state.ok ? state.error : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Field name="locationId" label="Tempat" error={fieldErrors?.locationId} required>
        <select
          id="locationId"
          name="locationId"
          defaultValue={activity?.locationId ?? ""}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Pilih tempat</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="date" label="Tanggal" error={fieldErrors?.date} required>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={activity?.date}
          />
        </Field>
        <Field
          name="startTime"
          label="Waktu mulai"
          error={fieldErrors?.startTime}
          required
        >
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={activity?.startTime ?? "13:00"}
          />
        </Field>
        <Field
          name="endTime"
          label="Waktu selesai"
          error={fieldErrors?.endTime}
          required
        >
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={activity?.endTime ?? "14:30"}
          />
        </Field>
      </div>

      <Field name="partner" label="Mitra" error={fieldErrors?.partner} required>
        <Input
          id="partner"
          name="partner"
          defaultValue={activity?.partner}
          placeholder="Publik"
        />
      </Field>

      <Field
        name="beneficiary"
        label="Penerima manfaat"
        error={fieldErrors?.beneficiary}
        required
      >
        <Input
          id="beneficiary"
          name="beneficiary"
          defaultValue={activity?.beneficiary}
          placeholder="Anak-anak Desa Binaan Margajaya"
        />
      </Field>

      <Field
        name="beneficiaryCount"
        label="Jumlah penerima manfaat"
        error={fieldErrors?.beneficiaryCount}
        required
        hint="Angka ini yang dipakai pada laporan, baik daftar murid diisi maupun tidak."
      >
        <Input
          id="beneficiaryCount"
          name="beneficiaryCount"
          type="number"
          min={0}
          defaultValue={activity?.beneficiaryCount ?? 0}
        />
      </Field>

      <Field
        name="aidType"
        label="Jenis bantuan / kegiatan"
        error={fieldErrors?.aidType}
        required
      >
        <Input
          id="aidType"
          name="aidType"
          defaultValue={activity?.aidType}
          placeholder="Kegiatan belajar mengajar"
        />
      </Field>

      <Field name="notes" label="Catatan" error={fieldErrors?.notes}>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={activity?.notes ?? ""}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan...
            </>
          ) : isEdit ? (
            "Simpan Perubahan"
          ) : (
            "Simpan Draft & Lanjut"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  required,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
