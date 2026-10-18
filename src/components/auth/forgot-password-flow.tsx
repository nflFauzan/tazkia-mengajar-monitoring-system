"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetOtpAction,
  resendPasswordResetOtpAction,
  verifyOtpAndResetPasswordAction,
  type RequestOtpSuccessData,
} from "@/server/actions/password-reset";

export function ForgotPasswordFlow() {
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  const [sessionData, setSessionData] = useState<RequestOtpSuccessData | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(0);

  // Transitions for Server Action calls
  const [isRequestPending, startRequestTransition] = useTransition();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestFieldErrors, setRequestFieldErrors] = useState<
    Record<string, string> | undefined
  >(undefined);

  const [isResetPending, startResetTransition] = useTransition();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetFieldErrors, setResetFieldErrors] = useState<
    Record<string, string> | undefined
  >(undefined);

  const [isResending, startResendTransition] = useTransition();

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestError(null);
    setRequestFieldErrors(undefined);

    const formData = new FormData(e.currentTarget);
    startRequestTransition(async () => {
      const res = await requestPasswordResetOtpAction(null, formData);
      if (res.ok && res.data) {
        setSessionData(res.data);
        setStep("verify");
        setCooldown(60);
        toast.success(
          `Kode OTP telah dikirimkan ke WhatsApp ${res.data.maskedPhone}`,
        );
      } else if (!res.ok) {
        setRequestError(res.error);
        setRequestFieldErrors(res.fieldErrors);
      }
    });
  };

  const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(null);
    setResetFieldErrors(undefined);

    const formData = new FormData(e.currentTarget);
    startResetTransition(async () => {
      const res = await verifyOtpAndResetPasswordAction(null, formData);
      if (res.ok) {
        setStep("success");
        toast.success("Password Anda berhasil diubah!");
      } else {
        setResetError(res.error);
        setResetFieldErrors(res.fieldErrors);
      }
    });
  };

  const handleResendOtp = () => {
    if (!sessionData?.resetSessionId || cooldown > 0 || isResending) return;

    startResendTransition(async () => {
      const res = await resendPasswordResetOtpAction(sessionData.resetSessionId);
      if (res.ok && res.data) {
        setSessionData(res.data);
        setCooldown(60);
        toast.success(`Kode OTP baru dikirim ke ${res.data.maskedPhone}`);
      } else if (!res.ok) {
        toast.error(res.error || "Gagal mengirim ulang kode OTP.");
      }
    });
  };

  if (step === "success") {
    return (
      <div className="space-y-6 text-center py-2">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-500 shadow-[var(--shadow-brutal-sm)]">
          <CheckCircle2 className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-lg font-bold uppercase tracking-tight">
            Password Berhasil Diubah!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun Anda kini sudah siap digunakan dengan password baru. Silakan
            masuk kembali ke sistem menggunakan kredensial tersebut.
          </p>
        </div>

        <Link href="/login" className={buttonVariants({ className: "w-full" })}>
          Kembali ke Halaman Login
        </Link>
      </div>
    );
  }

  if (step === "verify" && sessionData) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border-2 border-emerald-600 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 flex items-start gap-3 shadow-[var(--shadow-brutal-sm)]">
          <MessageCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Kode OTP Terkirim!</p>
            <p className="text-emerald-800">
              Kode verifikasi 6 digit telah dikirimkan ke WhatsApp{" "}
              <strong className="font-mono font-bold text-emerald-950">
                {sessionData.maskedPhone}
              </strong>
              . Kode berlaku selama 10 menit.
            </p>
          </div>
        </div>

        {resetError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{resetError}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
          <input
            type="hidden"
            name="resetSessionId"
            value={sessionData.resetSessionId}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="otp" className="text-xs font-bold">
                Kode Verifikasi OTP *
              </Label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || isResending}
                className="text-[11px] font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline flex items-center gap-1"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="size-3 animate-spin" />
                    Mengirim...
                  </>
                ) : cooldown > 0 ? (
                  `Kirim ulang (${cooldown}s)`
                ) : (
                  <>
                    <RefreshCw className="size-3" />
                    Kirim ulang OTP
                  </>
                )}
              </button>
            </div>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              autoFocus
              required
              disabled={isResetPending}
              className="text-center font-mono text-lg font-bold tracking-widest"
              aria-invalid={Boolean(resetFieldErrors?.otp)}
              aria-describedby={resetFieldErrors?.otp ? "otp-error" : undefined}
            />
            {resetFieldErrors?.otp ? (
              <p id="otp-error" className="text-destructive text-xs">
                {resetFieldErrors.otp}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-bold">
              Password Baru *
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              required
              disabled={isResetPending}
              aria-invalid={Boolean(resetFieldErrors?.newPassword)}
              aria-describedby={
                resetFieldErrors?.newPassword ? "newPassword-error" : undefined
              }
            />
            {resetFieldErrors?.newPassword ? (
              <p id="newPassword-error" className="text-destructive text-xs">
                {resetFieldErrors.newPassword}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-bold">
              Konfirmasi Password Baru *
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Ketik ulang password baru"
              required
              disabled={isResetPending}
              aria-invalid={Boolean(resetFieldErrors?.confirmPassword)}
              aria-describedby={
                resetFieldErrors?.confirmPassword
                  ? "confirmPassword-error"
                  : undefined
              }
            />
            {resetFieldErrors?.confirmPassword ? (
              <p id="confirmPassword-error" className="text-destructive text-xs">
                {resetFieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isResetPending}>
            {isResetPending ? (
              <>
                <Loader2 className="animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <KeyRound className="size-4" />
                Simpan Password Baru
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("request");
              setSessionData(null);
            }}
            disabled={isResetPending}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center justify-center gap-1.5 pt-1"
          >
            <ArrowLeft className="size-3.5" />
            Ganti username atau nomor lain
          </button>
        </form>
      </div>
    );
  }

  // Step 1: Request OTP
  return (
    <form onSubmit={handleRequestSubmit} className="space-y-5" noValidate>
      {requestError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{requestError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-xs font-bold">
          Username atau Nomor WhatsApp
        </Label>
        <Input
          id="identifier"
          name="identifier"
          placeholder="contoh: nama@tazkiamengajar.id atau 08123456789"
          autoFocus
          required
          disabled={isRequestPending}
          aria-invalid={Boolean(requestFieldErrors?.identifier)}
          aria-describedby={
            requestFieldErrors?.identifier ? "identifier-error" : undefined
          }
        />
        {requestFieldErrors?.identifier ? (
          <p id="identifier-error" className="text-destructive text-xs">
            {requestFieldErrors.identifier}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Masukkan username akun Anda atau nomor WhatsApp terdaftar. Kode OTP
            akan dikirimkan secara otomatis ke nomor WA Anda.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isRequestPending}>
        {isRequestPending ? (
          <>
            <Loader2 className="animate-spin" />
            Mengirim Kode OTP...
          </>
        ) : (
          <>
            <Send className="size-4" />
            Kirim Kode OTP ke WhatsApp
          </>
        )}
      </Button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Kembali ke Halaman Login
        </Link>
      </div>
    </form>
  );
}
