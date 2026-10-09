import type { TaskStatus } from "@/lib/task-status";

export const TASK_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  NONE: "Öncelik yok",
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

/** Serializable task shape passed from the project page to the board. */
export type BoardTask = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: string;
  /** ISO date (YYYY-MM-DD) or null. */
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
  labels: { id: string; name: string; color: string }[];
};

export type BoardMember = { id: string; name: string };

export type TaskComment = {
  id: string;
  body: string;
  /** ISO timestamps. */
  createdAt: string;
  editedAt: string | null;
  author: { id: string; name: string };
};

/** Everything the task panel shows. */
export type TaskDetail = BoardTask & {
  description: string | null;
  createdAt: string;
  creator: { id: string; name: string } | null;
  comments: TaskComment[];
};

/** Board order: fractional `position` (byte order, same as COLLATE "C"), then id for ties. */
export function compareTasks(a: Pick<BoardTask, "position" | "id">, b: Pick<BoardTask, "position" | "id">) {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
