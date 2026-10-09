import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { BoardTask, TaskDetail } from "@/lib/task-types";

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
  _count: { select: { comments: true } },
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
    commentCount: row._count.comments,
  };
}

export const taskDetailSelect = {
  ...boardTaskSelect,
  description: true,
  createdAt: true,
  creator: { select: { id: true, name: true } },
  comments: {
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.TaskSelect;

type TaskDetailRow = Prisma.TaskGetPayload<{ select: typeof taskDetailSelect }>;

export function toTaskDetail(row: TaskDetailRow): TaskDetail {
  return {
    ...toBoardTask(row),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    creator: row.creator,
    comments: row.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      editedAt: c.editedAt?.toISOString() ?? null,
      author: c.author,
    })),
  };
}
