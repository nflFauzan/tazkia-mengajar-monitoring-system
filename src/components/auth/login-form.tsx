"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, null);

  /**
   * The action sets the session cookie and returns, rather than redirecting
   * itself: `redirect()` signals by throwing, which the action's own try/catch
   * would swallow and report as an unexpected error.
   *
   * `next` is read from the query string but only ever used as a path — the
   * proxy writes just a pathname there, and refusing anything that does not
   * start with a single "/" keeps a crafted link from turning login into an
   * open redirect.
   */
  useEffect(() => {
    if (!state?.ok) return;

    const requested = searchParams.get("next");
    const safeNext =
      requested && requested.startsWith("/") && !requested.startsWith("//")
        ? requested
        : "/dashboard";

    router.replace(safeNext);
    router.refresh();
  }, [state, router, searchParams]);

  const errorMessage = state && !state.ok ? state.error : null;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors?.username)}
          aria-describedby={fieldErrors?.username ? "username-error" : undefined}
        />
        {fieldErrors?.username ? (
          <p id="username-error" className="text-destructive text-sm">
            {fieldErrors.username}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors?.password)}
          aria-describedby={fieldErrors?.password ? "password-error" : undefined}
        />
        {fieldErrors?.password ? (
          <p id="password-error" className="text-destructive text-sm">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Memproses...
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
