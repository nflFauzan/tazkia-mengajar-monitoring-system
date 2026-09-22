"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { ButtonLink } from "@/components/common/button-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatHariTanggal, formatTanggalSingkat } from "@/lib/dates";
import { selfCheckInAction } from "@/server/actions/attendance-self";
import type { PengajarSession } from "@/server/services/attendance-self";
import { AttendanceAppealDialog } from "./attendance-appeal-dialog";
import { StudentAttendanceDialog } from "./student-attendance-dialog";

interface SelfAttendancePanelProps {
  todaySessions: PengajarSession[];
  upcomingSessions: PengajarSession[];
  recentHistory: Array<{
    id: string;
    activityId?: string;
    date: Date;
    locationName: string;
    startTime: string;
    endTime: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    checkedInAt: Date | null;
    note: string | null;
    appealStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
    appealReason?: string | null;
    appealAdminNote?: string | null;
  }>;
}

export function SelfAttendancePanel({
  todaySessions,
  upcomingSessions,
  recentHistory,
}: SelfAttendancePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<PengajarSession | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState<"IZIN" | "SAKIT">("IZIN");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCheckIn(session: PengajarSession) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selfCheckInAction({
        activityId: session.activityId,
        scheduleId: session.scheduleId,
        dateStr: session.dateStr,
        startTime: session.startTime,
        attendance: "HADIR",
      });

      if (result.ok) {
        toast.success("Presensi Hadir berhasil dicatat!");
        router.refresh();
      } else {
        setErrorMessage(result.error ?? "Gagal mencatat presensi.");
      }
    });
  }

  function openLeaveDialog(
    session: PengajarSession,
    type: "IZIN" | "SAKIT",
  ) {
    setActiveSession(session);
    setSelectedType(type);
    setNote("");
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function submitLeave() {
    if (!activeSession) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await selfCheckInAction({
        activityId: activeSession.activityId,
        scheduleId: activeSession.scheduleId,
        dateStr: activeSession.dateStr,
        startTime: activeSession.startTime,
        attendance: selectedType,
        note: note.trim() || undefined,
      });

      if (result.ok) {
        toast.success(
          `Pengajuan ${selectedType === "IZIN" ? "Izin" : "Sakit"} berhasil dicatat!`,
        );
        setDialogOpen(false);
        router.refresh();
      } else {
        setErrorMessage(result.error ?? "Gagal menyimpan pengajuan.");
      }
    });
  }

  function formatTime(date: Date | null) {
    if (!date) return null;
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));
  }

  const uniqueLocations = Array.from(
    new Set(todaySessions.map((s) => s.locationName)),
  );
  const visibleTodaySessions =
    selectedLocationFilter === "ALL"
      ? todaySessions
      : todaySessions.filter((s) => s.locationName === selectedLocationFilter);

  return (
    <div className="space-y-8">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Sesi Hari Ini */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg tracking-tight">
              Kegiatan Hari Ini
            </h2>
            <p className="text-muted-foreground text-xs">
              Presensi mandiri kegiatan belajar-mengajar Anda hari ini.
            </p>
          </div>
        </div>

        {uniqueLocations.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-xs text-muted-foreground mr-1">Pilih Tempat:</span>
            <Button
              variant={selectedLocationFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLocationFilter("ALL")}
              className="h-7 text-xs"
            >
              Semua ({todaySessions.length})
            </Button>
            {uniqueLocations.map((loc) => (
              <Button
                key={loc}
                variant={selectedLocationFilter === loc ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLocationFilter(loc)}
                className="h-7 text-xs"
              >
                {loc}
              </Button>
            ))}
          </div>
        ) : null}

        {visibleTodaySessions.length === 0 ? (
          <div className="border-border rounded-lg border-2 border-dashed p-6 text-center shadow-[var(--shadow-brutal-sm)]">
            <p className="text-sm font-medium">
              Tidak ada jadwal mengajar untuk lokasi ini hari ini.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Jadwal mengajar berikutnya dapat dilihat pada bagian Jadwal Mendatang di bawah.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleTodaySessions.map((session) => (
              <div
                key={session.key}
                className="bg-card border-border rounded-lg border-2 p-5 shadow-[var(--shadow-brutal)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-base tracking-tight">
                        {session.title}
                      </h3>
                      <p className="text-muted-foreground flex items-center gap-1.5 text-xs mt-0.5">
                        <MapPin className="size-3.5" />
                        {session.locationName}
                      </p>
                    </div>

                    {session.currentAttendance ? (
                      <Badge
                        variant={
                          session.currentAttendance === "HADIR"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          session.currentAttendance === "HADIR"
                            ? "bg-green-600 text-white"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {session.currentAttendance}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-dashed">
                        Belum Absen
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">
                        Waktu Kegiatan
                      </span>
                      <span className="font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {session.startTime} - {session.endTime} WIB
                      </span>
                    </div>

                    <div className="bg-muted/50 rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">
                        Status Presensi
                      </span>
                      <span className="font-semibold block mt-0.5">
                        {session.currentAttendance === "HADIR" &&
                        session.checkedInAt
                          ? `Check-in: ${formatTime(session.checkedInAt)} WIB`
                          : session.currentAttendance ?? "Belum Dicatat"}
                      </span>
                    </div>
                  </div>

                  {session.note ? (
                    <p className="text-muted-foreground mt-3 text-xs italic bg-muted/30 rounded p-2 border">
                      Keterangan: &ldquo;{session.note}&rdquo;
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      disabled={isPending || session.currentAttendance === "HADIR"}
                      onClick={() => handleCheckIn(session)}
                      className="gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      {session.currentAttendance === "HADIR"
                        ? "Sudah Hadir"
                        : "Hadir Sekarang"}
                    </Button>

                    <StudentAttendanceDialog
                      sessionKey={session.key}
                      sessionTitle={session.title}
                      locationName={session.locationName}
                      dateStr={session.dateStr}
                      studentAttendanceCount={session.studentAttendanceCount}
                    />

                    {session.activityId ? (
                      <ButtonLink
                        href={`/kegiatan/${session.activityId}`}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                      >
                        <FileText className="size-3.5" />
                        Dokumentasi & Laporan
                      </ButtonLink>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending || !session.canRequestIzin}
                      onClick={() => openLeaveDialog(session, "IZIN")}
                      title={
                        !session.canRequestIzin
                          ? "Batas izin mandiri (minimal 5 jam sebelum kegiatan) telah lewat."
                          : "Ajukan Izin"
                      }
                    >
                      Izin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending || !session.canRequestIzin}
                      onClick={() => openLeaveDialog(session, "SAKIT")}
                      title={
                        !session.canRequestIzin
                          ? "Batas sakit mandiri (minimal 5 jam sebelum kegiatan) telah lewat."
                          : "Ajukan Sakit"
                      }
                    >
                      Sakit
                    </Button>
                  </div>
                </div>

                {!session.canRequestIzin && session.currentAttendance !== "HADIR" ? (
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    * Sisa waktu kurang dari 5 jam. Untuk izin/sakit, silakan hubungi Admin secara langsung.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Jadwal Mendatang */}
      {upcomingSessions.length > 0 ? (
        <section>
          <div className="mb-3">
            <h2 className="font-heading text-lg tracking-tight">
              Jadwal Mengajar Mendatang
            </h2>
            <p className="text-muted-foreground text-xs">
              Sesi mengajar berikutnya. Anda dapat mengajukan izin/sakit paling lambat 5 jam sebelum kegiatan dimulai.
            </p>
          </div>

          <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hari, Tanggal</TableHead>
                  <TableHead>Tempat</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status Saat Ini</TableHead>
                  <TableHead className="w-32 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingSessions.map((session) => (
                  <TableRow key={session.key}>
                    <TableCell className="font-medium">
                      {formatHariTanggal(session.date)}
                    </TableCell>
                    <TableCell>{session.locationName}</TableCell>
                    <TableCell>
                      {session.startTime} - {session.endTime} WIB
                    </TableCell>
                    <TableCell>
                      {session.currentAttendance ? (
                        <Badge variant="secondary">
                          {session.currentAttendance}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.canRequestIzin ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => openLeaveDialog(session, "IZIN")}
                          >
                            Izin
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => openLeaveDialog(session, "SAKIT")}
                          >
                            Sakit
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Terkunci (&lt;5 jam)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {/* Riwayat Absensi Terakhir */}
      <section>
        <div className="mb-3">
          <h2 className="font-heading text-lg tracking-tight">
            Riwayat Presensi Terakhir
          </h2>
          <p className="text-muted-foreground text-xs">
            10 catatan presensi kegiatan Anda sebelumnya.
          </p>
        </div>

        {recentHistory.length === 0 ? (
          <div className="border-border rounded-lg border-2 border-dashed p-6 text-center shadow-[var(--shadow-brutal-sm)]">
            <p className="text-sm font-medium">Belum ada riwayat presensi.</p>
          </div>
        ) : (
          <div className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tempat</TableHead>
                  <TableHead>Kehadiran</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Waktu Check-in
                  </TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Banding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {formatTanggalSingkat(item.date)}
                    </TableCell>
                    <TableCell>{item.locationName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.attendance === "HADIR"
                            ? "default"
                            : item.attendance === "ALPA"
                              ? "destructive"
                              : "secondary"
                        }
                        className={
                          item.attendance === "HADIR"
                            ? "bg-green-600 text-white"
                            : item.attendance === "ALPA"
                              ? "bg-red-600 text-white"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {item.attendance}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell text-xs">
                      {item.checkedInAt
                        ? `${formatTime(item.checkedInAt)} WIB`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.attendance === "ALPA" && item.activityId ? (
                        <AttendanceAppealDialog
                          activityId={item.activityId}
                          locationName={item.locationName}
                          dateStr={formatTanggalSingkat(item.date)}
                          appealStatus={item.appealStatus}
                          appealReason={item.appealReason}
                          appealAdminNote={item.appealAdminNote}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Dialog Izin / Sakit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ajukan {selectedType === "IZIN" ? "Izin" : "Sakit"}
            </DialogTitle>
            <DialogDescription>
              {activeSession ? (
                <>
                  Kegiatan di <strong>{activeSession.locationName}</strong> pada{" "}
                  <strong>{formatHariTanggal(activeSession.date)}</strong> pukul{" "}
                  <strong>{activeSession.startTime} WIB</strong>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="leaveNote">
                Alasan / Keterangan{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (opsional)
                </span>
              </Label>
              <Textarea
                id="leaveNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Tuliskan alasan ${selectedType.toLowerCase()} Anda...`}
                rows={3}
                disabled={isPending}
              />
            </div>

            <p className="text-muted-foreground text-xs">
              * Pengajuan izin/sakit mandiri wajib dilakukan maksimal 5 jam sebelum waktu kegiatan dimulai untuk keperluan koordinasi personil tim.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={submitLeave}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
