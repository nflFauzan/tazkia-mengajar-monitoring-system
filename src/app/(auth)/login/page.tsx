import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { TazkiaMark } from "@/components/brand/tazkia-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Tazkia Mengajar Monitoring System.",
};

export default async function LoginPage() {
  // Checked here rather than in the proxy: this verifies the account still
  // exists, so a stale-but-signed cookie lands on the form instead of being
  // bounced between here and the dashboard.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <TazkiaMark className="mb-4 size-16" />
          <h1 className="font-heading text-2xl tracking-tight uppercase">
            Tazkia Mengajar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sistem Monitoring &amp; Pelaporan Kegiatan
          </p>
        </div>

        <div className="bg-card border-border rounded-lg border-2 p-6 shadow-[var(--shadow-brutal-lg)]">
          {/*
            LoginForm reads the `next` query parameter, so it must sit inside a
            Suspense boundary — useSearchParams opts the subtree into client-side
            rendering and Next requires the fallback to be explicit.
          */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Aplikasi internal. Hubungi admin jika Anda belum memiliki akses.
        </p>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
