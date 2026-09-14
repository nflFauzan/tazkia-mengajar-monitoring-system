import { Suspense } from "react";
import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Tazkia Mengajar Monitoring System.",
};

export default function LoginPage() {
  return (
    <main className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tazkia Mengajar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sistem Monitoring &amp; Pelaporan Kegiatan
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
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
