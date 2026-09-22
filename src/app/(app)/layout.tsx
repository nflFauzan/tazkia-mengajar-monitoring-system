import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Shell for every authenticated page.
 *
 * `requireUser()` runs here rather than relying on src/proxy.ts alone: the
 * proxy is an optimistic redirect, while this is the check that actually
 * guarantees a session exists before any child page renders or queries.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, locations] = await Promise.all([
    requireUser(),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex min-h-svh">
      <aside className="bg-card hidden w-64 shrink-0 border-r-2 border-border lg:block">
        <div className="sticky top-0 h-svh">
          <AppSidebar role={user.role} locations={locations} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userName={user.name}
          username={user.username}
          role={user.role}
          locations={locations}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
