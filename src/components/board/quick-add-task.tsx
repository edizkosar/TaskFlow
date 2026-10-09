"use client";

import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { STATUS_LABELS, type TaskStatus } from "@/lib/task-status";

/** Inline "add task" at the bottom of a column. Enter adds and keeps it open; Escape closes. */
export function QuickAddTask({
  status,
  onCreate,
  openRequest,
}: {
  status: TaskStatus;
  onCreate: (status: TaskStatus, title: string) => Promise<boolean>;
  /** Increments when a shortcut asks to open this form. */
  openRequest: number;
}) {
  const [open, setOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState(openRequest);
  if (openRequest !== lastRequest) {
    setLastRequest(openRequest);
    if (openRequest > 0) setOpen(true);
  }
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Also focus when the form is already open (or a closing dialog returned focus elsewhere).
  useEffect(() => {
    if (openRequest === 0) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [openRequest]);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Görev ekle
      </Button>
    );
  }

  async function submit() {
    const value = title.trim();
    if (!value) return;
    setTitle("");
    inputRef.current?.focus();
    // The board inserts the task optimistically; restore the text if it fails.
    const ok = await onCreate(status, value);
    if (!ok) setTitle(value);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-2 rounded-md border bg-card p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
    >
      <label htmlFor={`quick-add-${status}`} className="sr-only">
        {STATUS_LABELS[status]} sütununa görev başlığı
      </label>
      <textarea
        ref={inputRef}
        id={`quick-add-${status}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          } else if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder="Görev başlığı"
        rows={2}
        maxLength={200}
        autoFocus
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
        >
          Vazgeç
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          Ekle
        </Button>
      </div>
    </form>
  );
}
