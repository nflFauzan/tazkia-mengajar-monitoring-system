import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  buildActivityWhere,
  readActivityFilters,
} from "@/server/services/activity-query";
import {
  buildActivityWorkbook,
  buildExportFilename,
} from "@/server/services/excel-export";

/**
 * Excel export of the activity recap and both attendance recaps.
 *
 * The filters are read from the query string with the same parser the list page
 * uses, so the spreadsheet always contains exactly the rows the admin was
 * looking at when they clicked Export.
 *
 * Node runtime: ExcelJS is not Edge-compatible.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  try {
    const where = buildActivityWhere(readActivityFilters(params));
    const workbook = await buildActivityWorkbook(where);
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildExportFilename("rekap-kegiatan")}"`,
        // The file reflects a point-in-time query, so it must never be cached.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export/kegiatan]", error);
    return NextResponse.json(
      { error: "Gagal membuat file Excel. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
