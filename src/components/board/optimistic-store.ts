import type { BoardTask } from "@/lib/task-types";

/**
 * Optimistic task changes that must survive component remounts and stale RSC
 * payloads (Next applies queued server-action refreshes out of order). Shared by
 * the board and the task panel, so a change in one shows up in the other at once.
 *
 * A patch is stored as from → to over a set of fields and applied only while the
 * server data still shows `from` for those fields: once the server shows `to` (or
 * anything else, e.g. another user's change), the server wins. Created tasks show
 * until the server includes them; deleted ones stay hidden. Confirmed entries
 * expire after a grace period; rejected ones are removed at once.
 */

export type TaskPatch = Partial<
  Pick<BoardTask, "status" | "position" | "title" | "priority" | "dueDate" | "assignee" | "labels">
>;

const GRACE_MS = 15_000;

type Entry = { taskId: string; from: TaskPatch; to: TaskPatch };

const patches = new Map<string, Entry>(); // `${taskId}:${fields}` → entry
const created = new Map<string, Map<string, BoardTask>>(); // projectId → taskId → task
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((listener) => listener());
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pick(task: BoardTask, fields: (keyof TaskPatch)[]): TaskPatch {
  return Object.fromEntries(fields.map((f) => [f, task[f]])) as TaskPatch;
}

// While a save is in flight, leaving or reloading the page could drop it: ask first.
let inFlight = 0;
function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

export const boardStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getVersion: () => version,

  /** Wraps a server call so the browser warns before unloading mid-save. */
  async track<T>(save: Promise<T>): Promise<T> {
    if (inFlight++ === 0) window.addEventListener("beforeunload", warnBeforeUnload);
    try {
      return await save;
    } finally {
      if (--inFlight === 0) window.removeEventListener("beforeunload", warnBeforeUnload);
    }
  },

  /**
   * Records `to` over the fields it names, relative to what the server shows now
   * (`current`). Returns a handle for confirm/reject.
   */
  patch(current: BoardTask, to: TaskPatch) {
    const fields = Object.keys(to).sort() as (keyof TaskPatch)[];
    const key = `${current.id}:${fields.join(",")}`;
    patches.set(key, { taskId: current.id, from: pick(current, fields), to });
    emit();
    return key;
  },
  /** Server accepted; `to` may carry server-computed values (e.g. position). */
  confirm(key: string, to?: TaskPatch) {
    const entry = patches.get(key);
    if (!entry) return;
    const confirmed = to ? { ...entry, to: { ...entry.to, ...to } } : entry;
    patches.set(key, confirmed);
    emit();
    setTimeout(() => {
      if (patches.get(key) === confirmed) {
        patches.delete(key);
        emit();
      }
    }, GRACE_MS);
  },
  reject(key: string) {
    if (patches.delete(key)) emit();
  },

  addCreated(projectId: string, task: BoardTask) {
    const forProject = created.get(projectId) ?? new Map<string, BoardTask>();
    forProject.set(task.id, task);
    created.set(projectId, forProject);
    emit();
    setTimeout(() => {
      if (forProject.delete(task.id)) emit();
    }, GRACE_MS);
  },
  markDeleted(taskId: string) {
    deleted.add(taskId);
    emit();
  },
  unmarkDeleted(taskId: string) {
    if (deleted.delete(taskId)) emit();
  },

  /** Server tasks with local changes the server hasn't reflected yet. */
  apply(projectId: string, serverTasks: BoardTask[]): BoardTask[] {
    const ids = new Set(serverTasks.map((t) => t.id));
    const extra = [...(created.get(projectId)?.values() ?? [])].filter((t) => !ids.has(t.id));
    return [...serverTasks, ...extra].filter((t) => !deleted.has(t.id)).map((task) => boardStore.applyTo(task));
  },
  applyTo(task: BoardTask): BoardTask {
    let result = task;
    for (const entry of patches.values()) {
      if (entry.taskId !== task.id) continue;
      const stale = (Object.keys(entry.from) as (keyof TaskPatch)[]).every((f) => same(task[f], entry.from[f]));
      if (stale) result = { ...result, ...entry.to };
    }
    return result;
  },
};
