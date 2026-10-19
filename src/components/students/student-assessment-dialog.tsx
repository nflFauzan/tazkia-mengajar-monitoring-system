"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { formatTanggalSingkat } from "@/lib/dates";
import { cn } from "@/lib/utils";
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
  periodName?: string | null;
  objective?: string | null;
}

interface StudentAssessmentDialogProps {
  studentId: string;
  studentName: string;
  groupName: string;
  materials: MaterialOption[];
}

const STATUS_OPTIONS = [
  {
    value: "Tuntas",
    label: "Tuntas",
    activeClass: "bg-emerald-600 text-white ring-2 ring-emerald-600/30",
    badgeClass: "bg-emerald-600 text-white",
  },
  {
    value: "Lancar",
    label: "Lancar",
    activeClass: "bg-blue-600 text-white ring-2 ring-blue-600/30",
    badgeClass: "bg-blue-600 text-white",
  },
  {
    value: "Cukup",
    label: "Cukup",
    activeClass: "bg-amber-600 text-white ring-2 ring-amber-600/30",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  {
    value: "Perlu Bimbingan",
    label: "Perlu Bimbingan",
    activeClass: "bg-rose-600 text-white ring-2 ring-rose-600/30",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
];

export function StudentAssessmentDialog({
  studentId,
  studentName,
  groupName,
  materials = [],
}: StudentAssessmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assessments, setAssessments] = useState<StudentAssessmentItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Mode: CURRICULUM vs CUSTOM
  const [mode, setMode] = useState<"CURRICULUM" | "CUSTOM">(
    materials.length > 0 ? "CURRICULUM" : "CUSTOM"
  );

  // Form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    materials[0]?.id ?? null
  );
  const [selectedMeeting, setSelectedMeeting] = useState<string>("ALL");
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [status, setStatus] = useState("Tuntas");
  const [notes, setNotes] = useState("");

  // Extract unique meeting labels sorted naturally (e.g. Pertemuan 1, Pertemuan 2, ...)
  const meetingOptions = useMemo(() => {
    const set = new Set<string>();
    let hasNoMeeting = false;
    for (const m of materials) {
      if (m.meetingLabel) {
        set.add(m.meetingLabel);
      } else {
        hasNoMeeting = true;
      }
    }
    const sorted = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
    return {
      meetings: sorted,
      hasNoMeeting,
    };
  }, [materials]);

  // Extract unique curriculum names
  const curriculumOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of materials) {
      if (m.curriculumName) {
        set.add(m.curriculumName);
      }
    }
    return Array.from(set).sort();
  }, [materials]);

  // Filtered materials based on meeting filter, curriculum filter, and search text
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedMeeting !== "ALL") {
        if (selectedMeeting === "UNASSIGNED") {
          if (m.meetingLabel) return false;
        } else if (m.meetingLabel !== selectedMeeting) {
          return false;
        }
      }

      if (selectedCurriculum !== "ALL" && m.curriculumName !== selectedCurriculum) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchMeeting = m.meetingLabel?.toLowerCase().includes(q);
        const matchObj = m.objective?.toLowerCase().includes(q);
        const matchCurriculum = m.curriculumName.toLowerCase().includes(q);
        if (!matchTitle && !matchMeeting && !matchObj && !matchCurriculum) {
          return false;
        }
      }

      return true;
    });
  }, [materials, selectedMeeting, selectedCurriculum, searchQuery]);

  // Find currently selected material
  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId) return null;
    return materials.find((m) => m.id === selectedMaterialId) ?? null;
  }, [materials, selectedMaterialId]);

  function handleSelectMeeting(meeting: string) {
    setSelectedMeeting(meeting);
    if (meeting !== "ALL") {
      const firstInMeeting = materials.find((m) =>
        meeting === "UNASSIGNED" ? !m.meetingLabel : m.meetingLabel === meeting
      );
      if (firstInMeeting) {
        setSelectedMaterialId(firstInMeeting.id);
      }
    }
  }

  function handlePrevMeeting() {
    if (selectedMeeting === "ALL") return;
    const currentIndex = meetingOptions.meetings.indexOf(selectedMeeting);
    if (currentIndex > 0) {
      handleSelectMeeting(meetingOptions.meetings[currentIndex - 1]);
    } else if (currentIndex === 0) {
      handleSelectMeeting("ALL");
    }
  }

  function handleNextMeeting() {
    if (selectedMeeting === "ALL") {
      if (meetingOptions.meetings.length > 0) {
        handleSelectMeeting(meetingOptions.meetings[0]);
      }
      return;
    }
    const currentIndex = meetingOptions.meetings.indexOf(selectedMeeting);
    if (currentIndex < meetingOptions.meetings.length - 1) {
      handleSelectMeeting(meetingOptions.meetings[currentIndex + 1]);
    }
  }

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
    if (mode === "CUSTOM") {
      if (!customTitle.trim()) {
        toast.error("Mohon isi nama topik atau materi capaian.");
        return;
      }
    } else {
      if (!selectedMaterialId) {
        toast.error("Mohon pilih salah satu materi kurikulum.");
        return;
      }
    }

    startTransition(async () => {
      const res = await saveStudentAssessmentAction({
        studentId,
        materialId: mode === "CURRICULUM" ? selectedMaterialId : null,
        customTitle: mode === "CUSTOM" ? customTitle.trim() : null,
        status,
        notes: notes.trim() || null,
      });

      if (res.ok) {
        toast.success("Penilaian capaian berhasil disimpan!");
        const updated = await getStudentAssessmentsAction(studentId);
        if (updated.ok) {
          setAssessments(updated.data);
        }
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
      return <Badge className={found.badgeClass}>{found.label}</Badge>;
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pr-7 space-y-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-xs">
                {groupName}
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-heading tracking-tight flex items-start sm:items-center gap-2">
              <Award className="size-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
              <span className="break-words">Penilaian & Capaian Murid: {studentName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Catat kemajuan dan penguasaan materi kurikulum oleh murid secara berkala.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Form Input Penilaian Baru */}
            <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-3.5 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-primary/15">
                <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider text-primary uppercase">
                  <Plus className="size-4" />
                  <span>Input Capaian Baru</span>
                </div>

                {/* Tab Mode: Kurikulum vs Manual (Responsive Grid on Mobile) */}
                <div className="grid grid-cols-2 p-1 bg-background border border-border/80 rounded-lg text-xs w-full sm:w-auto gap-1">
                  <button
                    type="button"
                    onClick={() => setMode("CURRICULUM")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all text-center",
                      mode === "CURRICULUM"
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <BookOpen className="size-3.5 shrink-0" />
                    <span className="truncate">Kurikulum</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("CUSTOM")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all text-center",
                      mode === "CUSTOM"
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <PenLine className="size-3.5 shrink-0" />
                    <span className="truncate">Topik Bebas</span>
                  </button>
                </div>
              </div>

              {mode === "CURRICULUM" ? (
                <div className="space-y-3 min-w-0">
                  {materials.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Belum ada materi kurikulum aktif. Silakan gunakan opsi Topik Bebas.
                    </div>
                  ) : (
                    <>
                      {/* Filter Bar: Dropdown Pertemuan & Kolom Pencarian */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Dropdown Pertemuan */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                <Layers className="size-3.5 text-primary" />
                                <span>Pilih Pertemuan:</span>
                              </Label>
                              {selectedMeeting !== "ALL" && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectMeeting("ALL")}
                                  className="text-[11px] text-primary hover:underline font-medium"
                                >
                                  Lihat Semua ({materials.length})
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 w-full min-w-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  selectedMeeting === "ALL" ||
                                  meetingOptions.meetings.indexOf(selectedMeeting) <= 0
                                }
                                onClick={handlePrevMeeting}
                                className="h-9 w-8 p-0 shrink-0 bg-background"
                                title="Pertemuan sebelumnya"
                              >
                                <ChevronLeft className="size-4" />
                              </Button>

                              <div className="relative flex-1 min-w-0">
                                <select
                                  value={selectedMeeting}
                                  onChange={(e) =>
                                    handleSelectMeeting(e.target.value)
                                  }
                                  className="w-full h-9 rounded-lg border border-input bg-background pl-2.5 pr-7 text-xs font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 truncate cursor-pointer appearance-none"
                                >
                                  <option value="ALL">
                                    Semua Pertemuan ({materials.length} materi)
                                  </option>
                                  {meetingOptions.meetings.map((meeting) => {
                                    const matching = materials.filter(
                                      (m) => m.meetingLabel === meeting
                                    );
                                    const count = matching.length;
                                    const titleHint =
                                      count === 1
                                        ? ` — ${matching[0].title}`
                                        : ` (${count} materi)`;
                                    return (
                                      <option key={meeting} value={meeting}>
                                        {meeting}{titleHint}
                                      </option>
                                    );
                                  })}
                                  {meetingOptions.hasNoMeeting && (
                                    <option value="UNASSIGNED">
                                      Umum / Tanpa Pertemuan
                                    </option>
                                  )}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  selectedMeeting !== "ALL" &&
                                  meetingOptions.meetings.indexOf(selectedMeeting) >=
                                    meetingOptions.meetings.length - 1
                                }
                                onClick={handleNextMeeting}
                                className="h-9 w-8 p-0 shrink-0 bg-background"
                                title="Pertemuan berikutnya"
                              >
                                <ChevronRight className="size-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Search Input */}
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                              <Search className="size-3.5 text-primary" />
                              <span>Cari Materi:</span>
                            </Label>
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Cari judul materi (wudhu, adab, sholat)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-7 h-9 text-xs bg-background w-full"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                  title="Hapus pencarian"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {curriculumOptions.length > 1 && (
                          <div className="pt-0.5">
                            <div className="relative w-full">
                              <select
                                value={selectedCurriculum}
                                onChange={(e) =>
                                  setSelectedCurriculum(e.target.value)
                                }
                                className="w-full h-8 rounded-lg border border-input bg-background pl-2.5 pr-7 text-xs font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 truncate cursor-pointer appearance-none"
                              >
                                <option value="ALL">Semua Kurikulum</option>
                                {curriculumOptions.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Daftar Kartu Materi yang Tersedia */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground text-[11px]">
                            {selectedMeeting !== "ALL"
                              ? `Materi pada ${selectedMeeting}:`
                              : "Daftar Semua Materi Kurikulum:"}
                          </span>
                          <span className="text-[11px]">
                            {filteredMaterials.length} materi tersedia
                          </span>
                        </div>

                        {filteredMaterials.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground space-y-2 bg-background/50">
                            <p>Tidak ada materi yang sesuai dengan pencarian atau filter.</p>
                            {(selectedMeeting !== "ALL" || searchQuery) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeeting("ALL");
                                  setSearchQuery("");
                                }}
                                className="h-7 text-xs"
                              >
                                Tampilkan Semua Materi
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                            {filteredMaterials.map((m) => {
                              const isSelected = selectedMaterialId === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setSelectedMaterialId(m.id)}
                                  className={cn(
                                    "w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2.5 group min-w-0",
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                                      : "bg-background border-border hover:border-primary/50 hover:bg-muted/40"
                                  )}
                                >
                                  <div className="min-w-0 space-y-1 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {m.meetingLabel ? (
                                        <Badge
                                          variant={isSelected ? "default" : "secondary"}
                                          className="text-[10px] px-1.5 py-0 h-4 font-semibold tracking-wide shrink-0"
                                        >
                                          {m.meetingLabel}
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                                        >
                                          Umum
                                        </Badge>
                                      )}
                                      <span
                                        className={cn(
                                          "text-xs font-semibold leading-tight break-words",
                                          isSelected ? "text-primary" : "text-foreground"
                                        )}
                                      >
                                        {m.title}
                                      </span>
                                    </div>

                                    {m.objective ? (
                                      <p className="text-[11px] text-muted-foreground line-clamp-2 italic break-words">
                                        Tujuan: {m.objective}
                                      </p>
                                    ) : null}

                                    <div className="text-[10px] text-muted-foreground/80 flex flex-wrap items-center gap-1.5">
                                      <span className="truncate">{m.curriculumName}</span>
                                      {m.periodName ? (
                                        <>
                                          <span>&bull;</span>
                                          <span>{m.periodName}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="shrink-0 mt-0.5">
                                    {isSelected ? (
                                      <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                        <Check className="size-3 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="size-5 rounded-full border border-border group-hover:border-primary/50" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 4. Banner Konfirmasi Materi Terpilih */}
                      {selectedMaterial && (
                        <div className="rounded-lg bg-background border border-primary/40 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs shadow-xs min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle2 className="size-4 text-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Materi Terpilih:
                              </span>
                              <span className="font-bold text-foreground text-xs truncate block">
                                {selectedMaterial.meetingLabel
                                  ? `${selectedMaterial.meetingLabel}: `
                                  : ""}
                                {selectedMaterial.title}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] self-start sm:self-auto shrink-0 max-w-full truncate">
                            {selectedMaterial.curriculumName}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Mode Topik Mandiri / Bebas */
                <div className="space-y-2 min-w-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="customTitle" className="text-xs font-semibold">
                      Nama Topik / Materi yang Dinilai <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customTitle"
                      placeholder="Contoh: Hafalan Surat An-Nas, Membaca Iqro 3 Hal 15..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      disabled={isPending}
                      className="bg-background text-xs w-full"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan mode ini jika materi yang dinilai di luar matriks kurikulum utama, atau merupakan evaluasi hafalan/target individual murid.
                  </p>
                </div>
              )}

              {/* Tingkat Penguasaan / Status */}
              <div className="space-y-1.5 pt-1 border-t border-border/40 min-w-0">
                <Label className="text-xs font-semibold">Tingkat Penguasaan / Status</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isPending}
                        onClick={() => setStatus(opt.value)}
                        className={cn(
                          "px-2.5 py-2 text-xs rounded-lg border transition-all font-semibold flex items-center justify-center gap-1.5 text-center min-w-0",
                          isSelected
                            ? opt.activeClass
                            : "bg-background hover:bg-muted text-foreground border-border"
                        )}
                      >
                        {isSelected && <Sparkles className="size-3 shrink-0" />}
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catatan Pengajar */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold">
                  Catatan Pengajar{" "}
                  <span className="text-muted-foreground font-normal text-[11px]">
                    (opsional)
                  </span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan kemajuan, evaluasi bacaan/hafalan, atau hal yang perlu ditingkatkan oleh murid..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={isPending}
                  className="bg-background text-xs"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="gap-1.5 text-xs h-9 px-4 font-bold shadow-xs"
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
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/20">
                  Belum ada catatan capaian untuk murid ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {assessments.map((item) => {
                    const hasMeeting = item.materialTitle?.includes(" — ");
                    const meetingPart = hasMeeting
                      ? item.materialTitle?.split(" — ")[0]
                      : null;
                    const titlePart = hasMeeting
                      ? item.materialTitle?.split(" — ").slice(1).join(" — ")
                      : item.materialTitle;

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {meetingPart ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 font-semibold text-primary border-primary/40 bg-primary/5"
                              >
                                {meetingPart}
                              </Badge>
                            ) : item.customTitle ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4"
                              >
                                Topik Bebas
                              </Badge>
                            ) : null}

                            <span className="font-bold text-foreground text-xs sm:text-sm">
                              {titlePart ?? item.customTitle}
                            </span>

                            {getStatusBadge(item.status)}
                          </div>

                          {item.notes ? (
                            <p className="text-muted-foreground italic bg-muted/40 p-2 rounded text-[11px] border border-border/40">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          ) : null}

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <User className="size-3" />
                              {item.assessedByName}
                            </span>
                            <span>&bull;</span>
                            <span>{formatTanggalSingkat(item.createdAt)}</span>
                            {item.curriculumName && (
                              <>
                                <span>&bull;</span>
                                <span className="text-[10px] text-muted-foreground/80">
                                  {item.curriculumName}
                                </span>
                              </>
                            )}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
