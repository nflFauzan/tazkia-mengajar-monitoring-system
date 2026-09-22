"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Loader2, LogOut } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstTimeChangePasswordAction, logoutAction } from "@/server/actions/auth";

export function FirstTimePasswordForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    firstTimeChangePasswordAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    router.replace("/dashboard");
    router.refresh();
  }, [state, router]);

  const errorMessage = state && !state.ok ? state.error : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Password Sementara (Saat Ini)</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            disabled={isPending}
            placeholder="Masukkan password dari admin"
            aria-invalid={Boolean(fieldErrors?.currentPassword)}
            aria-describedby={
              fieldErrors?.currentPassword ? "currentPassword-error" : undefined
            }
          />
          {fieldErrors?.currentPassword ? (
            <p id="currentPassword-error" className="text-destructive text-xs font-medium">
              {fieldErrors.currentPassword}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Password Baru</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending}
            placeholder="Minimal 8 karakter"
            aria-invalid={Boolean(fieldErrors?.newPassword)}
            aria-describedby={
              fieldErrors?.newPassword ? "newPassword-error" : undefined
            }
          />
          {fieldErrors?.newPassword ? (
            <p id="newPassword-error" className="text-destructive text-xs font-medium">
              {fieldErrors.newPassword}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            disabled={isPending}
            placeholder="Ulangi password baru"
            aria-invalid={Boolean(fieldErrors?.confirmPassword)}
            aria-describedby={
              fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined
            }
          />
          {fieldErrors?.confirmPassword ? (
            <p
              id="confirmPassword-error"
              className="text-destructive text-xs font-medium"
            >
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan Password...
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              Simpan Password &amp; Lanjutkan
            </>
          )}
        </Button>
      </form>

      <div className="border-t pt-3 text-center">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <LogOut className="size-3.5" />
            Batal &amp; Keluar
          </Button>
        </form>
      </div>
    </div>
  );
}
