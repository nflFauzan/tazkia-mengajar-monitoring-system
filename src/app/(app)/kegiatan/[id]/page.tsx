import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ActivityActions } from "@/components/activities/activity-actions";
import { ActivityInfoForm } from "@/components/activities/activity-info-form";
import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { ActivityStepper } from "@/components/activities/activity-stepper";
import { AttendanceEditor } from "@/components/activities/attendance-editor";
import { DocumentationPanel } from "@/components/activities/documentation-panel";
import { MaterialPicker } from "@/components/activities/material-picker";
import { ReportPanel } from "@/components/activities/report-panel";
import { ButtonLink } from "@/components/common/button-link";
import { PageHeader } from "@/components/common/page-shell";
import { requireUser } from "@/lib/auth/session";
import {
  formatHariTanggal,
  formatTimeRange,
  toDateInputValue,
} from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import { isWizardStep } from "@/lib/wizard-steps";
import { generateActivityReport, toReportInput } from "@/lib/reports";
import {
  saveActivityStudentsAction,
  saveActivityTeamAction,
} from "@/server/actions/activities";
import {
  ATTENDANCE_LABELS,
  checkBeneficiaryConsistency,
  tallyAttendance,
} from "@/server/services/attendance";

export const metadata: Metadata = { title: "Detail Kegiatan" };

export default async function ActivityDetailPage({
  params,
  searchParams,
}: PageProps<"/kegiatan/[id]">) {
  await requireUser();

  const { id } = await params;
  const query = await searchParams;
  const stepParam = typeof query.step === "string" ? query.step : undefined;
  const step = isWizardStep(stepParam) ? stepParam : "review";

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      location: { select: { id: true, name: true, address: true } },
      teamMembers: {
        orderBy: { orderIndex: "asc" },
        select: {
          teamMemberId: true,
          attendance: true,
          note: true,
          orderIndex: true,
          teamMember: { select: { fullName: true, status: true } },
        },
      },
      students: {
        select: {
          studentId: true,
          attendance: true,
          note: true,
          student: {
            select: { fullName: true, studentGroup: { select: { name: true } } },
          },
        },
      },
      materials: {
        select: {
          materialId: true,
          material: {
            select: {
              title: true,
              meetingLabel: true,
              period: {
                select: { name: true, curriculum: { select: { name: true } } },
              },
            },
          },
        },
      },
      documents: { orderBy: { createdAt: "asc" } },
      report: true,
      _count: { select: { documents: true } },
    },
  });

  if (!activity) notFound();

  const generated = generateActivityReport(toReportInput(activity), {
    existingNarrative: activity.report?.narrative,
  });

  const studentWarning = checkBeneficiaryConsistency(
    activity.beneficiaryCount,
    activity.students,
  );

  const completed = {
    informasi: true,
    tim: activity.teamMembers.length > 0,
    murid: activity.students.length > 0,
    kurikulum: activity.materials.length > 0,
    dokumentasi: activity.documents.length > 0,
    review: false,
    laporan: activity.report !== null,
  };

  const isEditable = activity.status !== "CANCELLED";

  return (
    <>
      <PageHeader
        title={activity.location.name}
        description={`${formatHariTanggal(activity.date)} · ${formatTimeRange(activity.startTime, activity.endTime)}`}
        actions={
          <>
            <ActivityStatusBadge status={activity.status} />
            <ActivityActions activityId={activity.id} status={activity.status} />
          </>
        }
      />

      <ActivityStepper
        activityId={activity.id}
        current={step}
        completed={completed}
      />

      <div className="bg-card border-border rounded-lg border-2 p-4 shadow-[var(--shadow-brutal)] md:p-6">
        {step === "informasi" ? (
          <div className="max-w-2xl">
            <ActivityInfoForm
              locations={await prisma.location.findMany({
                where: { OR: [{ isActive: true }, { id: activity.locationId }] },
                orderBy: { name: "asc" },
                select: { id: true, name: true, partner: true },
              })}
              activity={{
                id: activity.id,
                locationId: activity.locationId,
                date: toDateInputValue(activity.date),
                startTime: activity.startTime,
                endTime: activity.endTime,
                partner: activity.partner,
                beneficiary: activity.beneficiary,
                beneficiaryCount: activity.beneficiaryCount,
                aidType: activity.aidType,
                notes: activity.notes,
              }}
            />
          </div>
        ) : null}

        {step === "tim" ? <TeamStep activityId={activity.id} entries={activity.teamMembers} /> : null}

        {step === "murid" ? (
          <StudentStep
            activityId={activity.id}
            locationId={activity.locationId}
            entries={activity.students}
            warning={studentWarning}
            beneficiaryCount={activity.beneficiaryCount}
          />
        ) : null}

        {step === "kurikulum" ? (
          <KurikulumStep
            activityId={activity.id}
            selectedIds={activity.materials.map((entry) => entry.materialId)}
          />
        ) : null}

        {step === "dokumentasi" ? (
          <DocumentationPanel
            activityId={activity.id}
            documents={activity.documents}
            readOnly={!isEditable}
          />
        ) : null}

        {step === "review" ? (
          <ReviewStep
            activity={activity}
            studentWarning={studentWarning}
            missing={generated.validation.missing}
          />
        ) : null}

        {step === "laporan" ? (
          <ReportPanel
            activityId={activity.id}
            report={
              activity.report
                ? {
                    content: activity.report.content,
                    narrative: activity.report.narrative,
                    narrativeEdited: activity.report.narrativeEdited,
                  }
                : null
            }
            checklist={generated.validation.checklist}
            isComplete={generated.validation.isComplete}
          />
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Steps that need their own query
// ---------------------------------------------------------------------------

async function TeamStep({
  activityId,
  entries,
}: {
  activityId: string;
  entries: Array<{
    teamMemberId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note: string | null;
    teamMember: { fullName: string; status: string | null };
  }>;
}) {
  // Archived members stay selectable when they are already on this activity, so
  // editing an old record does not silently drop them.
  const selectedIds = entries.map((entry) => entry.teamMemberId);
  const members = await prisma.teamMember.findMany({
    where: { OR: [{ isActive: true }, { id: { in: selectedIds } }] },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, status: true },
  });

  return (
    <AttendanceEditor
      candidates={members.map((member) => ({
        id: member.id,
        name: member.fullName,
        detail: member.status ?? undefined,
      }))}
      initialEntries={entries.map((entry) => ({
        id: entry.teamMemberId,
        attendance: entry.attendance,
        note: entry.note ?? "",
      }))}
      emptyTitle="Belum ada anggota tim."
      emptyDescription="Tambahkan anggota tim terlebih dahulu di menu Tim."
      onSave={async (rows) => {
        "use server";
        return saveActivityTeamAction(
          activityId,
          rows.map((row) => ({
            teamMemberId: row.id,
            attendance: row.attendance,
            note: row.note,
          })),
        );
      }}
    />
  );
}

async function StudentStep({
  activityId,
  locationId,
  entries,
  warning,
  beneficiaryCount,
}: {
  activityId: string;
  locationId: string;
  entries: Array<{
    studentId: string;
    attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
    note: string | null;
    student: { fullName: string; studentGroup: { name: string } };
  }>;
  warning: string | null;
  beneficiaryCount: number;
}) {
  const selectedIds = entries.map((entry) => entry.studentId);

  // Scoped to this activity's location, because that is where its students are.
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { isActive: true, studentGroup: { locationId } },
        { id: { in: selectedIds } },
      ],
    },
    orderBy: [{ studentGroup: { name: "asc" } }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      studentGroup: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Daftar murid bersifat opsional. Jumlah penerima manfaat
        ({beneficiaryCount}) tetap dipakai pada laporan meskipun daftar ini
        kosong.
      </p>
      <AttendanceEditor
        candidates={students.map((student) => ({
          id: student.id,
          name: student.fullName,
          detail: student.studentGroup.name,
        }))}
        initialEntries={entries.map((entry) => ({
          id: entry.studentId,
          attendance: entry.attendance,
          note: entry.note ?? "",
        }))}
        emptyTitle="Belum ada murid di tempat ini."
        emptyDescription="Tambahkan kelompok dan murid terlebih dahulu, atau lanjutkan hanya dengan jumlah penerima manfaat."
        warning={warning}
        onSave={async (rows) => {
          "use server";
          return saveActivityStudentsAction(
            activityId,
            rows.map((row) => ({
              studentId: row.id,
              attendance: row.attendance,
              note: row.note,
            })),
          );
        }}
      />
    </div>
  );
}

async function KurikulumStep({
  activityId,
  selectedIds,
}: {
  activityId: string;
  selectedIds: string[];
}) {
  const materials = await prisma.curriculumMaterial.findMany({
    where: { OR: [{ isActive: true }, { id: { in: selectedIds } }] },
    orderBy: [
      { period: { curriculum: { name: "asc" } } },
      { period: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
    select: {
      id: true,
      title: true,
      meetingLabel: true,
      objective: true,
      period: {
        select: { name: true, curriculum: { select: { name: true } } },
      },
    },
  });

  return (
    <MaterialPicker
      activityId={activityId}
      selectedIds={selectedIds}
      materials={materials.map((material) => ({
        id: material.id,
        title: material.title,
        meetingLabel: material.meetingLabel,
        objective: material.objective,
        curriculumName: material.period.curriculum.name,
        periodName: material.period.name,
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

function ReviewStep({
  activity,
  studentWarning,
  missing,
}: {
  activity: {
    id: string;
    partner: string;
    beneficiary: string;
    beneficiaryCount: number;
    aidType: string;
    notes: string | null;
    location: { name: string; address: string };
    teamMembers: Array<{
      attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
      note: string | null;
      teamMember: { fullName: string };
    }>;
    students: Array<{
      attendance: "HADIR" | "IZIN" | "SAKIT" | "ALPA";
      student: { fullName: string; studentGroup: { name: string } };
    }>;
    materials: Array<{
      material: { title: string; meetingLabel: string | null };
    }>;
    documents: Array<{ id: string }>;
  };
  studentWarning: string | null;
  missing: string[];
}) {
  const teamTally = tallyAttendance(activity.teamMembers);
  const studentTally = tallyAttendance(activity.students);

  return (
    <div className="space-y-6">
      {missing.length > 0 ? (
        <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
          <p className="text-sm font-medium">Laporan belum lengkap.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Yang harus dilengkapi: {missing.join(", ")}.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-green-600/30 bg-green-600/5 p-3">
          <p className="text-sm font-medium">
            Data lengkap. Laporan final bisa dibuat.
          </p>
        </div>
      )}

      {studentWarning ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-sm">{studentWarning}</p>
        </div>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-medium">Informasi</h3>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Mitra" value={activity.partner} />
          <Row label="Penerima manfaat" value={activity.beneficiary} />
          <Row
            label="Jumlah penerima manfaat"
            value={`${activity.beneficiaryCount} anak`}
          />
          <Row label="Jenis bantuan" value={activity.aidType} />
          <Row label="Alamat" value={activity.location.address} />
          {activity.notes ? (
            <Row label="Catatan" value={activity.notes} />
          ) : null}
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">
          Tim ({teamTally.total} orang)
        </h3>
        {activity.teamMembers.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada tim.</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-2 text-sm">
              Hadir {teamTally.hadir} · Izin {teamTally.izin} · Sakit{" "}
              {teamTally.sakit} · Alpa {teamTally.alpa}
            </p>
            <ul className="space-y-1 text-sm">
              {activity.teamMembers.map((entry) => (
                <li key={entry.teamMember.fullName}>
                  {entry.teamMember.fullName}
                  {entry.attendance === "HADIR"
                    ? ""
                    : ` (${ATTENDANCE_LABELS[entry.attendance].toLowerCase()})`}
                  {entry.note ? (
                    <span className="text-muted-foreground"> — {entry.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">
          Murid ({studentTally.total} tercatat)
        </h3>
        {activity.students.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tidak ada daftar murid individual. Laporan memakai jumlah penerima
            manfaat.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Hadir {studentTally.hadir} · Izin {studentTally.izin} · Sakit{" "}
            {studentTally.sakit} · Alpa {studentTally.alpa}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Kurikulum</h3>
        {activity.materials.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada materi.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {activity.materials.map((entry, index) => (
              <li key={index}>
                {entry.material.meetingLabel
                  ? `${entry.material.meetingLabel} — `
                  : ""}
                {entry.material.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Dokumentasi</h3>
        <p className="text-muted-foreground text-sm">
          {activity.documents.length} berkas terunggah.
        </p>
      </section>

      <div className="flex justify-end">
        <ButtonLink href={`/kegiatan/${activity.id}?step=laporan`}>
          Lanjut ke Laporan
        </ButtonLink>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
