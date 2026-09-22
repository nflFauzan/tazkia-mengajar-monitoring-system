import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import {
  AddCurriculumButton,
  AddMaterialButton,
  AddPeriodButton,
  CurriculumActions,
  DeletePeriodButton,
  MaterialActions,
} from "@/components/curriculum/curriculum-manager";
import { MaterialDetailDialog } from "@/components/curriculum/material-detail-dialog";
import { EmptyState, PageHeader } from "@/components/common/page-shell";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Kurikulum" };

/**
 * Curriculum is shown as a nested tree rather than a paginated table, because
 * its shape — a handful of programmes, each with a few periods and materials —
 * is what the admin needs to see at once when planning a session.
 */
export default async function KurikulumPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const curriculums = await prisma.curriculum.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      periods: {
        orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          materials: {
            orderBy: [{ orderIndex: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              meetingLabel: true,
              objective: true,
              description: true,
              notes: true,
              orderIndex: true,
              isActive: true,
              periodId: true,
            },
          },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Kurikulum"
        description={
          isAdmin
            ? "Kurikulum, periode, dan materi yang bisa dikaitkan ke kegiatan."
            : "Daftar kurikulum dan materi ajar untuk panduan kegiatan belajar-mengajar."
        }
        actions={isAdmin ? <AddCurriculumButton /> : undefined}
      />

      {curriculums.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada kurikulum."
          description={
            isAdmin
              ? "Buat kurikulum, lalu tambahkan periode dan materi di dalamnya."
              : "Belum ada kurikulum yang ditambahkan oleh admin."
          }
          action={isAdmin ? <AddCurriculumButton /> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {curriculums.map((curriculum) => (
            <section key={curriculum.id} className="border-border rounded-lg border-2 shadow-[var(--shadow-brutal)]">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-lg tracking-tight">{curriculum.name}</h2>
                    {curriculum.isActive ? null : (
                      <Badge variant="secondary">Arsip</Badge>
                    )}
                  </div>
                  {curriculum.description ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {curriculum.description}
                    </p>
                  ) : null}
                </div>
                {isAdmin ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <AddPeriodButton curriculumId={curriculum.id} />
                    <CurriculumActions
                      curriculum={{
                        id: curriculum.id,
                        name: curriculum.name,
                        description: curriculum.description,
                        isActive: curriculum.isActive,
                      }}
                    />
                  </div>
                ) : null}
              </header>

              {curriculum.periods.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Belum ada periode pada kurikulum ini.
                </p>
              ) : (
                <div className="divide-y">
                  {curriculum.periods.map((period) => (
                    <div key={period.id} className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">{period.name}</h3>
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <AddMaterialButton periodId={period.id} />
                            <DeletePeriodButton
                              periodId={period.id}
                              periodName={period.name}
                            />
                          </div>
                        ) : null}
                      </div>

                      {period.materials.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Belum ada materi pada periode ini.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {period.materials.map((material) => (
                            <li
                              key={material.id}
                              className="bg-muted/40 flex items-start justify-between gap-3 rounded-md p-3"
                            >
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm font-medium">
                                  {material.meetingLabel
                                    ? `${material.meetingLabel} — `
                                    : ""}
                                  {material.title}
                                  {material.isActive ? null : (
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 align-middle"
                                    >
                                      Arsip
                                    </Badge>
                                  )}
                                </p>
                                {material.objective ? (
                                  <p className="text-muted-foreground text-xs">
                                    <strong className="text-foreground">Tujuan:</strong> {material.objective}
                                  </p>
                                ) : null}
                                {material.description ? (
                                  <p className="text-muted-foreground text-xs">
                                    <strong className="text-foreground">Deskripsi:</strong> {material.description}
                                  </p>
                                ) : null}
                                {material.notes ? (
                                  <p className="text-muted-foreground text-xs italic">
                                    Catatan: {material.notes}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <MaterialDetailDialog
                                  material={material}
                                  periodName={period.name}
                                  curriculumName={curriculum.name}
                                />
                                {isAdmin ? (
                                  <MaterialActions material={material} />
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
