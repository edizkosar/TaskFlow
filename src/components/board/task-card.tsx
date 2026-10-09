"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, MessageSquareIcon, UserRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { labelColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, type BoardTask } from "@/lib/task-types";

import { PriorityIcon } from "./priority-icon";

const dueFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

export function SortableTaskCard({
  task,
  projectKey,
  onOpen,
}: {
  task: BoardTask;
  projectKey: string;
  onOpen: (task: BoardTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, active } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
    // Unsaved (optimistic) cards can't be moved or used as drop targets yet.
    disabled: task.id.startsWith("temp-"),
  });

  // The <li> stays a plain list item; dnd-kit's role="button" goes on the inner element.
  return (
    <li className="list-none">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cn("rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50", isDragging && "opacity-40")}
        data-testid="task-card"
        data-task-id={task.id}
        {...attributes}
        {...listeners}
        // Click / Enter opens the panel. Ignored while any drag is in progress
        // (Enter also drops a keyboard drag; a pointer drag ends with a click).
        onClick={() => {
          if (!active && !task.id.startsWith("temp-")) onOpen(task);
        }}
        onKeyDown={(event) => {
          listeners?.onKeyDown?.(event);
          if (event.key === "Enter" && !active && !event.defaultPrevented && !task.id.startsWith("temp-")) onOpen(task);
        }}
        aria-roledescription="sürüklenebilir görev"
      >
        <TaskCardContent task={task} projectKey={projectKey} />
      </div>
    </li>
  );
}

export function TaskCardContent({
  task,
  projectKey,
  overlay,
}: {
  task: BoardTask;
  projectKey: string;
  overlay?: boolean;
}) {
  const isTemp = task.id.startsWith("temp-");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.dueDate !== null && task.dueDate < today && task.status !== "DONE";

  return (
    <article
      className={cn(
        // Depth from a soft, spread shadow and a faint ring instead of a hard border.
        "group/card flex cursor-grab flex-col gap-2 rounded-lg bg-card p-3 text-sm select-none",
        "ring-1 ring-border/50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)]",
        "dark:bg-card/90 dark:ring-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.4)]",
        "transition-[transform,box-shadow,background-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:ring-border hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_12px_24px_-8px_rgba(15,23,42,0.14)]",
        "dark:hover:ring-white/[0.12] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_-10px_rgba(0,0,0,0.7)]",
        overlay &&
          "-translate-y-0.5 rotate-[1.5deg] cursor-grabbing ring-primary/40 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] dark:ring-primary/50",
        isTemp && "opacity-60",
      )}
    >
      <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase" translate="no">
        {isTemp ? `${projectKey}-…` : `${projectKey}-${task.number}`}
      </span>
      <p className="line-clamp-3 text-[13.5px] leading-snug font-medium tracking-[-0.005em] break-words text-foreground">
        {task.title}
      </p>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className={cn(
                "inline-flex h-[18px] items-center rounded-md px-1.5 text-[10px] leading-none font-semibold tracking-wide uppercase ring-1 ring-inset",
                labelColorClass(label.color),
              )}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: priority + quiet meta on the left, assignee on the right. */}
      <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
        <span title={PRIORITY_LABELS[task.priority]} className="inline-flex">
          <PriorityIcon priority={task.priority} />
          <span className="sr-only">{PRIORITY_LABELS[task.priority]}</span>
        </span>

        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              // red-700 in light mode keeps AA contrast (also under the panel's dimmed backdrop).
              overdue && "font-medium text-red-700 dark:text-red-400",
            )}
          >
            <CalendarIcon aria-hidden className="size-3" strokeWidth={1.75} />
            <span>
              {overdue && <span className="sr-only">Gecikti: </span>}
              {dueFormat.format(new Date(task.dueDate))}
            </span>
          </span>
        )}

        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-1" title={`${task.commentCount} yorum`}>
            <MessageSquareIcon aria-hidden className="size-3" strokeWidth={1.75} />
            <span className="tabular-nums">{task.commentCount}</span>
            <span className="sr-only">yorum</span>
          </span>
        )}

        <span className="ml-auto">
          {task.assignee ? (
            <Avatar className="size-5 ring-2 ring-card" title={task.assignee.name}>
              <AvatarFallback className="bg-primary/12 text-[9px] font-semibold text-blue-700 dark:bg-primary/25 dark:text-blue-300">
                {initials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span
              title="Atanmamış"
              className="flex size-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/40"
            >
              <UserRoundIcon aria-hidden className="size-3 text-muted-foreground/60" strokeWidth={1.75} />
              <span className="sr-only">Atanmamış</span>
            </span>
          )}
        </span>
      </div>
    </article>
  );
}
