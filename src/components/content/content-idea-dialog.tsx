"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createContentIdeaAction,
  updateContentIdeaAction,
} from "@/server/actions/content-ideas";
import type { ContentIdeaItem } from "@/server/services/content-ideas";

interface Option {
  value: string;
  label: string;
}

interface ContentIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea?: ContentIdeaItem | null;
  locations: Option[];
}

export function ContentIdeaDialog({
  open,
  onOpenChange,
  idea,
  locations,
}: ContentIdeaDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: idea?.title ?? "",
    platform: idea?.platform ?? "INSTAGRAM",
    contentType: idea?.contentType ?? "Reels / Video Pendek",
    referenceUrl: idea?.referenceUrl ?? "",
    description: idea?.description ?? "",
    locationId: idea?.locationId ?? "",
    targetDate: idea?.targetDateStr ?? "",
  });

  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setForm({
      title: idea?.title ?? "",
      platform: idea?.platform ?? "INSTAGRAM",
      contentType: idea?.contentType ?? "Reels / Video Pendek",
      referenceUrl: idea?.referenceUrl ?? "",
      description: idea?.description ?? "",
      locationId: idea?.locationId ?? "",
      targetDate: idea?.targetDateStr ?? "",
    });
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Judul atau topik ide konten wajib diisi.");
      return;
    }
    if (!form.description.trim()) {
      setError("Konsep atau ide cerita konten wajib diisi.");
      return;
    }

    setError(null);
    const ideaId = idea?.id;

    startTransition(async () => {
      const payload = {
        title: form.title.trim(),
        platform: form.platform as "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "LAINNYA",
        contentType: form.contentType.trim() || undefined,
        referenceUrl: form.referenceUrl.trim() || undefined,
        description: form.description.trim(),
        locationId: form.locationId || undefined,
        targetDate: form.targetDate || undefined,
      };

      const result = ideaId
        ? await updateContentIdeaAction(ideaId, payload)
        : await createContentIdeaAction(payload);

      if (result.ok) {
        toast.success(
          idea
            ? "Ide konten berhasil diperbarui!"
            : "Ide konten berhasil ditambahkan ke papan bersama!",
        );
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan ide konten.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        if (next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--brand)]" />
            {idea ? "Ubah Ide Konten" : "Tambah Ide & Referensi Konten"}
          </DialogTitle>
          <DialogDescription>
            {idea
              ? "Perbarui detail konsep atau tautan referensi konten."
              : "Setor inspirasi tren atau ide konten untuk dieksekusi bareng rekan relawan di lapangan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">
              Judul / Topik Ide <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: Tren tebak kata ceria bareng anak-anak"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform Utama</Label>
              <select
                id="platform"
                value={form.platform}
                onChange={(e) =>
                  setForm({
                    ...form,
                    platform: e.target.value as
                      | "INSTAGRAM"
                      | "TIKTOK"
                      | "YOUTUBE"
                      | "LAINNYA",
                  })
                }
                disabled={isPending}
                className="border-input bg-card h-9 w-full rounded-md border-2 px-3 text-sm font-medium shadow-[var(--shadow-brutal-sm)]"
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType">Format / Jenis Konten</Label>
              <Input
                id="contentType"
                placeholder="Contoh: Reels / Video Pendek"
                value={form.contentType}
                onChange={(e) => setForm({ ...form, contentType: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceUrl" className="flex items-center gap-1.5">
              <Video className="size-4 text-muted-foreground" />
              Tautan Referensi Video (Opsional)
            </Label>
            <Input
              id="referenceUrl"
              type="url"
              placeholder="https://www.instagram.com/reel/... atau link TikTok"
              value={form.referenceUrl}
              onChange={(e) => setForm({ ...form, referenceUrl: e.target.value })}
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Tempel tautan video IG/TikTok/YT yang ingin dicontoh gaya/formatnya oleh tim kamera & pengajar.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Konsep / Ide Cerita <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Jelaskan alur, momen apa yang mau direkam, atau pesan apa yang ingin disampaikan..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locationId">Terkait Tempat (Opsional)</Label>
              <select
                id="locationId"
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                disabled={isPending}
                className="border-input bg-card h-9 w-full rounded-md border-2 px-3 text-sm font-medium shadow-[var(--shadow-brutal-sm)]"
              >
                <option value="">Semua Tempat / Bebas</option>
                {locations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Tanggal Rekam/Tayang</Label>
              <Input
                id="targetDate"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : idea ? (
                "Simpan Perubahan"
              ) : (
                <>
                  <Plus className="size-4" />
                  Tambahkan ke Papan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
