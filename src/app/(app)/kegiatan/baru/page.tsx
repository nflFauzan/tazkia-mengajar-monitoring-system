import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { ActivityInfoForm } from "@/components/activities/activity-info-form";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Tambah Kegiatan" };

export default async function TambahKegiatanPage() {
  await requireAdmin();

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, partner: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tambah Kegiatan"
        description="Langkah 1 dari 7 — informasi kegiatan. Setelah disimpan, kegiatan tersimpan sebagai draft dan bisa dilanjutkan kapan saja."
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada tempat aktif."
          description="Kegiatan harus terhubung ke sebuah tempat. Tambahkan tempat terlebih dahulu."
          action={<ButtonLink href="/tempat">Kelola Tempat</ButtonLink>}
        />
      ) : (
        <ActivityInfoForm locations={locations} />
      )}
    </div>
  );
}
