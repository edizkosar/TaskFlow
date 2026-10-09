"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, CircleAlertIcon, SignalHighIcon, SignalLowIcon, SignalMediumIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { labelColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, type BoardTask, type TaskPriority } from "@/lib/task-types";

const PRIORITY_ICONS: Record<Exclude<TaskPriority, "NONE">, { Icon: typeof SignalLowIcon; className: string }> = {
  LOW: { Icon: SignalLowIcon, className: "text-muted-foreground" },
  MEDIUM: { Icon: SignalMediumIcon, className: "text-muted-foreground" },
  HIGH: { Icon: SignalHighIcon, className: "text-foreground" },
  URGENT: { Icon: CircleAlertIcon, className: "text-destructive" },
};

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

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("list-none", isDragging && "opacity-40")}
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
  const priority = task.priority !== "NONE" ? PRIORITY_ICONS[task.priority] : null;

  return (
    <article
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border bg-card p-2.5 text-sm shadow-xs transition-colors select-none hover:border-foreground/20",
        overlay && "cursor-grabbing shadow-lg ring-1 ring-primary/30",
        isTemp && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {isTemp ? `${projectKey}-…` : `${projectKey}-${task.number}`}
        </span>
        {task.assignee && (
          <Avatar className="size-5" title={task.assignee.name}>
            <AvatarFallback className="text-[9px]">{initials(task.assignee.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <p className="line-clamp-3 leading-snug font-medium break-words">{task.title}</p>
      {(priority || task.dueDate || task.labels.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {priority && (
            <span title={PRIORITY_LABELS[task.priority]}>
              <priority.Icon aria-hidden className={cn("size-3.5", priority.className)} />
              <span className="sr-only">{PRIORITY_LABELS[task.priority]}</span>
            </span>
          )}
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}>
              <CalendarIcon aria-hidden className="size-3.5" />
              <span>
                {overdue && <span className="sr-only">Gecikti: </span>}
                {dueFormat.format(new Date(task.dueDate))}
              </span>
            </span>
          )}
          {task.labels.map((label) => (
            <span
              key={label.id}
              className={cn("rounded px-1.5 py-0.5 text-[11px] leading-none font-medium ring-1 ring-inset", labelColorClass(label.color))}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
