"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatTanggalSingkat } from "@/lib/dates";
import {
  deleteStudentAssessmentAction,
  getStudentAssessmentsAction,
  saveStudentAssessmentAction,
} from "@/server/actions/student-assessments";
import type { StudentAssessmentItem } from "@/server/services/student-assessments";

export interface MaterialOption {
  id: string;
  title: string;
  meetingLabel: string | null;
  curriculumName: string;
}

interface StudentAssessmentDialogProps {
  studentId: string;
  studentName: string;
  groupName: string;
  materials: MaterialOption[];
}

const STATUS_OPTIONS = [
  { value: "Tuntas", label: "Tuntas", color: "bg-green-600 text-white" },
  { value: "Lancar", label: "Lancar", color: "bg-blue-600 text-white" },
  { value: "Cukup", label: "Cukup", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { value: "Perlu Bimbingan", label: "Perlu Bimbingan", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
];

export function StudentAssessmentDialog({
  studentId,
  studentName,
  groupName,
  materials,
}: StudentAssessmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assessments, setAssessments] = useState<StudentAssessmentItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("CUSTOM");
  const [customTitle, setCustomTitle] = useState("");
  const [status, setStatus] = useState("Tuntas");
  const [notes, setNotes] = useState("");

  async function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      setLoadingHistory(true);
      const res = await getStudentAssessmentsAction(studentId);
      if (res.ok) {
        setAssessments(res.data);
      }
      setLoadingHistory(false);
    }
  }

  function handleSave() {
    const isCustom = selectedMaterialId === "CUSTOM";
    if (isCustom && !customTitle.trim()) {
      toast.error("Mohon isi judul materi atau topik capaian.");
      return;
    }

    startTransition(async () => {
      const res = await saveStudentAssessmentAction({
        studentId,
        materialId: isCustom ? null : selectedMaterialId,
        customTitle: isCustom ? customTitle.trim() : null,
        status,
        notes: notes.trim() || null,
      });

      if (res.ok) {
        toast.success("Penilaian capaian berhasil disimpan!");
        // Refresh local history
        const updated = await getStudentAssessmentsAction(studentId);
        if (updated.ok) {
          setAssessments(updated.data);
        }
        // Reset form
        setCustomTitle("");
        setNotes("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal menyimpan capaian.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteStudentAssessmentAction(id);
      if (res.ok) {
        toast.success("Penilaian berhasil dihapus.");
        setAssessments((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal menghapus penilaian.");
      }
    });
  }

  function getStatusBadge(statusVal: string) {
    const found = STATUS_OPTIONS.find((s) => s.value === statusVal);
    if (found) {
      return <Badge className={found.color}>{found.label}</Badge>;
    }
    return <Badge variant="secondary">{statusVal}</Badge>;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        className="h-8 text-xs gap-1.5"
      >
        <Award className="size-3.5 text-primary" />
        <span>Nilai Capaian</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {groupName}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-heading tracking-tight flex items-center gap-2">
              <Award className="size-5 text-primary" />
              Penilaian & Capaian Murid: {studentName}
            </DialogTitle>
            <DialogDescription>
              Catat kemajuan dan penguasaan materi kurikulum oleh murid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Form Input Penilaian Baru */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight text-primary">
                <Plus className="size-4" />
                <span>INPUT CAPAIAN BARU</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="materialSelect" className="text-xs">
                  Materi Kurikulum
                </Label>
                <Select
                  value={selectedMaterialId}
                  onValueChange={(val) => setSelectedMaterialId(val ?? "CUSTOM")}
                  disabled={isPending}
                >
                  <SelectTrigger id="materialSelect" className="bg-background">
                    <SelectValue placeholder="Pilih materi kurikulum..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOM">
                      &mdash; Materi / Topik Lain (Manual) &mdash;
                    </SelectItem>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        [{m.curriculumName}] {m.meetingLabel ? `${m.meetingLabel} - ` : ""}{m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMaterialId === "CUSTOM" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="customTitle" className="text-xs">
                    Nama Topik / Materi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customTitle"
                    placeholder="Contoh: Hafalan Surat Al-Fatihah, Membaca Iqro 2 Hal 10..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    disabled={isPending}
                    className="bg-background text-xs"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label className="text-xs">Tingkat Penguasaan / Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isPending}
                      onClick={() => setStatus(opt.value)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all font-medium ${
                        status === opt.value
                          ? "ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground font-semibold"
                          : "bg-background hover:bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">
                  Catatan Pengajar <span className="text-muted-foreground font-normal text-[11px]">(opsional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan kemajuan atau hal yang perlu ditingkatkan oleh murid..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={isPending}
                  className="bg-background text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="gap-1.5 text-xs h-8"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  Simpan Penilaian
                </Button>
              </div>
            </div>

            {/* Riwayat Capaian Sebelumnya */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-muted-foreground tracking-tight flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  RIWAYAT CAPAIAN PEMBELAJARAN ({assessments.length})
                </h4>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center p-6 text-muted-foreground text-xs">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Memuat riwayat capaian...
                </div>
              ) : assessments.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Belum ada catatan capaian untuk murid ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {assessments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border bg-card p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm">
                            {item.materialTitle ?? item.customTitle}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>

                        {item.notes ? (
                          <p className="text-muted-foreground italic bg-muted/40 p-2 rounded text-[11px]">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        ) : null}

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {item.assessedByName}
                          </span>
                          <span>&bull;</span>
                          <span>{formatTanggalSingkat(item.createdAt)}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        title="Hapus penilaian"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
