"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Globe, Loader2 } from "lucide-react";
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
import { updateContentIdeaStatusAction } from "@/server/actions/content-ideas";
import type { ContentIdeaItem } from "@/server/services/content-ideas";

interface PublishDialogProps {
  idea: ContentIdeaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({
  idea,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(idea?.publishedUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!idea) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Tautan postingan sosmed wajib diisi sebagai bukti tayang.");
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setError("Format tautan tidak valid (harus diawali https://...)");
      return;
    }

    if (!idea) return;
    setError(null);
    const targetId = idea.id;
    startTransition(async () => {
      const result = await updateContentIdeaStatusAction(targetId, {
        status: "TAYANG",
        publishedUrl: url.trim(),
      });

      if (result.ok) {
        toast.success("Konten berhasil ditandai tayang & tersimpan di laporan!");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan tautan publikasi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            Tandai Konten Sudah Tayang
          </DialogTitle>
          <DialogDescription>
            Masukkan tautan postingan Instagram / TikTok untuk:{" "}
            <strong>{idea.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="publishedUrl" className="flex items-center gap-1.5">
              <Globe className="size-4 text-muted-foreground" />
              Tautan Postingan Media Sosial <span className="text-destructive">*</span>
            </Label>
            <Input
              id="publishedUrl"
              type="url"
              placeholder="https://www.instagram.com/reel/... atau https://tiktok.com/@..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isPending}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Tautan ini akan langsung dapat diklik oleh seluruh relawan pengajar dan pengurus untuk melihat hasil karya tim.
            </p>
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
            <Button type="submit" disabled={isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Simpan & Tandai Tayang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
