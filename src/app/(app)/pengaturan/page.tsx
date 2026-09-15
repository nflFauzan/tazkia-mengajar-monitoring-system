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
import { isUsingLocalStorage } from "@/lib/storage";

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

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Akun admin dan informasi sistem."
        actions={<AddAdminButton />}
      />

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Admin</h2>
        <div className="rounded-lg border">
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
        <h2 className="mb-3 font-semibold">Sistem</h2>
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
        ) : null}
      </section>
    </>
  );
}
