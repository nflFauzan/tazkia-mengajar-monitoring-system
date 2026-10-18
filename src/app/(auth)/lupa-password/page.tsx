import { Suspense } from "react";
import type { Metadata } from "next";

import { TazkiaMark } from "@/components/brand/tazkia-mark";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Lupa Password",
  description: "Reset password mandiri menggunakan nomor WhatsApp terdaftar.",
};

export default function LupaPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <TazkiaMark className="mb-3 size-14" />
          <h1 className="font-heading text-xl tracking-tight uppercase sm:text-2xl">
            Lupa Password
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Reset password mandiri via WhatsApp
          </p>
        </div>

        <div className="bg-card border-border rounded-lg border-2 p-6 shadow-[var(--shadow-brutal-lg)]">
          <Suspense fallback={<ForgotPasswordSkeleton />}>
            <ForgotPasswordFlow />
          </Suspense>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Aplikasi internal Tazkia Mengajar. Hubungi admin jika nomor WhatsApp Anda
          berubah atau tidak dapat diakses.
        </p>
      </div>
    </main>
  );
}

function ForgotPasswordSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
