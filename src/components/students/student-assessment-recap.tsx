"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Layers,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTanggalSingkat } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { StudentAssessmentRecapItem } from "@/server/services/student-assessments";
import {
  StudentAssessmentDialog,
  type MaterialOption,
} from "./student-assessment-dialog";

interface StudentAssessmentRecapProps {
  students: StudentAssessmentRecapItem[];
  totalStudents: number;
  totalCompletedAssessments: number;
  averageProgressPercent: number;
  materials: MaterialOption[];
  isAdmin?: boolean;
}

export function StudentAssessmentRecap({
  students,
  totalStudents,
  totalCompletedAssessments,
  averageProgressPercent,
  materials,
}: StudentAssessmentRecapProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.groupName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border-2 border-border rounded-lg p-3.5 shadow-[var(--shadow-brutal-sm)] flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <UsersRound className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Total Murid Binaan</p>
            <p className="font-heading text-xl font-bold tracking-tight text-foreground">
              {totalStudents} <span className="text-xs font-normal text-muted-foreground">anak</span>
            </p>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-lg p-3.5 shadow-[var(--shadow-brutal-sm)] flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Materi Tuntas/Lancar</p>
            <p className="font-heading text-xl font-bold tracking-tight text-foreground">
              {totalCompletedAssessments} <span className="text-xs font-normal text-muted-foreground">capaian</span>
            </p>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-lg p-3.5 shadow-[var(--shadow-brutal-sm)] flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Award className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Rata-rata Ketuntasan</p>
            <p className="font-heading text-xl font-bold tracking-tight text-foreground">
              {averageProgressPercent}% <span className="text-xs font-normal text-muted-foreground">kurikulum</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari murid, tempat, atau kelompok..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card border-2"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-2">
          <GraduationCap className="size-8 text-muted-foreground/50 mx-auto" />
          <p className="font-medium text-sm">Tidak ada data capaian murid ditemukan.</p>
          <p className="text-xs text-muted-foreground">
            {searchTerm
              ? "Coba kata kunci pencarian yang lain."
              : "Belum ada murid binaan atau penilaian yang dicatat."}
          </p>
        </div>
      ) : (
        <div className="border-2 border-border rounded-lg shadow-[var(--shadow-brutal)] overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[30%]">Murid</TableHead>
                <TableHead className="w-[20%]">Tempat & Kelompok</TableHead>
                <TableHead className="w-[25%]">Progres Kurikulum</TableHead>
                <TableHead className="w-[15%]">Capaian Terakhir</TableHead>
                <TableHead className="w-[10%] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const percent = Math.min(
                  100,
                  Math.round(
                    (s.completedMaterialsCount / s.targetMaterialsCount) * 100,
                  ),
                );

                return (
                  <TableRow key={s.studentId}>
                    <TableCell>
                      <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                        <span>{s.studentName}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4 border-muted-foreground/30"
                        >
                          {s.studentGender === "LAKI_LAKI" ? "L" : "P"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.totalAssessments} kali dinilai
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <MapPin className="size-3 text-primary shrink-0" />
                        <span className="truncate">{s.locationName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Layers className="size-3 shrink-0" />
                        <span>{s.groupName}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {s.completedMaterialsCount}{" "}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              / {s.targetMaterialsCount} Materi
                            </span>
                          </span>
                          <span className="font-bold text-[11px] text-primary">
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              percent >= 80
                                ? "bg-emerald-500"
                                : percent >= 40
                                  ? "bg-primary"
                                  : "bg-amber-500",
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {s.lastAssessment ? (
                        <div className="space-y-0.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 font-semibold",
                              s.lastAssessment.status === "Tuntas" &&
                                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                              s.lastAssessment.status === "Lancar" &&
                                "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
                              s.lastAssessment.status === "Cukup" &&
                                "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                              s.lastAssessment.status === "Perlu Bimbingan" &&
                                "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
                            )}
                          >
                            {s.lastAssessment.status}
                          </Badge>
                          <p className="text-[11px] font-medium text-foreground truncate max-w-[140px]">
                            {s.lastAssessment.materialTitle}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatTanggalSingkat(s.lastAssessment.createdAt)} · {s.lastAssessment.assessedByName}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Belum dinilai
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <StudentAssessmentDialog
                        studentId={s.studentId}
                        studentName={s.studentName}
                        groupName={s.groupName}
                        materials={materials}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
