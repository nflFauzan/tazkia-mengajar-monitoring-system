import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-shell";
import {
  AddAdminButton,
  AddPengajarButton,
  PengajarRowActions,
  UserRowActions,
} from "@/components/settings/user-manager";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatTanggalSingkat } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { hasBlobToken, isUsingLocalStorage } from "@/lib/storage";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const currentUser = await requireAdmin();

  const [admins, pengajars, availableTeamMembers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "PENGAJAR" },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        teamMember: {
          select: {
            fullName: true,
            status: true,
            phone: true,
          },
        },
      },
    }),
    prisma.teamMember.findMany({
      where: { isActive: true, user: null },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        status: true,
        phone: true,
      },
    }),
  ]);

  const usingLocalStorage = isUsingLocalStorage();
  // Local storage already implies the token is missing (dev-only fallback);
  // this also catches the token being missing in production, where the app
  // still reports "Vercel Blob" because it refuses to fall back to disk.
  const blobTokenMissing = !hasBlobToken();

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Akun admin, akun pengajar, dan informasi sistem."
        actions={
          <div className="flex flex-wrap gap-2">
            <AddAdminButton />
            <AddPengajarButton teamMembers={availableTeamMembers} />
          </div>
        }
      />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg tracking-tight">Admin</h2>
            <p className="text-muted-foreground text-xs">
              Pengguna dengan akses penuh ke seluruh data dan sistem.
            </p>
          </div>
        </div>
        <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Ditambahkan
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {user.id === currentUser.id ? (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        (Anda)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    @{user.username}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatTanggalSingkat(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      user={{
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        isActive: user.isActive,
                        isCurrentUser: user.id === currentUser.id,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg tracking-tight">
              Akun Pengajar
            </h2>
            <p className="text-muted-foreground text-xs">
              Akun personil tim untuk absensi mandiri real-time dan melihat
              kurikulum.
            </p>
          </div>
        </div>
        {pengajars.length === 0 ? (
          <div className="border-border rounded-lg border-2 border-dashed p-6 text-center shadow-[var(--shadow-brutal-sm)]">
            <p className="text-sm font-medium">Belum ada akun pengajar.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {availableTeamMembers.length > 0
                ? "Gunakan tombol 'Tambah Akun Pengajar' di atas untuk membuat akun bagi anggota tim."
                : "Semua anggota tim sudah memiliki akun pengguna, atau belum ada anggota tim terdaftar."}
            </p>
          </div>
        ) : (
          <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pengajar</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Peran Personil
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Status Password
                  </TableHead>
                  <TableHead>Status Akun</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengajars.map((pengajar) => (
                  <TableRow key={pengajar.id}>
                    <TableCell className="font-medium">
                      {pengajar.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      @{pengajar.username}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {pengajar.teamMember?.status ?? "Pengajar"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {pengajar.mustChangePassword ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        >
                          Wajib ganti
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sudah diganti</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {pengajar.isActive ? (
                        <Badge variant="outline">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <PengajarRowActions
                        pengajar={{
                          id: pengajar.id,
                          username: pengajar.username,
                          name: pengajar.name,
                          phone: pengajar.teamMember?.phone,
                          isActive: pengajar.isActive,
                          mustChangePassword: pengajar.mustChangePassword,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg tracking-tight">Sistem</h2>
        <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">
              Penyimpanan dokumentasi
            </dt>
            <dd>
              {usingLocalStorage ? (
                <>
                  Folder lokal{" "}
                  <span className="text-muted-foreground">
                    (mode pengembangan)
                  </span>
                </>
              ) : blobTokenMissing ? (
                <span className="text-destructive">
                  Vercel Blob (token belum diatur)
                </span>
              ) : (
                "Vercel Blob"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Konversi gambar</dt>
            <dd>JPEG, PNG, TIFF, AVIF → WebP</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Batas ukuran berkas
            </dt>
            <dd>25 MB per berkas</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Zona waktu laporan</dt>
            <dd>WIB</dd>
          </div>
        </dl>

        {usingLocalStorage ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Dokumentasi saat ini disimpan di folder lokal karena
            BLOB_READ_WRITE_TOKEN belum diatur. Di produksi, token wajib diisi
            agar berkas tersimpan permanen di Vercel Blob.
          </p>
        ) : blobTokenMissing ? (
          <p className="text-destructive mt-3 text-sm">
            BLOB_READ_WRITE_TOKEN belum diatur di production. Unggah
            dokumentasi akan gagal sampai token ditambahkan di Environment
            Variables project dan project di-redeploy.
          </p>
        ) : null}
      </section>
    </>
  );
}
