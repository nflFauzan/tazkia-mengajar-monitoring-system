"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  ActiveField,
  FormDialog,
  TextAreaField,
  TextField,
} from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createLocationAction,
  deleteLocationAction,
  setLocationActiveAction,
  updateLocationAction,
} from "@/server/actions/locations";

export interface LocationRow {
  id: string;
  name: string;
  partner: string;
  address: string;
  category: string;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  isActive: boolean;
}

/**
 * Owns the dialogs for the Tempat list.
 *
 * The table itself is rendered on the server; only the interactive bits live
 * here, so the page stays a server component and the list is never shipped to
 * the browser as JSON.
 */
export function AddLocationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Tempat
      </Button>
      <LocationFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function LocationRowActions({ location }: { location: LocationRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="Aksi">
              Aksi
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Ubah
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
            {location.isActive ? (
              <>
                <Archive className="size-4" />
                Arsipkan
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Aktifkan
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LocationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        location={location}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={location.isActive ? "Arsipkan tempat?" : "Aktifkan tempat?"}
        description={
          location.isActive
            ? `"${location.name}" tidak akan muncul saat membuat kegiatan atau jadwal baru. Riwayat yang sudah ada tetap utuh.`
            : `"${location.name}" akan bisa dipilih lagi saat membuat kegiatan atau jadwal baru.`
        }
        confirmLabel={location.isActive ? "Arsipkan" : "Aktifkan"}
        successMessage={
          location.isActive ? "Tempat diarsipkan." : "Tempat diaktifkan."
        }
        action={() => setLocationActiveAction(location.id, !location.isActive)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus tempat?"
        description={`"${location.name}" akan dihapus permanen. Jika tempat ini sudah dipakai pada kegiatan atau jadwal, penghapusan akan ditolak dan Anda bisa mengarsipkannya.`}
        confirmLabel="Hapus"
        pendingLabel="Menghapus..."
        successMessage="Tempat dihapus."
        destructive
        action={() => deleteLocationAction(location.id)}
      />
    </>
  );
}

function LocationFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationRow;
}) {
  if (!props.open) return null;
  return (
    <LocationFormDialogInner
      key={props.location?.id ?? "new"}
      {...props}
    />
  );
}

function LocationFormDialogInner({
  open,
  onOpenChange,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationRow;
}) {
  const isEdit = Boolean(location);
  const [lat, setLat] = useState<string>(
    location?.latitude != null ? String(location.latitude) : "",
  );
  const [lng, setLng] = useState<string>(
    location?.longitude != null ? String(location.longitude) : "",
  );
  const [radius, setRadius] = useState<string>(
    location?.radiusMeters != null ? String(location.radiusMeters) : "100",
  );
  const [isLocating, setIsLocating] = useState(false);

  function handleGetCurrentLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast.error("Browser tidak mendukung pendeteksian lokasi GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("Koordinat lokasi Anda saat ini berhasil diisi!");
      },
      (err) => {
        setIsLocating(false);
        let msg = "Gagal mengambil koordinat lokasi.";
        if (err.code === 1) {
          msg = "Izin lokasi ditolak oleh browser.";
        } else if (err.code === 2) {
          msg = "Sinyal GPS tidak tersedia.";
        } else if (err.code === 3) {
          msg = "Waktu pencarian sinyal GPS habis.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Tempat" : "Tambah Tempat"}
      description="Tempat dipakai ulang untuk jadwal, kelompok murid, dan kegiatan."
      successMessage={isEdit ? "Tempat diperbarui." : "Tempat ditambahkan."}
      action={isEdit ? updateLocationAction : createLocationAction}
    >
      {location ? <input type="hidden" name="id" value={location.id} /> : null}

      <TextField
        name="name"
        label="Nama tempat"
        required
        defaultValue={location?.name}
        placeholder="Desa Binaan Margajaya"
      />
      <TextField
        name="partner"
        label="Mitra"
        required
        defaultValue={location?.partner}
        placeholder="Publik"
      />
      <TextField
        name="category"
        label="Kategori"
        required
        defaultValue={location?.category}
        placeholder="Desa Binaan"
        hint="Bebas diisi sesuai kebutuhan, misalnya Desa Binaan, Sekolah, atau TPQ."
      />
      <TextAreaField
        name="address"
        label="Alamat lengkap"
        required
        rows={3}
        defaultValue={location?.address}
        placeholder="Jalan..., Kel. ..., Kec. ..., Kota ..., Provinsi."
      />
      <TextAreaField
        name="description"
        label="Deskripsi"
        defaultValue={location?.description}
      />

      {/* Geofencing & GPS coordinates */}
      <div className="space-y-3 rounded-lg border p-3.5 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-xs">
            <MapPin className="size-3.5 text-primary" />
            <span>Validasi Lokasi Terkini (Geofencing GPS)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={isLocating}
            onClick={handleGetCurrentLocation}
          >
            {isLocating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Crosshair className="size-3" />
            )}
            Ambil Lokasi Saya
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-normal">
          Pengajar hanya bisa presensi mandiri jika berada di dalam radius tempat ini. Kosongkan jika tempat belum memiliki titik koordinat.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <TextField
            name="latitude"
            label="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="-6.589123"
          />
          <TextField
            name="longitude"
            label="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="106.789123"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 items-end">
          <TextField
            name="radiusMeters"
            label="Radius Toleransi (meter)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="100"
            hint="Batas jarak check-in (default 100m)."
          />
          {lat && lng ? (
            <div className="pb-2">
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="size-3" />
                Cek di Google Maps
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <ActiveField defaultChecked={location?.isActive ?? true} />
    </FormDialog>
  );
}
