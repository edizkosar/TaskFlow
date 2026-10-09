export const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Yapılacak",
  IN_PROGRESS: "Yapılıyor",
  DONE: "Tamamlandı",
};
