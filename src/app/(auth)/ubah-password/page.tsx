import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { TazkiaMark } from "@/components/brand/tazkia-mark";
import { FirstTimePasswordForm } from "@/components/auth/first-time-password-form";
import { requireUserAllowPasswordChange } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Ubah Password Pertama Kali",
  description: "Ubah password sementara Anda sebelum melanjutkan.",
};

export default async function UbahPasswordPage() {
  const user = await requireUserAllowPasswordChange();

  // If user already changed their password, no need to be here
  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <TazkiaMark className="mb-3 size-14" />
          <h1 className="font-heading text-xl tracking-tight uppercase sm:text-2xl">
            Ubah Password
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Halo, <strong className="text-foreground">{user.name}</strong>! Ini
            adalah login pertama Anda. Demi keamanan, silakan tentukan password baru
            sebelum melanjutkan ke aplikasi.
          </p>
        </div>

        <div className="bg-card border-border rounded-lg border-2 p-6 shadow-[var(--shadow-brutal-lg)]">
          <FirstTimePasswordForm />
        </div>
      </div>
    </main>
  );
}
