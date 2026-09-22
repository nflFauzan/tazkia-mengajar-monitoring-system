import type { Metadata } from "next";
import {
  AlertTriangle,
  BookCheck,
  Camera,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MessageSquare,
  Phone,
  UserCheck,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Panduan & SOP Pengajar",
};

export default async function PanduanPage() {
  await requireUser();

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Panduan & SOP Pengajar"
        description="Standar Operasional Prosedur pelaksanaan kegiatan belajar mengajar di lapangan bagi seluruh tim pengajar Tazkia Mengajar."
      />

      {/* Banner Ringkasan 4 Langkah */}
      <Card className="border-2 border-primary bg-primary/5 shadow-[var(--shadow-brutal)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
              Alur Cepat di Lapangan
            </Badge>
          </div>
          <CardTitle className="font-heading text-lg tracking-tight mt-1">
            4 Langkah Utama Pengajar Setiap Sesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div className="bg-card border-2 border-border rounded-lg p-3.5 space-y-2 shadow-[var(--shadow-brutal-sm)]">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  1
                </span>
                <span className="font-bold text-sm">Tiba di Lokasi</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Buka menu <strong className="text-foreground">Absensi Mandiri</strong> dan klik <strong className="text-foreground">&quot;Hadir Sekarang&quot;</strong> pada kartu sesi hari ini.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-card border-2 border-border rounded-lg p-3.5 space-y-2 shadow-[var(--shadow-brutal-sm)]">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  2
                </span>
                <span className="font-bold text-sm">Presensi Murid</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Klik <strong className="text-foreground">&quot;Presensi Murid&quot;</strong>. Jika bertim, cukup <strong className="text-foreground">satu orang</strong> yang input karena data otomatis sinkron.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-card border-2 border-border rounded-lg p-3.5 space-y-2 shadow-[var(--shadow-brutal-sm)]">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  3
                </span>
                <span className="font-bold text-sm">Dokumentasi</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Klik <strong className="text-foreground">&quot;Dokumentasi &amp; Laporan&quot;</strong>, centang materi kurikulum yang diajarkan dan unggah 1–2 foto kegiatan.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-card border-2 border-border rounded-lg p-3.5 space-y-2 shadow-[var(--shadow-brutal-sm)]">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                  4
                </span>
                <span className="font-bold text-sm">Kirim Laporan</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Buka tab <strong className="text-foreground">Laporan</strong>, klik <strong className="text-foreground">&quot;Salin Teks WhatsApp&quot;</strong>, dan kirimkan laporan ke grup relawan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bagian Detail: Aturan Presensi, Izin, & Alpa */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Aturan Kehadiran */}
        <Card className="border-2 border-border shadow-[var(--shadow-brutal)]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              <CardTitle className="font-heading text-base">
                Aturan Presensi Mandiri Pengajar
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed">
            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Presensi Hadir (Hari-H)
              </div>
              <p className="text-muted-foreground">
                Tombol &quot;Hadir Sekarang&quot; hanya dapat diklik saat hari kegiatan berlangsung. Waktu klik akan tercatat otomatis sebagai bukti kehadiran tepat waktu.
              </p>
            </div>

            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400">
                <Clock className="size-4" />
                Batas Izin / Sakit Mandiri (Minimal 5 Jam)
              </div>
              <p className="text-muted-foreground">
                Pengajuan Izin atau Sakit secara mandiri melalui tombol sistem harus dilakukan <strong>minimal 5 jam sebelum waktu mulai kegiatan</strong> agar tim koordinator dapat mencari pengajar pengganti.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-1">
                * Jika berhalangan mendadak (kurang dari 5 jam), Anda wajib menghubungi Admin/Koordinator secara langsung via WhatsApp.
              </p>
            </div>

            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                <AlertTriangle className="size-4" />
                Otomatis Alpa & Banding
              </div>
              <p className="text-muted-foreground">
                Pengajar yang ditugaskan namun tidak melakukan presensi hingga kegiatan selesai akan otomatis tercatat <strong>ALPA</strong> oleh sistem.
              </p>
              <p className="text-muted-foreground pt-1">
                Bila terjadi kendala teknis jaringan atau kondisi darurat, pengajar dapat mengajukan <strong>Banding Presensi</strong> melalui tombol di riwayat absensi untuk diverifikasi oleh Admin.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prosedur Presensi & Capaian Murid */}
        <Card className="border-2 border-border shadow-[var(--shadow-brutal)]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              <CardTitle className="font-heading text-base">
                Presensi & Penilaian Murid
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed">
            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="font-bold text-foreground">
                1. Presensi Harian Murid (Per Sesi)
              </div>
              <p className="text-muted-foreground">
                Presensi dilakukan di awal atau akhir kegiatan kelas. Data presensi terisolasi per tempat binaan dan otomatis tersinkronisasi antar sesama pengajar di tempat yang sama.
              </p>
            </div>

            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="font-bold text-foreground">
                2. Penilaian Capaian Murid (Kurikulum)
              </div>
              <p className="text-muted-foreground">
                Diisi secara berkala di menu <strong>Murid</strong> &rarr; pilih nama anak &rarr; klik <strong>&quot;Nilai Capaian&quot;</strong> saat anak menyelesaikan materi tertentu.
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-[11px]">
                <span className="border rounded px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                  • Tuntas: Menguasai penuh
                </span>
                <span className="border rounded px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                  • Lancar: Cukup mandiri
                </span>
                <span className="border rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                  • Cukup: Perlu pengulangan
                </span>
                <span className="border rounded px-1.5 py-0.5 bg-red-500/10 text-red-700 dark:text-red-300 font-medium">
                  • Perlu Bimbingan: Tambahan
                </span>
              </div>
            </div>

            <div className="rounded-md border p-3 bg-muted/40 space-y-1">
              <div className="font-bold text-foreground">
                3. Murid Baru di Lapangan
              </div>
              <p className="text-muted-foreground">
                Jika ada anak baru yang ingin ikut belajar, catat identitas lengkap (nama, usia, kelompok) dan laporkan ke Admin agar didaftarkan ke sistem.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standar Dokumentasi & Pelaporan WhatsApp */}
      <Card className="border-2 border-border shadow-[var(--shadow-brutal)]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-primary" />
            <CardTitle className="font-heading text-base">
              Standar Dokumentasi Foto & Pelaporan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs leading-relaxed">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border rounded-lg p-3 bg-muted/20 space-y-1.5">
              <div className="font-bold text-sm flex items-center gap-1.5">
                <Camera className="size-4 text-primary" />
                1. Kualitas Foto
              </div>
              <p className="text-muted-foreground text-xs">
                Ambil minimal 1–2 foto jelas dan pencahayaan cukup yang memperlihatkan interaksi belajar mengajar aktif antara pengajar dan anak-anak.
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-muted/20 space-y-1.5">
              <div className="font-bold text-sm flex items-center gap-1.5">
                <BookCheck className="size-4 text-primary" />
                2. Kaitkan Kurikulum
              </div>
              <p className="text-muted-foreground text-xs">
                Pada langkah kurikulum, centang judul materi yang dipelajari hari itu agar otomatis terangkum dalam narasi laporan kegiatan.
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-muted/20 space-y-1.5">
              <div className="font-bold text-sm flex items-center gap-1.5">
                <MessageSquare className="size-4 text-primary" />
                3. Laporan WhatsApp
              </div>
              <p className="text-muted-foreground text-xs">
                Gunakan tombol &quot;Salin Teks WhatsApp&quot; untuk menyalin format baku laporan yang sudah disusun otomatis oleh sistem, lalu kirimkan ke grup relawan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tata Tertib & Etika Pengajar */}
      <Card className="border-2 border-border shadow-[var(--shadow-brutal)]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <HeartHandshake className="size-5 text-primary" />
            <CardTitle className="font-heading text-base">
              Tata Tertib & Etika Relawan Pengajar
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5 sm:grid-cols-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-md border">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">Pakaian Sopan & Rapi:</strong> Mengenakan busana yang sopan, rapi, dan menutup aurat sesuai norma lingkungan binaan.
              </span>
            </li>
            <li className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-md border">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">Hadir Tepat Waktu:</strong> Tiba di lokasi minimal 15 menit sebelum kegiatan dimulai untuk persiapan materi dan kelas.
              </span>
            </li>
            <li className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-md border">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">Pendekatan Ramah:</strong> Menjaga tutur kata yang baik, memberikan motivasi positif, dan tidak bersikap kasar terhadap murid.
              </span>
            </li>
            <li className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-md border">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">Menghormati Warga Sekitar:</strong> Menjaga etika, kebersihan tempat mengajar, dan bersilaturahmi baik dengan pengurus/warga setempat.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Bantuan & Kontak Darurat */}
      <Card className="border-2 border-primary/30 bg-primary/5 shadow-[var(--shadow-brutal-sm)]">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Phone className="size-6 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-heading text-base font-bold text-foreground">
                Butuh Bantuan atau Terjadi Kendala Darurat?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Segera hubungi Koordinator Lapangan atau Admin Tazkia Mengajar jika terjadi kendala teknis, cuaca ekstrem, atau kondisi medis anak di lokasi mengajar.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-card text-foreground font-semibold px-3 py-1.5 border-2 text-xs shrink-0">
            PIC Operasional: Admin Tazkia
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
