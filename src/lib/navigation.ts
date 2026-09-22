import {
  BookCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Settings,
  UserCheck,
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
 * The sidebar structure for Admin users.
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
    label: "Panduan & SOP",
    href: "/panduan",
    icon: BookCheck,
  },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
  },
];

export const PENGAJAR_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Absensi Mandiri",
    href: "/absensi",
    icon: UserCheck,
  },
  {
    label: "Kegiatan",
    href: "/kegiatan",
    icon: ClipboardList,
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
    label: "Panduan & SOP",
    href: "/panduan",
    icon: BookCheck,
  },
];

export function getNavItemsForRole(
  role: "ADMIN" | "PENGAJAR" | "PEMBIMBING",
): NavItem[] {
  return role === "ADMIN" ? NAV_ITEMS : PENGAJAR_NAV_ITEMS;
}

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

/** Breadcrumb trail for a pathname, derived from the nav tree for the role. */
export function getBreadcrumbs(
  pathname: string,
  role?: "ADMIN" | "PENGAJAR" | "PEMBIMBING",
): Array<{ label: string; href: string }> {
  const items = getNavItemsForRole(role ?? "ADMIN");

  for (const item of items) {
    if (!isActivePath(pathname, item.href)) continue;

    const trail = [{ label: item.label, href: item.href }];

    const child = item.children?.find((entry) => entry.href === pathname);
    if (child && child.href !== item.href) {
      trail.push({ label: child.label, href: child.href });
    }

    return trail;
  }

  // Fallback for special routes like /absensi or /ubah-password
  if (pathname === "/absensi") {
    return [{ label: "Absensi Mandiri", href: "/absensi" }];
  }

  return [];
}
