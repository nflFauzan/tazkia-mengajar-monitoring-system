"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clapperboard,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { ContentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  deleteContentIdeaAction,
  updateContentIdeaStatusAction,
} from "@/server/actions/content-ideas";
import type { ContentIdeaItem } from "@/server/services/content-ideas";
import { ContentCard } from "./content-card";
import { ContentIdeaDialog } from "./content-idea-dialog";
import { PublishDialog } from "./publish-dialog";

interface ContentBoardProps {
  initialIdeas: ContentIdeaItem[];
  locations: Array<{ id: string; name: string }>;
  currentUserId: string;
  currentUserRole: string;
}

const STATUS_TABS: Array<{ value: "ALL" | ContentStatus; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "IDE", label: "Ide & Referensi" },
  { value: "RENCANA", label: "Rencana Rekam" },
  { value: "PROSES_EDIT", label: "Proses Edit" },
  { value: "TAYANG", label: "Sudah Tayang" },
];

export function ContentBoard({
  initialIdeas,
  locations,
  currentUserId,
  currentUserRole,
}: ContentBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ContentStatus>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ContentIdeaItem | null>(null);
  const [publishingIdea, setPublishingIdea] = useState<ContentIdeaItem | null>(null);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);

  // Formatted location options for dialogs
  const locationOptions = useMemo(
    () => locations.map((loc) => ({ value: loc.id, label: loc.name })),
    [locations],
  );

  // Filtered ideas
  const filteredIdeas = useMemo(() => {
    return initialIdeas.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (locationFilter !== "ALL" && item.locationId !== locationFilter) {
        return false;
      }
      if (platformFilter !== "ALL" && item.platform !== platformFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchAuthor = item.authorName.toLowerCase().includes(query);
        const matchType = item.contentType
          ? item.contentType.toLowerCase().includes(query)
          : false;

        if (!matchTitle && !matchDesc && !matchAuthor && !matchType) {
          return false;
        }
      }
      return true;
    });
  }, [initialIdeas, statusFilter, locationFilter, platformFilter, search]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: initialIdeas.length,
      IDE: 0,
      RENCANA: 0,
      PROSES_EDIT: 0,
      TAYANG: 0,
    };
    for (const item of initialIdeas) {
      counts[item.status]++;
    }
    return counts;
  }, [initialIdeas]);

  async function handleStatusChange(id: string, newStatus: ContentStatus) {
    startTransition(async () => {
      const result = await updateContentIdeaStatusAction(id, {
        status: newStatus,
      });

      if (result.ok) {
        toast.success("Status alur konten berhasil diperbarui!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengubah status konten.");
      }
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs Pills - Horizontally scrollable on mobile */}
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 pt-0.5 no-scrollbar scrollbar-none sm:mx-0 sm:px-0">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = tabCounts[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "border-border bg-card text-foreground shadow-[var(--shadow-brutal-sm)]"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:border-border hover:bg-muted"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="w-full shrink-0 shadow-[var(--shadow-brutal-sm)] sm:w-auto"
        >
          <Plus className="size-4" />
          Usulkan Ide / Referensi
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2 sm:grid sm:grid-cols-4 sm:gap-3 sm:space-y-0">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ide, topik, jenis, atau pengusul..."
            className="h-9 pl-9 text-xs sm:text-sm"
          />
        </div>

        {/* 2 Filter Dropdowns Side-by-Side on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          {/* Platform Filter */}
          <div className="relative">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              aria-label="Filter Platform"
              className="border-border bg-card h-9 w-full appearance-none rounded-md border-2 px-2.5 pr-7 text-xs font-semibold shadow-[var(--shadow-brutal-sm)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            >
              <option value="ALL">Semua Platform</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Location Filter */}
          <div className="relative">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              aria-label="Filter Lokasi"
              className="border-border bg-card h-9 w-full appearance-none truncate rounded-md border-2 px-2.5 pr-7 text-xs font-semibold shadow-[var(--shadow-brutal-sm)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            >
              <option value="ALL">Semua Tempat</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Grid of Content Cards */}
      {filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center shadow-[var(--shadow-brutal-sm)] bg-card">
          <Clapperboard className="size-12 text-muted-foreground stroke-1 mb-3" />
          <h3 className="font-heading text-lg font-bold">
            Belum ada ide atau referensi konten
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {search || statusFilter !== "ALL" || locationFilter !== "ALL" || platformFilter !== "ALL"
              ? "Tidak ada ide konten yang cocok dengan kriteria pencarian atau filter yang dipilih."
              : "Semua pengajar dapat mengusulkan ide konten medsos dan referensi video untuk dieksekusi bersama-sama."}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="outline"
            className="mt-4 gap-2"
          >
            <Plus className="size-4" />
            Usulkan Ide Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <ContentCard
              key={idea.id}
              idea={idea}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onEdit={(target) => setEditingIdea(target)}
              onPublish={(target) => setPublishingIdea(target)}
              onStatusChange={handleStatusChange}
              onDelete={(id) => setDeletingIdeaId(id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <ContentIdeaDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        locations={locationOptions}
      />

      {/* Edit Dialog */}
      {editingIdea ? (
        <ContentIdeaDialog
          open={!!editingIdea}
          onOpenChange={(open) => {
            if (!open) setEditingIdea(null);
          }}
          idea={editingIdea}
          locations={locationOptions}
        />
      ) : null}

      {/* Publish Dialog */}
      {publishingIdea ? (
        <PublishDialog
          open={!!publishingIdea}
          onOpenChange={(open) => {
            if (!open) setPublishingIdea(null);
          }}
          idea={publishingIdea}
        />
      ) : null}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deletingIdeaId}
        onOpenChange={(open) => {
          if (!open) setDeletingIdeaId(null);
        }}
        title="Hapus Ide Konten?"
        description="Ide konten ini akan dihapus dari papan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        destructive
        successMessage="Ide konten berhasil dihapus."
        action={async () => {
          if (!deletingIdeaId) return { ok: false, error: "ID tidak valid" };
          const result = await deleteContentIdeaAction(deletingIdeaId);
          if (result.ok) {
            router.refresh();
          }
          return result;
        }}
      />
    </div>
  );
}
