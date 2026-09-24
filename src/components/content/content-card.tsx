"use client";

import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import type { ContentPlatform, ContentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTanggalSingkat } from "@/lib/dates";
import type { ContentIdeaItem } from "@/server/services/content-ideas";

interface ContentCardProps {
  idea: ContentIdeaItem;
  currentUserId: string;
  currentUserRole: string;
  onEdit: (idea: ContentIdeaItem) => void;
  onPublish: (idea: ContentIdeaItem) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
  onDelete: (id: string) => void;
}

const PLATFORM_CONFIG: Record<
  ContentPlatform,
  { label: string; badgeClass: string }
> = {
  INSTAGRAM: {
    label: "Instagram",
    badgeClass: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30",
  },
  TIKTOK: {
    label: "TikTok",
    badgeClass: "bg-slate-900/10 text-slate-800 dark:text-slate-200 border-slate-500/30",
  },
  YOUTUBE: {
    label: "YouTube",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  },
  LAINNYA: {
    label: "Lainnya",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; badgeClass: string }
> = {
  IDE: {
    label: "Ide & Referensi",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  RENCANA: {
    label: "Rencana Rekam",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  PROSES_EDIT: {
    label: "Proses Edit",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  TAYANG: {
    label: "Sudah Tayang",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
};

export function ContentCard({
  idea,
  currentUserId,
  currentUserRole,
  onEdit,
  onPublish,
  onStatusChange,
  onDelete,
}: ContentCardProps) {
  const isAuthor = idea.authorId === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";
  const canManage = isAuthor || isAdmin;

  const platform = PLATFORM_CONFIG[idea.platform] ?? PLATFORM_CONFIG.LAINNYA;
  const status = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.IDE;

  return (
    <div className="flex flex-col justify-between rounded-lg border-2 border-border bg-card p-3.5 sm:p-4 shadow-[var(--shadow-brutal-sm)] sm:shadow-[var(--shadow-brutal)] transition-all hover:translate-y-[-2px] hover:shadow-[var(--shadow-brutal-lg)]">
      <div className="space-y-2.5 sm:space-y-3">
        {/* Header Tags & Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold sm:text-xs ${platform.badgeClass}`}
            >
              {platform.label}
            </span>
            {idea.contentType ? (
              <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 truncate">
                {idea.contentType}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold sm:text-xs ${status.badgeClass}`}
            >
              {status.label}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    aria-label="Menu Opsi"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
              {/* Ubah Status */}
              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Alur Status
              </div>
              <DropdownMenuItem
                disabled={idea.status === "IDE"}
                onClick={() => onStatusChange(idea.id, "IDE")}
              >
                Ide & Referensi
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={idea.status === "RENCANA"}
                onClick={() => onStatusChange(idea.id, "RENCANA")}
              >
                Rencana Rekam
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={idea.status === "PROSES_EDIT"}
                onClick={() => onStatusChange(idea.id, "PROSES_EDIT")}
              >
                Proses Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPublish(idea)}>
                <CheckCircle2 className="size-4 text-emerald-600 mr-2" />
                Tandai Tayang...
              </DropdownMenuItem>

              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(idea)}>
                    <Pencil className="size-4 mr-2" />
                    Ubah Ide
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(idea.id)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Hapus
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

        {/* Title */}
        <h3 className="font-heading text-base font-bold leading-snug tracking-tight text-foreground">
          {idea.title}
        </h3>

        {/* Diusulkan Oleh Attribution */}
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          <User className="size-3.5 shrink-0 text-primary" />
          <span>Diusulkan oleh:</span>
          <span className="font-bold text-foreground truncate">
            {idea.authorName}
          </span>
        </div>

        {/* Description / Concept Note */}
        <p className="line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
          {idea.description}
        </p>
      </div>

      <div className="mt-4 space-y-3 pt-3 border-t border-border/40">
        {/* Metadata info: Location & Target Date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {idea.locationName ? (
            <div className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{idea.locationName}</span>
            </div>
          ) : null}
          {idea.targetDate ? (
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Target: {formatTanggalSingkat(idea.targetDate)}</span>
            </div>
          ) : null}
        </div>

        {/* Reference and Published Links */}
        <div className="flex flex-wrap items-center gap-2">
          {idea.referenceUrl ? (
            <a
              href={idea.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="size-3.5" />
              Lihat Referensi Video
            </a>
          ) : null}

          {idea.status === "TAYANG" && idea.publishedUrl ? (
            <a
              href={idea.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <Globe className="size-3.5" />
              Tonton Postingan
            </a>
          ) : null}
        </div>

        {/* Quick Workflow Action Button if not yet Tayang */}
        {idea.status !== "TAYANG" ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              Aksi cepat alur:
            </span>
            <div className="flex items-center gap-1.5">
              {idea.status === "IDE" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-medium"
                  onClick={() => onStatusChange(idea.id, "RENCANA")}
                >
                  Jadikan Rencana
                </Button>
              ) : null}
              {idea.status === "RENCANA" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-medium"
                  onClick={() => onStatusChange(idea.id, "PROSES_EDIT")}
                >
                  Mulai Edit
                </Button>
              ) : null}
              {idea.status === "PROSES_EDIT" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  onClick={() => onPublish(idea)}
                >
                  <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                  Siap Tayang
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
