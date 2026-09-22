import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  buildExportFilename,
  buildStudentAssessmentWorkbook,
} from "@/server/services/excel-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId") || undefined;
  const studentGroupId = url.searchParams.get("studentGroupId") || undefined;

  try {
    const workbook = await buildStudentAssessmentWorkbook({
      locationId,
      studentGroupId,
    });
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildExportFilename("rekap-capaian-murid")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export/capaian]", error);
    return NextResponse.json(
      { error: "Gagal membuat file Excel rekap capaian murid." },
      { status: 500 },
    );
  }
}
