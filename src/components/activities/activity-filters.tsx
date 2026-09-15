"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * History filters from PRD section 23: date range, location, status and team
 * member.
 *
 * Like the search box, these write to the URL so the server re-queries. That
 * keeps the filtered view shareable and refresh-safe, and means the Excel
 * export can reuse exactly the same parameters.
 */
export function ActivityFilters({
  locations,
  teamMembers,
}: {
  locations: FilterOption[];
  teamMembers: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const hasFilters = [
    "from",
    "to",
    "locationId",
    "status",
    "teamMemberId",
  ].some((key) => searchParams.get(key));

  return (
    <div className="mb-4 grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-5">
      <FilterField label="Dari tanggal" id="from">
        <Input
          id="from"
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(event) => setParam("from", event.target.value)}
        />
      </FilterField>

      <FilterField label="Sampai tanggal" id="to">
        <Input
          id="to"
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(event) => setParam("to", event.target.value)}
        />
      </FilterField>

      <FilterField label="Tempat" id="locationId">
        <Select
          id="locationId"
          value={searchParams.get("locationId") ?? ""}
          onChange={(value) => setParam("locationId", value)}
          placeholder="Semua tempat"
          options={locations}
        />
      </FilterField>

      <FilterField label="Status" id="status">
        <Select
          id="status"
          value={searchParams.get("status") ?? ""}
          onChange={(value) => setParam("status", value)}
          placeholder="Semua status"
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "COMPLETED", label: "Selesai" },
            { value: "CANCELLED", label: "Dibatalkan" },
          ]}
        />
      </FilterField>

      <FilterField label="Anggota tim" id="teamMemberId">
        <Select
          id="teamMemberId"
          value={searchParams.get("teamMemberId") ?? ""}
          onChange={(value) => setParam("teamMemberId", value)}
          placeholder="Semua anggota"
          options={teamMembers}
        />
      </FilterField>

      {hasFilters ? (
        <div className="sm:col-span-2 lg:col-span-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace(pathname)}
          >
            <X className="size-4" />
            Hapus semua filter
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterOption[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
