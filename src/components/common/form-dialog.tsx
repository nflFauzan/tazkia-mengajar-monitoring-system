"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/actions/types";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  successMessage: string;
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  /** Rendered inside the form; use the Field helpers below. */
  children: ReactNode;
}

/**
 * Wraps a Server Action in a dialog, owning the parts every form needs:
 * pending state, a disabled submit button so a double click cannot create two
 * rows, the error banner, the success toast, and closing on success.
 *
 * Field-level errors come back from the action and are read out of the form
 * state by the Field components, which is why they share this context through
 * a hidden input convention rather than prop drilling.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Simpan",
  successMessage,
  action,
  children,
}: FormDialogProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(successMessage);
      onOpenChange(false);
      formRef.current?.reset();
    }
  }, [state, successMessage, onOpenChange]);

  const errorMessage = state && !state.ok ? state.error : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4" noValidate>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <FieldErrorContext value={fieldErrors}>{children}</FieldErrorContext>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

const FieldErrors = createContext<Record<string, string> | undefined>(undefined);

function FieldErrorContext({
  value,
  children,
}: {
  value: Record<string, string> | undefined;
  children: ReactNode;
}) {
  return <FieldErrors value={value}>{children}</FieldErrors>;
}

function useFieldError(name: string) {
  return useContext(FieldErrors)?.[name];
}

interface FieldProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  hint?: string;
}

export function TextField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  hint,
}: FieldProps) {
  const error = useFieldError(name);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value === undefined ? (defaultValue ?? "") : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  rows = 3,
}: FieldProps & { rows?: number }) {
  const error = useFieldError(name);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error ? (
        <p id={`${name}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  required,
  options,
  placeholder,
}: FieldProps & { options: Array<{ value: string; label: string }> }) {
  const error = useFieldError(name);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {/*
        A plain <select> rather than the shadcn Select: this form posts real
        FormData to a Server Action, and a native control participates in that
        without needing a hidden input mirror.
      */}
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="border-input bg-card aria-invalid:border-destructive h-9 w-full rounded-md border-2 px-3 text-sm font-medium shadow-[var(--shadow-brutal-sm)] focus-visible:outline-none"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${name}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ActiveField({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {/*
        The hidden input guarantees the key is present when the checkbox is
        unchecked; browsers omit unchecked boxes from FormData entirely, which
        would otherwise read as "field missing" rather than "false".
      */}
      <input type="hidden" name="isActive" value="false" />
      <input
        id="isActive"
        name="isActive"
        type="checkbox"
        value="true"
        defaultChecked={defaultChecked}
        className="border-input size-4 rounded-sm border-2 accent-[var(--brand)]"
      />
      <Label htmlFor="isActive" className="font-normal">
        Aktif
      </Label>
    </div>
  );
}
