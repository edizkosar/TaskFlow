import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { BoardTask } from "@/lib/task-types";

export const boardTaskSelect = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  position: true,
  dueDate: true,
  assignee: { select: { id: true, name: true } },
  labels: { select: { label: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.TaskSelect;

type BoardTaskRow = Prisma.TaskGetPayload<{ select: typeof boardTaskSelect }>;

export function toBoardTask(row: BoardTaskRow): BoardTask {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    priority: row.priority,
    position: row.position,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    assignee: row.assignee,
    labels: row.labels.map((l) => l.label),
  };
}
