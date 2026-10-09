"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { boardStore, type TaskPatch } from "@/components/board/optimistic-store";
import type { BoardTask } from "@/lib/task-types";

/** The task as the server sent it, with pending optimistic patches applied. */
export function useOptimisticTask<T extends BoardTask>(task: T): T {
  useSyncExternalStore(boardStore.subscribe, boardStore.getVersion, () => 0);
  return boardStore.applyTo(task) as T;
}

type SaveResult<D> = { ok: true; data: D } | { ok: false; error: string };

/**
 * Applies `patch` optimistically (board + panel), runs `save`, then confirms with
 * the server's values or rolls back with a toast. Returns whether it succeeded.
 */
export async function saveTaskPatch<D>(
  serverTask: BoardTask,
  patch: TaskPatch,
  save: () => Promise<SaveResult<D>>,
  confirmWith?: (data: D) => TaskPatch,
) {
  const key = boardStore.patch(serverTask, patch);
  try {
    const result = await boardStore.track(save());
    if (!result.ok) throw new Error(result.error);
    boardStore.confirm(key, confirmWith?.(result.data));
    return true;
  } catch (error) {
    boardStore.reject(key);
    toast.error(error instanceof Error && error.message ? error.message : "Değişiklik kaydedilemedi.");
    return false;
  }
}
