"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, User } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getBreadcrumbs } from "@/lib/navigation";
import { logoutAction } from "@/server/actions/auth";

interface AppHeaderProps {
  userName: string;
  username: string;
}

export function AppHeader({ userName, username }: AppHeaderProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Buka navigasi"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          <AppSidebar onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <Fragment key={crumb.href}>
                {index > 0 ? (
                  <ChevronRight
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-hidden
                  />
                ) : null}
                <li className="min-w-0">
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="block truncate font-medium"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground block truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="hidden max-w-32 truncate sm:inline">
                {userName}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate font-medium">{userName}</span>
            <span className="text-muted-foreground block truncate text-xs font-normal">
              @{username}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/*
            Logout is a form post rather than an onClick handler so it still
            works without JavaScript, and so the server clears the cookie
            instead of trusting the client to.
          */}
          <form action={logoutAction}>
            <DropdownMenuItem
              render={
                <button type="submit" className="w-full">
                  <LogOut className="size-4" />
                  Keluar
                </button>
              }
            />
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
