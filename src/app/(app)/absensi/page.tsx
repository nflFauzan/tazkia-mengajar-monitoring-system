import type { Metadata } from "next";
import { UserCheck } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/common/page-shell";
import { SelfAttendancePanel } from "@/components/attendance/self-attendance-panel";
import { requireUser } from "@/lib/auth/session";
import { getPengajarAttendanceSessions } from "@/server/services/attendance-self";

export const metadata: Metadata = { title: "Absensi Mandiri" };

export default async function AbsensiPage() {
  const user = await requireUser();

  if (!user.teamMemberId) {
    return (
      <>
        <PageHeader
          title="Absensi Mandiri"
          description="Pencatatan presensi kehadiran real-time dan pengajuan izin pengajar."
        />
        <EmptyState
          icon={UserCheck}
          title="Akun belum ditautkan."
          description="Akun pengguna Anda belum dihubungkan dengan data personil tim. Silakan hubungi Admin untuk menautkan akun Anda ke anggota tim Tazkia Mengajar."
        />
      </>
    );
  }

  const data = await getPengajarAttendanceSessions(user.teamMemberId);

  return (
    <>
      <PageHeader
        title="Absensi Mandiri"
        description="Pencatatan presensi kehadiran real-time dan pengajuan izin pengajar."
      />
      <SelfAttendancePanel
        todaySessions={data.todaySessions}
        upcomingSessions={data.upcomingSessions}
        recentHistory={data.recentHistory}
        userRole={user.role}
      />
    </>
  );
}
