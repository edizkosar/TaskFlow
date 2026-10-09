import type { TaskStatus } from "@/lib/task-status";
import type { BoardTask } from "@/lib/task-types";

/**
 * Optimistic board changes that must survive component remounts and stale RSC
 * payloads (Next applies queued server-action refreshes out of order).
 *
 * A move is stored as from → to and applied only while the server data still
 * shows `from`: once the server shows `to` (or anything else, e.g. another user's
 * change), the server wins. Created tasks are shown until the server includes them.
 * Confirmed entries expire after a grace period; failed ones are removed at once.
 */

type Placement = { status: TaskStatus; position: string };

const GRACE_MS = 15_000;

const moves = new Map<string, { from: Placement; to: Placement }>();
const created = new Map<string, Map<string, BoardTask>>(); // projectId → taskId → task
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((listener) => listener());
}

// While a save is in flight, leaving or reloading the page could drop it: ask first.
let inFlight = 0;
function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

export const boardStore = {
  /** Wraps a server call so the browser warns before unloading mid-save. */
  async track<T>(save: Promise<T>): Promise<T> {
    if (inFlight++ === 0) window.addEventListener("beforeunload", warnBeforeUnload);
    try {
      return await save;
    } finally {
      if (--inFlight === 0) window.removeEventListener("beforeunload", warnBeforeUnload);
    }
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getVersion: () => version,

  setMove(taskId: string, from: Placement, to: Placement) {
    moves.set(taskId, { from, to });
    emit();
  },
  /** Server accepted the move (possibly at a different key than guessed). */
  confirmMove(taskId: string, position: string) {
    const entry = moves.get(taskId);
    if (!entry) return;
    const confirmed = { ...entry, to: { ...entry.to, position } };
    moves.set(taskId, confirmed);
    emit();
    setTimeout(() => {
      if (moves.get(taskId) === confirmed) {
        moves.delete(taskId);
        emit();
      }
    }, GRACE_MS);
  },
  rejectMove(taskId: string) {
    if (moves.delete(taskId)) emit();
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

  /** Server tasks with local changes the server hasn't reflected yet. */
  apply(projectId: string, serverTasks: BoardTask[]): BoardTask[] {
    const ids = new Set(serverTasks.map((t) => t.id));
    const extra = [...(created.get(projectId)?.values() ?? [])].filter((t) => !ids.has(t.id));
    return [...serverTasks, ...extra].map((task) => {
      const entry = moves.get(task.id);
      const stale = entry && task.status === entry.from.status && task.position === entry.from.position;
      return stale ? { ...task, ...entry.to } : task;
    });
  },
};
