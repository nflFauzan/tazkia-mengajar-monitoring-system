"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaginationMeta } from "@/lib/pagination";

/**
 * Search box that drives the URL rather than local state.
 *
 * Keeping the query in the URL means the server component re-renders with new
 * SQL, the result is shareable and survives a refresh, and the back button
 * behaves the way people expect. The input is debounced so typing does not
 * issue a query per keystroke.
 */
export function ListSearch({
  placeholder = "Cari...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(currentValue);

  // Keep the box in step when the URL changes from elsewhere (back button, a
  // cleared filter), without fighting the user while they are typing.
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (value === currentValue) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (value.trim()) {
        params.set(paramName, value.trim());
      } else {
        params.delete(paramName);
      }
      // Any new search starts from the first page; staying on page 4 of a
      // different result set shows a confusing empty table.
      params.delete("page");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, currentValue, paramName, pathname, router, searchParams]);

  return (
    <div className="relative max-w-xs flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
      />
      {isPending ? (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
      ) : null}
    </div>
  );
}

export function PaginationControls({ meta }: { meta: PaginationMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (meta.total === 0) return null;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        Menampilkan {meta.from}–{meta.to} dari {meta.total} data
      </p>

      {meta.pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            <ChevronLeft className="size-4" />
            Sebelumnya
          </Button>
          <span className="text-sm tabular-nums">
            {meta.page} / {meta.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.pageCount}
            onClick={() => goToPage(meta.page + 1)}
          >
            Berikutnya
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
