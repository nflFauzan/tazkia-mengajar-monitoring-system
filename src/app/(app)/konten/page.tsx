import type { Metadata } from "next";
import {
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Film,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-shell";
import { ContentBoard } from "@/components/content/content-board";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getContentIdeas,
  getContentIdeasStats,
} from "@/server/services/content-ideas";

export const metadata: Metadata = {
  title: "Papan Ide & Referensi Konten",
  description:
    "Ruang kolaborasi tim pengajar untuk berbagi inspirasi tren media sosial, merencanakan eksekusi rekaman bareng di lapangan, hingga memantau postingan tayang.",
};

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-[125px] flex-1 flex-col justify-between rounded-lg border-2 border-border bg-card p-3 shadow-[var(--shadow-brutal-sm)] sm:p-4 sm:shadow-[var(--shadow-brutal)]">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider truncate sm:text-xs">
          {label}
        </p>
        <Icon className="size-3.5 shrink-0 text-muted-foreground sm:size-4" aria-hidden />
      </div>
      <p className="font-heading mt-1.5 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

export default async function KontenPage() {
  const user = await requireUser();

  const [ideas, stats, locations] = await Promise.all([
    getContentIdeas(),
    getContentIdeasStats(),
    prisma.location.findMany({
      select: { id: true, name: true },
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Papan Ide & Referensi Konten"
        description="Ruang kolaborasi ide media sosial, tautan referensi video tren, rencana rekaman bareng di lapangan, hingga laporan publikasi tayang."
      />

      {/* Ringkasan Statistik Konten - Horizontally scrollable on mobile, grid on desktop */}
      <section
        aria-label="Statistik Ide Konten"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1.5 no-scrollbar scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5"
      >
        <MetricCard
          label="Total Usulan"
          value={stats.total}
          icon={Clapperboard}
        />
        <MetricCard
          label="Ide & Referensi"
          value={stats.ideCount}
          icon={Sparkles}
        />
        <MetricCard
          label="Rencana Rekam"
          value={stats.rencanaCount}
          icon={CalendarDays}
        />
        <MetricCard
          label="Proses Edit"
          value={stats.prosesEditCount}
          icon={Film}
        />
        <MetricCard
          label="Sudah Tayang"
          value={stats.tayangCount}
          icon={CheckCircle2}
        />
      </section>

      {/* Papan Interaktif Konten */}
      <ContentBoard
        initialIdeas={ideas}
        locations={locations}
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  );
}
