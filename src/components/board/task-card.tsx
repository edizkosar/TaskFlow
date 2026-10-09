"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, CircleAlertIcon, SignalHighIcon, SignalLowIcon, SignalMediumIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { labelColorClass } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, type BoardTask, type TaskPriority } from "@/lib/task-types";

// Linear-like: bars for low/medium/high, a muted orange-red alert for urgent.
const PRIORITY_ICONS: Record<Exclude<TaskPriority, "NONE">, { Icon: typeof SignalLowIcon; className: string }> = {
  LOW: { Icon: SignalLowIcon, className: "text-muted-foreground" },
  MEDIUM: { Icon: SignalMediumIcon, className: "text-muted-foreground" },
  HIGH: { Icon: SignalHighIcon, className: "text-foreground/80" },
  URGENT: { Icon: CircleAlertIcon, className: "text-orange-600 dark:text-orange-400" },
};

/** Small metadata pill used for priority, due date and labels. */
const chip = "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] leading-none font-medium";

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
  const priority = task.priority !== "NONE" ? PRIORITY_ICONS[task.priority] : null;

  return (
    <article
      className={cn(
        // Depth from a soft, spread shadow and a faint ring instead of a hard border.
        "group/card flex cursor-grab flex-col gap-2.5 rounded-lg bg-card p-3 text-sm select-none",
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
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase" translate="no">
          {isTemp ? `${projectKey}-…` : `${projectKey}-${task.number}`}
        </span>
        {task.assignee && (
          <Avatar className="size-5 ring-2 ring-card" title={task.assignee.name}>
            <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
              {initials(task.assignee.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <p className="line-clamp-3 text-[13.5px] leading-snug font-medium tracking-[-0.005em] break-words text-foreground">
        {task.title}
      </p>
      {(priority || task.dueDate || task.labels.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {priority && (
            <span
              title={PRIORITY_LABELS[task.priority]}
              className={cn(
                chip,
                "px-1 ring-1 ring-inset ring-border/60",
                task.priority === "URGENT" && "bg-orange-500/10 ring-orange-500/25",
              )}
            >
              <priority.Icon aria-hidden className={cn("size-3.5", priority.className)} />
              <span className="sr-only">{PRIORITY_LABELS[task.priority]}</span>
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                chip,
                "ring-1 ring-inset ring-border/60",
                // red-700 in light mode keeps AA contrast on the tinted chip (also under the panel's dimmed backdrop).
                overdue && "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-400",
              )}
            >
              <CalendarIcon aria-hidden className="size-3" />
              <span>
                {overdue && <span className="sr-only">Gecikti: </span>}
                {dueFormat.format(new Date(task.dueDate))}
              </span>
            </span>
          )}
          {task.labels.map((label) => (
            <span
              key={label.id}
              className={cn(chip, "font-semibold tracking-wide uppercase ring-1 ring-inset", labelColorClass(label.color))}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
