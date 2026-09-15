import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-shell";
import {
  AddAdminButton,
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
import { requireUser } from "@/lib/auth/session";
import { formatTanggalSingkat } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { hasBlobToken, isUsingLocalStorage } from "@/lib/storage";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const currentUser = await requireUser();

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  const usingLocalStorage = isUsingLocalStorage();
  // Local storage already implies the token is missing (dev-only fallback);
  // this also catches the token being missing in production, where the app
  // still reports "Vercel Blob" because it refuses to fall back to disk.
  const blobTokenMissing = !hasBlobToken();

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Akun admin dan informasi sistem."
        actions={<AddAdminButton />}
      />

      <section className="mb-8">
        <h2 className="font-heading mb-3 text-lg tracking-tight">Admin</h2>
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
              {users.map((user) => (
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
