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
  await requireUser();

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
        description="Kurikulum, periode, dan materi yang bisa dikaitkan ke kegiatan."
        actions={<AddCurriculumButton />}
      />

      {curriculums.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada kurikulum."
          description="Buat kurikulum, lalu tambahkan periode dan materi di dalamnya."
          action={<AddCurriculumButton />}
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
              </header>

              {curriculum.periods.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Belum ada periode. Tambahkan periode seperti Semester 1.
                </p>
              ) : (
                <div className="divide-y">
                  {curriculum.periods.map((period) => (
                    <div key={period.id} className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">{period.name}</h3>
                        <div className="flex items-center gap-1">
                          <AddMaterialButton periodId={period.id} />
                          <DeletePeriodButton
                            periodId={period.id}
                            periodName={period.name}
                          />
                        </div>
                      </div>

                      {period.materials.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Belum ada materi pada periode ini.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {period.materials.map((material) => (
                            <li
                              key={material.id}
                              className="bg-muted/40 flex items-start justify-between gap-3 rounded-md p-2.5"
                            >
                              <div className="min-w-0">
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
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    {material.objective}
                                  </p>
                                ) : null}
                              </div>
                              <MaterialActions material={material} />
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
