"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { TazkiaMark } from "@/components/brand/tazkia-mark";
import { getNavItemsForRole, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  role?: "ADMIN" | "PENGAJAR" | "PEMBIMBING";
  locations?: Array<{ id: string; name: string }>;
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

export function AppSidebar({
  role = "ADMIN",
  locations,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b-2 border-border px-4">
        <TazkiaMark className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="font-heading truncate text-sm leading-tight tracking-tight">
            TAZKIA MENGAJAR
          </p>
          <p className="text-muted-foreground truncate text-xs leading-tight">
            Monitoring System
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Navigasi utama">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            const isMurid = item.href === "/murid";

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-bold transition-colors",
                    active
                      ? "border-2 border-border bg-primary text-primary-foreground shadow-[var(--shadow-brutal-sm)]"
                      : "border-2 border-transparent text-foreground hover:border-border hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>

                {/* Sub-menu Murid: langsung muncul ketika aktif */}
                {active && isMurid ? (
                  <Suspense fallback={null}>
                    <MuridLocationSubMenu
                      locations={locations}
                      onNavigate={onNavigate}
                    />
                  </Suspense>
                ) : null}

                {/* Sub-pages umum lainnya (Kegiatan, Jadwal, Laporan) */}
                {active && item.children ? (
                  <ul className="border-border mt-1 ml-[1.5rem] space-y-0.5 border-l-2 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                              childActive
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function MuridLocationSubMenu({
  locations,
  onNavigate,
}: {
  locations?: Array<{ id: string; name: string }>;
  onNavigate?: () => void;
}) {
  const searchParams = useSearchParams();
  const currentTempatId = searchParams.get("tempatId");

  return (
    <ul className="border-border mt-1 ml-[1.5rem] space-y-0.5 border-l-2 pl-3">
      <li>
        <Link
          href="/murid"
          onClick={onNavigate}
          className={cn(
            "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            !currentTempatId
              ? "bg-primary/10 text-primary font-bold"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          Semua Tempat
        </Link>
      </li>
      {locations?.map((loc) => {
        const isLocActive = currentTempatId === loc.id;

        return (
          <li key={loc.id}>
            <Link
              href={`/murid?tempatId=${loc.id}`}
              onClick={onNavigate}
              className={cn(
                "block truncate rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isLocActive
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {loc.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
