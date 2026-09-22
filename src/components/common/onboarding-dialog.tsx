"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookCheck,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MessageSquare,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface OnboardingDialogProps {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
}

const ONBOARDING_STEPS = [
  {
    step: 1,
    badge: "Langkah 1 dari 4",
    title: "Selamat Datang di Tazkia Mengajar! 👋",
    description: "Sistem monitoring kegiatan belajar mengajar relawan di desa binaan.",
    icon: GraduationCap,
    content: (name: string) => (
      <div className="space-y-3 text-xs leading-relaxed">
        <div className="rounded-lg border-2 border-border bg-muted/20 p-3 space-y-1">
          <p className="text-sm font-bold text-foreground">
            Halo, Kak <span className="text-primary">{name}</span>! 👋
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Terima kasih telah bergabung sebagai relawan pengajar. Aplikasi ini dirancang agar kegiatan mengajar Anda di lokasi binaan terdokumentasi rapi, transparan, dan mudah dilaporkan.
          </p>
        </div>

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="font-bold text-foreground text-xs flex items-center gap-1.5 text-primary">
            <Sparkles className="size-3.5 shrink-0" />
            <span>Alur Utama Pengajar:</span>
          </p>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                1
              </span>
              <span><strong>Presensi Mandiri</strong> saat tiba di lokasi mengajar</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                2
              </span>
              <span><strong>Presensi Murid</strong> (otomatis tersinkron dengan tim)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                3
              </span>
              <span><strong>Dokumentasi</strong> foto & salin laporan ke WhatsApp</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    step: 2,
    badge: "Langkah 2 dari 4",
    title: "Presensi Mandiri & Presensi Murid 📍",
    description: "Alur kehadiran di lapangan saat tiba di lokasi mengajar.",
    icon: UserCheck,
    content: () => (
      <div className="space-y-2.5 text-xs leading-relaxed">
        <div className="rounded-lg border-2 border-border p-3 space-y-1 bg-muted/20">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
              1
            </span>
            <span>Presensi Mandiri (&quot;Hadir Sekarang&quot;)</span>
          </div>
          <p className="text-muted-foreground text-[11px] pl-6 leading-relaxed">
            Tiba di lokasi mengajar pada Hari-H, buka <strong>Dashboard</strong> atau menu <strong>Absensi Mandiri</strong>, lalu klik tombol <strong>&quot;Hadir Sekarang&quot;</strong>. Waktu presensi Anda tercatat otomatis.
          </p>
        </div>

        <div className="rounded-lg border-2 border-border p-3 space-y-1 bg-muted/20">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
              2
            </span>
            <span>Presensi Murid (Otomatis Sinkron)</span>
          </div>
          <p className="text-muted-foreground text-[11px] pl-6 leading-relaxed">
            Klik tombol <strong>&quot;Presensi Murid&quot;</strong> untuk mencatat kehadiran anak-anak. Jika mengajar bertim dalam satu lokasi, <strong>cukup satu orang yang menginput</strong> karena data otomatis sinkron realtime.
          </p>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    badge: "Langkah 3 dari 4",
    title: "Dokumentasi & Laporan WhatsApp 📸",
    description: "Selesaikan kelas dan bagikan laporan ke grup tanpa mengetik ulang.",
    icon: Camera,
    content: () => (
      <div className="space-y-2.5 text-xs leading-relaxed">
        <p className="text-muted-foreground text-xs">
          Setelah sesi mengajar selesai, klik tombol <strong>&quot;Dokumentasi &amp; Laporan&quot;</strong> pada kartu sesi Anda:
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border-2 border-border p-2.5 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <Camera className="size-3.5 text-primary shrink-0" />
              Upload Foto Kegiatan
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Unggah 1–2 foto kegiatan mengajar langsung dari kamera atau galeri HP Anda.
            </p>
          </div>

          <div className="rounded-lg border-2 border-border p-2.5 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <MessageSquare className="size-3.5 text-primary shrink-0" />
              Salin Teks WhatsApp
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Sistem menyusun ringkasan otomatis. Cukup klik salin dan kirimkan ke grup relawan.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    badge: "Langkah 4 dari 4",
    title: "Aturan Izin, Sakit, & Banding Alpa ⏱️",
    description: "Ketentuan jika berhalangan hadir pada jadwal mengajar.",
    icon: Clock,
    content: () => (
      <div className="space-y-2.5 text-xs leading-relaxed">
        <div className="rounded-lg border-2 border-border p-3 space-y-1 bg-muted/20">
          <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
            <Clock className="size-4 shrink-0" />
            <span>Batas Izin Mandiri (Minimal 5 Jam)</span>
          </div>
          <p className="text-muted-foreground text-[11px] pl-6 leading-relaxed">
            Pengajuan izin mandiri dilakukan minimal <strong>5 jam sebelum sesi dimulai</strong>. Jika berhalangan mendadak (&lt; 5 jam), segera hubungi Admin via WhatsApp.
          </p>
        </div>

        <div className="rounded-lg border-2 border-border p-3 space-y-1 bg-muted/20">
          <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Otomatis Alpa & Banding</span>
          </div>
          <p className="text-muted-foreground text-[11px] pl-6 leading-relaxed">
            Sesi tanpa presensi otomatis tercatat Alpa. Anda dapat mengajukan <strong>Banding</strong> jika terjadi kendala teknis untuk diverifikasi Admin.
          </p>
        </div>
      </div>
    ),
  },
];

export function OnboardingDialog({
  userId,
  userName,
  trigger,
}: OnboardingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = `tazkia_onboarding_v1_${userId}`;

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => setIsOpen(true), 300);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [storageKey]);

  function handleComplete() {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore
    }
    setIsOpen(false);
  }

  function handleOpen() {
    setCurrentStep(0);
    setIsOpen(true);
  }

  const current = ONBOARDING_STEPS[currentStep];
  const StepIcon = current.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-[520px] p-0 overflow-hidden border-2 border-border shadow-[3px_3px_0_0_#0a0a0a] sm:shadow-[6px_6px_0_0_#0a0a0a] max-h-[92vh] flex flex-col justify-between">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b-2 border-border bg-card space-y-2">
            <div className="flex items-center justify-between pr-8">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30 py-0.5 px-2">
                {current.badge}
              </Badge>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border-2 border-border bg-primary/10 text-primary shrink-0 shadow-[var(--shadow-brutal-sm)] mt-0.5">
                <StepIcon className="size-5" />
              </div>
              <div className="space-y-0.5 min-w-0 pr-4">
                <DialogTitle className="font-heading text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
                  {current.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {current.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 overflow-y-auto min-h-[180px] flex flex-col justify-center">
            {current.content(userName)}
          </div>

          <div className="p-3.5 px-6 sm:px-8 border-t-2 border-border bg-muted/20 relative flex flex-row items-center justify-between">
            {/* Kiri: Kembali / Lewati */}
            <div className="z-10 flex items-center">
              {!isFirst ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  className="h-8 px-3 text-xs gap-1 border-2 font-semibold"
                >
                  <ChevronLeft className="size-3.5" />
                  Kembali
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Lewati
                </Button>
              )}
            </div>

            {/* Tengah: Stepper Dots (Absolute Center) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 pointer-events-auto">
              {ONBOARDING_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  aria-label={`Ke langkah ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200 focus:outline-none",
                    idx === currentStep
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                  )}
                />
              ))}
            </div>

            {/* Kanan: Lanjut / Mulai */}
            <div className="z-10 flex items-center">
              {!isLast ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setCurrentStep((prev) =>
                      Math.min(prev + 1, ONBOARDING_STEPS.length - 1),
                    )
                  }
                  className="h-8 px-3 text-xs gap-1 border-2 font-bold shadow-[var(--shadow-brutal-sm)]"
                >
                  Lanjut
                  <ChevronRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleComplete}
                  className="h-8 px-3 text-xs gap-1 font-bold border-2 shadow-[var(--shadow-brutal-sm)]"
                >
                  <CheckCircle2 className="size-3.5" />
                  Mulai!
                </Button>
              )}
            </div>
          </div>

          {/* Centered SOP Bar */}
          <div className="py-2 px-3 sm:px-6 bg-muted/40 border-t border-border flex items-center justify-center text-center text-[11px] text-muted-foreground">
            <span className="flex items-center justify-center gap-1 flex-wrap">
              <BookCheck className="size-3.5 text-primary shrink-0" />
              <span>Butuh panduan lengkap?</span>
              <Link
                href="/panduan"
                onClick={() => setIsOpen(false)}
                className="font-bold text-primary hover:underline ml-0.5"
              >
                Baca SOP Pengajar &rarr;
              </Link>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
