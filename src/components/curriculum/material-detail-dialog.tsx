"use client";

import { useState } from "react";
import { BookOpen, Eye, FileText, Lightbulb, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaterialDetailDialogProps {
  material: {
    id: string;
    title: string;
    meetingLabel: string | null;
    objective: string | null;
    description: string | null;
    notes: string | null;
    isActive: boolean;
  };
  periodName: string;
  curriculumName: string;
}

export function MaterialDetailDialog({
  material,
  periodName,
  curriculumName,
}: MaterialDetailDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-xs gap-1.5 shrink-0"
        title="Lihat Rincian Materi"
      >
        <Eye className="size-3.5" />
        <span className="hidden sm:inline">Detail</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {curriculumName}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {periodName}
              </Badge>
              {material.isActive ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-xs">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Arsip
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-heading tracking-tight">
              {material.meetingLabel ? `${material.meetingLabel}: ` : ""}
              {material.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Tujuan Pembelajaran */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-tight">
                <Target className="size-4" />
                <span>TUJUAN PEMBELAJARAN (CAPAIAN)</span>
              </div>
              <p className="text-foreground font-medium text-sm leading-relaxed">
                {material.objective || "Tujuan pembelajaran belum ditentukan."}
              </p>
            </div>

            {/* Deskripsi & Rencana Materi */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs tracking-tight">
                <FileText className="size-4" />
                <span>DESKRIPSI & MATERI AJAR</span>
              </div>
              <div className="rounded-md border bg-muted/30 p-3.5 text-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {material.description || "Belum ada rincian materi yang ditambahkan."}
              </div>
            </div>

            {/* Langkah & Catatan Ajar */}
            {material.notes ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-tight">
                  <Lightbulb className="size-4" />
                  <span>LANGKAH & CATATAN UNTUK PENGAJAR</span>
                </div>
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3.5 text-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                  {material.notes}
                </div>
              </div>
            ) : null}

            {/* Panduan Pembelajaran */}
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-start gap-2 bg-background">
              <BookOpen className="size-4 shrink-0 text-primary mt-0.5" />
              <p>
                Gunakan materi ini sebagai panduan dalam menyusun kegiatan pembelajaran. Pastikan setiap murid memahami capaian target sebelum melanjutkan ke materi berikutnya.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
