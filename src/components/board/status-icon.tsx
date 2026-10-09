import { CircleCheckIcon, CircleDashedIcon, CircleDotIcon, CircleIcon } from "lucide-react";

import type { TaskStatus } from "@/lib/task-status";

const ICONS = {
  BACKLOG: { Icon: CircleDashedIcon, className: "text-muted-foreground" },
  TODO: { Icon: CircleIcon, className: "text-foreground/70" },
  IN_PROGRESS: { Icon: CircleDotIcon, className: "text-amber-600 dark:text-amber-400" },
  DONE: { Icon: CircleCheckIcon, className: "text-primary" },
} satisfies Record<TaskStatus, { Icon: typeof CircleIcon; className: string }>;

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const { Icon, className: color } = ICONS[status];
  return <Icon aria-hidden className={`size-4 shrink-0 ${color} ${className ?? ""}`} />;
}
