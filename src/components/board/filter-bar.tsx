"use client";

import { XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasActiveFilters, readFilters } from "@/lib/board-filters";
import type { BoardMember } from "@/lib/task-types";

const ALL = "all";

export function FilterBar({
  members,
  labels,
  currentUserId,
}: {
  members: BoardMember[];
  labels: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);

  // Filters replace the history entry (no Back-button spam) but stay in the URL to be shareable.
  function setParam(name: "assignee" | "label", value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === ALL) params.delete(name);
    else params.set(name, value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clear() {
    const params = new URLSearchParams(searchParams);
    params.delete("assignee");
    params.delete("label");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const others = members.filter((m) => m.id !== currentUserId);
  const assigneeItems = [
    { value: ALL, label: "Herkes" },
    { value: "me", label: "Bana atananlar" },
    { value: "none", label: "Atanmamış" },
    ...others.map((m) => ({ value: m.id, label: m.name })),
  ];
  const labelItems = [{ value: ALL, label: "Tüm etiketler" }, ...labels.map((l) => ({ value: l.id, label: l.name }))];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2" role="toolbar" aria-label="Pano filtreleri">
      <Select
        value={filters.assignee ?? ALL}
        onValueChange={(v) => setParam("assignee", v)}
        items={assigneeItems}
      >
        <SelectTrigger size="sm" aria-label="Atanan kişiye göre filtrele" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assigneeItems.slice(0, 3).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
          {others.length > 0 && <SelectSeparator />}
          {assigneeItems.slice(3).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {labels.length > 0 && (
        <Select value={filters.label ?? ALL} onValueChange={(v) => setParam("label", v)} items={labelItems}>
          <SelectTrigger size="sm" aria-label="Etikete göre filtrele" className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {labelItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <XIcon />
          Filtreleri temizle
        </Button>
      )}
    </div>
  );
}
