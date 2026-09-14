"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <GraduationCap className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold">
            Tazkia Mengajar
          </p>
          <p className="text-muted-foreground truncate text-xs leading-tight">
            Monitoring System
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Navigasi utama">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>

                {/*
                  Sub-pages appear only for the section being viewed. Showing
                  every child at once turns a nine-item sidebar into a
                  seventeen-item wall and makes the current location harder to
                  find, not easier.
                */}
                {active && item.children ? (
                  <ul className="border-border mt-0.5 ml-[1.4rem] space-y-0.5 border-l pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-sm transition-colors",
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
