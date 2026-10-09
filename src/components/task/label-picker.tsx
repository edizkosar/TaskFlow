"use client";

import { PlusIcon, TagIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { labelColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createLabel } from "@/server/tasks";

type Label = { id: string; name: string; color: string };

/** Toggle workspace labels on a task; type a new name to create one. */
export function LabelPicker({
  slug,
  workspaceLabels,
  selected,
  onChange,
}: {
  slug: string;
  workspaceLabels: Label[];
  selected: Label[];
  onChange: (labels: Label[]) => void;
}) {
  // Labels created here show up before the server refresh brings them in.
  const [createdHere, setCreatedHere] = useState<Label[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const all = [...workspaceLabels, ...createdHere.filter((c) => !workspaceLabels.some((l) => l.id === c.id))].sort(
    (a, b) => a.name.localeCompare(b.name, "tr"),
  );
  const selectedIds = new Set(selected.map((l) => l.id));

  function toggle(label: Label, checked: boolean) {
    onChange(checked ? [...selected, label] : selected.filter((l) => l.id !== label.id));
  }

  async function create() {
    const value = name.trim();
    if (!value) return;
    const existing = all.find((l) => l.name.toLocaleLowerCase("tr") === value.toLocaleLowerCase("tr"));
    if (existing) {
      if (!selectedIds.has(existing.id)) toggle(existing, true);
      setName("");
      return;
    }
    setCreating(true);
    const result = await createLabel(slug, value);
    setCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCreatedHere((current) => [...current, result.data]);
    setName("");
    toggle(result.data, true);
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-auto min-h-7 max-w-full flex-wrap justify-start gap-1 px-1.5 py-1 font-normal"
            aria-label={`Etiketler: ${selected.length ? selected.map((l) => l.name).join(", ") : "yok"}. Düzenle`}
          />
        }
      >
        {selected.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <TagIcon className="size-3.5" />
            Etiket ekle
          </span>
        ) : (
          selected.map((label) => <LabelChip key={label.id} label={label} />)
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2 p-2">
        {all.length > 0 ? (
          <ul className="flex max-h-56 flex-col overflow-y-auto" aria-label="Etiketler">
            {all.map((label) => {
              const id = `label-option-${label.id}`;
              return (
                <li key={label.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent">
                    <Checkbox
                      id={id}
                      checked={selectedIds.has(label.id)}
                      onCheckedChange={(checked) => toggle(label, checked)}
                    />
                    <LabelChip label={label} />
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">Bu workspace&apos;te henüz etiket yok.</p>
        )}
        <form
          className="flex gap-1.5 border-t pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label htmlFor="new-label-name" className="sr-only">
            Yeni etiket adı
          </label>
          <Input
            id="new-label-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni etiket"
            maxLength={32}
            className="h-7"
          />
          <Button type="submit" size="icon-sm" variant="outline" disabled={!name.trim() || creating} title="Etiket oluştur">
            <PlusIcon />
            <span className="sr-only">Etiket oluştur</span>
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function LabelChip({ label }: { label: Label }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs leading-none font-medium ring-1 ring-inset",
        labelColorClass(label.color),
      )}
    >
      {label.name}
    </span>
  );
}
