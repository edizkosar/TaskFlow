import type { BoardTask } from "@/lib/task-types";

/** URL contract: ?assignee=me|none|<userId>&label=<labelId> */
export type BoardFilters = { assignee: string | null; label: string | null };

export function readFilters(params: { get(name: string): string | null }): BoardFilters {
  return { assignee: params.get("assignee"), label: params.get("label") };
}

export function hasActiveFilters(filters: BoardFilters) {
  return filters.assignee !== null || filters.label !== null;
}

export function matchesFilters(task: BoardTask, filters: BoardFilters, currentUserId: string) {
  if (filters.assignee === "me" && task.assignee?.id !== currentUserId) return false;
  if (filters.assignee === "none" && task.assignee !== null) return false;
  if (filters.assignee && filters.assignee !== "me" && filters.assignee !== "none" && task.assignee?.id !== filters.assignee) {
    return false;
  }
  if (filters.label && !task.labels.some((l) => l.id === filters.label)) return false;
  return true;
}
