import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

/**
 * The sidebar structure from PRD section 33, defined once so the sidebar, the
 * mobile drawer and the breadcrumbs all stay in agreement.
 *
 * `href` on a parent points at the page a click should open; `children` are the
 * sub-pages shown when that section is active.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Kegiatan",
    href: "/kegiatan",
    icon: ClipboardList,
    children: [
      { label: "Semua Kegiatan", href: "/kegiatan" },
      { label: "Tambah Kegiatan", href: "/kegiatan/baru" },
    ],
  },
  {
    label: "Jadwal",
    href: "/jadwal",
    icon: CalendarDays,
    children: [
      { label: "Kalender", href: "/jadwal/kalender" },
      { label: "Semua Jadwal", href: "/jadwal" },
    ],
  },
  {
    label: "Tim",
    href: "/tim",
    icon: Users,
  },
  {
    label: "Murid",
    href: "/murid",
    icon: UsersRound,
    children: [
      { label: "Semua Murid", href: "/murid" },
      { label: "Kelompok", href: "/murid/kelompok" },
    ],
  },
  {
    label: "Kurikulum",
    href: "/kurikulum",
    icon: BookOpen,
  },
  {
    label: "Tempat",
    href: "/tempat",
    icon: MapPin,
  },
  {
    label: "Laporan",
    href: "/laporan",
    icon: FileText,
    children: [
      { label: "Semua Laporan", href: "/laporan" },
      { label: "Rekap", href: "/laporan/rekap" },
    ],
  },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
  },
];

/**
 * True when `href` is the current page or one of its sub-pages.
 *
 * Requiring a "/" after the prefix stops "/tim" from lighting up while the user
 * is on a hypothetical "/timeline".
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/** Breadcrumb trail for a pathname, derived from the same nav tree. */
export function getBreadcrumbs(
  pathname: string,
): Array<{ label: string; href: string }> {
  for (const item of NAV_ITEMS) {
    if (!isActivePath(pathname, item.href)) continue;

    const trail = [{ label: item.label, href: item.href }];

    const child = item.children?.find((entry) => entry.href === pathname);
    if (child && child.href !== item.href) {
      trail.push({ label: child.label, href: child.href });
    }

    return trail;
  }

  return [];
}
