"use client";

import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { hasActiveFilters, matchesFilters, readFilters } from "@/lib/board-filters";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/task-status";
import { compareTasks, type BoardTask } from "@/lib/task-types";
import { isDialogOpen, isTypingTarget, NEW_TASK_EVENT } from "@/lib/shortcuts";
import { openTaskPanel } from "@/lib/task-url";
import { createTask, moveTask } from "@/server/tasks";

import { BoardColumn, columnId } from "./board-column";
import { boardStore } from "./optimistic-store";
import { TaskCardContent } from "./task-card";

type Props = {
  slug: string;
  project: { id: string; key: string };
  tasks: BoardTask[];
  currentUserId: string;
};

type Columns = Record<TaskStatus, BoardTask[]>;

/** Key between two neighbors; falls back to "after `before`" on ties or stale data. */
function keyBetween(before: BoardTask | undefined, after: BoardTask | undefined) {
  try {
    return generateKeyBetween(before?.position ?? null, after?.position ?? null);
  } catch {
    return generateKeyBetween(before?.position ?? null, null);
  }
}

function statusOfColumnId(id: UniqueIdentifier): TaskStatus | null {
  const s = String(id);
  return s.startsWith("column:") ? (s.slice(7) as TaskStatus) : null;
}

/** Puts `id` into `status` at `index` of `list` (a visible column), with a fresh position. */
function placeTask(tasks: BoardTask[], id: string, status: TaskStatus, list: BoardTask[], index: number) {
  const others = list.filter((t) => t.id !== id);
  const position = keyBetween(others[index - 1], others[index]);
  return tasks.map((t) => (t.id === id ? { ...t, status, position } : t));
}

export function BoardContainer({ slug, project, tasks: serverTasks, currentUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const filtered = hasActiveFilters(filters);

  // Server data + optimistic changes that outlive remounts/stale payloads (see optimistic-store).
  const storeVersion = useSyncExternalStore(boardStore.subscribe, boardStore.getVersion, () => 0);
  const base = useMemo(
    () => boardStore.apply(project.id, serverTasks),
    // storeVersion: re-apply when the store changes.
    [project.id, serverTasks, storeVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Live preview while a card is being dragged.
  const [preview, setPreview] = useState<BoardTask[] | null>(null);
  // Creates still in flight (greyed out, not draggable).
  const [pending, setPending] = useState<BoardTask[]>([]);
  const tasks = useMemo(() => [...(preview ?? base), ...pending], [preview, base, pending]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // "C" (or the palette's "Yeni görev") opens quick add in the Yapılacak column.
  const [quickAddRequest, setQuickAddRequest] = useState(0);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "c" || event.ctrlKey || event.metaKey || event.altKey) return;
      // Not while typing, and not behind an open dialog (task panel, palette).
      if (isTypingTarget(event.target) || isDialogOpen()) return;
      event.preventDefault();
      setQuickAddRequest((n) => n + 1);
    }
    const onNewTask = () => setQuickAddRequest((n) => n + 1);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(NEW_TASK_EVENT, onNewTask);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(NEW_TASK_EVENT, onNewTask);
    };
  }, []);

  const columns = useMemo(() => {
    const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as BoardTask[]])) as Columns;
    for (const task of [...tasks].sort(compareTasks)) {
      if (matchesFilters(task, filters, currentUserId) || task.id === activeId) byStatus[task.status].push(task);
    }
    return byStatus;
  }, [tasks, filters, currentUserId, activeId]);

  // dnd-kit may call a handler from an earlier render, so handlers read live data from refs.
  const live = useRef({ tasks, columns, base, serverTasks });
  useEffect(() => {
    live.current = { tasks, columns, base, serverTasks };
  }, [tasks, columns, base, serverTasks]);
  const liveTask = (id: UniqueIdentifier) => live.current.tasks.find((t) => t.id === id);

  /** Where the dragged card started (for the "dropped where it started" check). */
  const dragStart = useRef<{ status: TaskStatus; index: number } | null>(null);
  /**
   * Slot chosen with Up/Down during a keyboard drag. Used at drop instead of
   * dnd-kit's `over`, which can briefly flip back to the card itself while
   * sortable transforms settle.
   */
  const keyboardTarget = useRef<UniqueIdentifier | null>(null);

  /**
   * Find the column under the pointer (or, for keyboard drags, under the dragged
   * card), then the closest card inside it. Plain closestCorners mis-targets tall,
   * empty columns: their bottom corners are far away, so the old slot "wins".
   */
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const hits = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
      const columnHit = hits.find((hit) => statusOfColumnId(hit.id) !== null);
      if (!columnHit) return closestCorners(args);

      const ids = new Set(columns[statusOfColumnId(columnHit.id)!].map((t) => t.id));
      const cards = args.droppableContainers.filter((c) => ids.has(String(c.id)));
      if (cards.length === 0) return [columnHit];
      return closestCenter({ ...args, droppableContainers: cards });
    },
    [columns],
  );

  /**
   * Board-aware keyboard moves: Left/Right jump to the neighboring column, Up/Down
   * step to the neighboring slot. sortableKeyboardCoordinates treats the card's own
   * column as a "left" candidate, so ArrowLeft would never leave the column.
   */
  const keyboardCoordinates = useCallback<KeyboardCoordinateGetter>((event, args) => {
    const { active, droppableContainers, collisionRect } = args.context;
    /**
     * Live rect of a drop target, scrolled into view first. dnd-kit's keyboard
     * sensor scrolls instead of moving when the target is off-screen (narrow
     * screens, long columns), so we bring it on-screen and measure it ourselves.
     */
    const reveal = (id: UniqueIdentifier) => {
      const node = droppableContainers.get(id)?.node.current;
      if (!node) return null;
      node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      return node.getBoundingClientRect();
    };
    if (!active || !collisionRect) return undefined;
    const current = live.current.columns;
    const status = TASK_STATUSES.find((s) => current[s].some((t) => t.id === active.id));
    if (!status) return sortableKeyboardCoordinates(event, args);

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      const target = TASK_STATUSES[TASK_STATUSES.indexOf(status) + (event.code === "ArrowRight" ? 1 : -1)];
      const rect = target && reveal(columnId(target));
      if (!rect) return undefined;
      keyboardTarget.current = null; // cross-column: onDragOver places the card
      return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top };
    }

    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
      // Same-column sorting is only visual until drop, so step from the current
      // target slot (or the card's own slot), not from the card's state index.
      const list = current[status];
      const from = keyboardTarget.current ?? active.id;
      const neighbor = list[list.findIndex((t) => t.id === from) + (event.code === "ArrowDown" ? 1 : -1)];
      const rect = neighbor && reveal(neighbor.id);
      if (!rect) return undefined;
      keyboardTarget.current = neighbor.id;
      return { x: rect.left, y: rect.top };
    }

    return sortableKeyboardCoordinates(event, args);
  }, []);

  const sensors = useSensors(
    // A small distance keeps clicks (task panel) from starting a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press and hold to drag, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Space picks a card up; Enter is free to open the task panel.
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  function onDragStart({ active }: DragStartEvent) {
    keyboardTarget.current = null;
    const task = liveTask(active.id);
    if (!task) return;
    dragStart.current = {
      status: task.status,
      index: live.current.columns[task.status].findIndex((t) => t.id === task.id),
    };
    setActiveId(task.id);
    setPreview(live.current.base);
  }

  // Cross-column moves happen while dragging so the card visibly joins the new column.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const task = liveTask(active.id);
    if (!task) return;
    const overStatus = statusOfColumnId(over.id) ?? liveTask(over.id)?.status;
    if (!overStatus || overStatus === task.status) return;

    const target = live.current.columns[overStatus];
    const overIndex = target.findIndex((t) => t.id === over.id);
    const index = overIndex === -1 ? target.length : overIndex;
    setPreview((current) => placeTask(current ?? live.current.base, task.id, overStatus, target, index));
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    const start = dragStart.current;
    const overId = keyboardTarget.current ?? over?.id;
    dragStart.current = null;
    keyboardTarget.current = null;
    const task = liveTask(active.id);
    setActiveId(null);
    setPreview(null);
    if (!task || !start || !overId) return;

    // Final order within the (possibly new) column.
    const list = live.current.columns[task.status];
    const oldIndex = list.findIndex((t) => t.id === task.id);
    const overIndex = list.findIndex((t) => t.id === overId);
    const ordered = oldIndex === -1 ? list : arrayMove(list, oldIndex, overIndex === -1 ? list.length - 1 : overIndex);
    const finalIndex = ordered.findIndex((t) => t.id === task.id);
    if (task.status === start.status && finalIndex === start.index) return; // dropped where it started

    const before = ordered[finalIndex - 1];
    const after = ordered[finalIndex + 1];
    // "from" is what the server currently says, so stale payloads get corrected.
    const server =
      live.current.serverTasks.find((t) => t.id === task.id) ?? live.current.base.find((t) => t.id === task.id);
    if (!server) return;
    const patchKey = boardStore.patch(server, { status: task.status, position: keyBetween(before, after) });

    try {
      const result = await boardStore.track(
        moveTask(slug, task.id, {
          status: task.status,
          beforeId: before?.id ?? null,
          afterId: after?.id ?? null,
        }),
      );
      if (!result.ok) throw new Error(result.error);
      boardStore.confirm(patchKey, { position: result.data.position });
    } catch (error) {
      boardStore.reject(patchKey);
      toast.error(error instanceof Error && error.message ? error.message : "Görev taşınamadı.");
    }
  }

  function onDragCancel() {
    dragStart.current = null;
    keyboardTarget.current = null;
    setActiveId(null);
    setPreview(null);
  }

  function openTask(task: BoardTask) {
    openTaskPanel(router, pathname, new URLSearchParams(searchParams), `${project.key}-${task.number}`);
  }

  async function onCreate(status: TaskStatus, title: string) {
    const last = live.current.tasks.filter((t) => t.status === status).sort(compareTasks).at(-1);
    const temp: BoardTask = {
      id: `temp-${crypto.randomUUID()}`,
      number: 0,
      title,
      status,
      priority: "NONE",
      position: keyBetween(last, undefined),
      dueDate: null,
      assignee: null,
      labels: [],
    };
    setPending((current) => [...current, temp]);

    try {
      const result = await boardStore.track(createTask(slug, project.id, { title, status }));
      if (!result.ok) throw new Error(result.error);
      boardStore.addCreated(project.id, result.data);
      return true;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Görev eklenemedi.");
      return false;
    } finally {
      setPending((current) => current.filter((t) => t.id !== temp.id));
    }
  }

  const announcements = useMemo<Announcements>(() => {
    const name = (id: UniqueIdentifier) => {
      const t = tasks.find((x) => x.id === id);
      return t ? `${project.key}-${t.number} ${t.title}` : "Görev";
    };
    /** "Yapılıyor sütunu, 2. sıra" style description of the drop target. */
    const where = (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
      const column = statusOfColumnId(overId);
      if (column) return `${STATUS_LABELS[column]} sütunu`;
      const target = tasks.find((x) => x.id === overId);
      if (!target) return "bir sütun";
      const list = tasks.filter((x) => x.status === target.status).sort(compareTasks);
      const index = list.findIndex((x) => x.id === overId);
      if (overId === activeId) return `${STATUS_LABELS[target.status]} sütunu, ${index + 1}. sıra`;
      return `${STATUS_LABELS[target.status]} sütunu, ${index + 1}. sıra (${project.key}-${target.number})`;
    };
    return {
      onDragStart: ({ active }) => `${name(active.id)} tutuldu.`,
      onDragOver: ({ active, over }) =>
        over ? `${name(active.id)}: ${where(active.id, over.id)}.` : `${name(active.id)} bir sütunun dışında.`,
      onDragEnd: ({ active, over }) =>
        over ? `${name(active.id)} bırakıldı: ${where(active.id, over.id)}.` : `${name(active.id)} bırakıldı.`,
      onDragCancel: ({ active }) => `Taşıma iptal edildi. ${name(active.id)} eski yerine döndü.`,
    };
  }, [tasks, project.key]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Görevi açmak için Enter tuşuna bas. Taşımak için boşluk tuşuyla tut, ok tuşlarıyla taşı, tekrar boşluk ile bırak; vazgeçmek için Escape.",
        },
      }}
    >
      {/* Faint dot grid behind the columns (decorative). */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:18px_18px] p-4 dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)]">
        {TASK_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columns[status]}
            projectKey={project.key}
            filtered={filtered}
            onCreate={onCreate}
            onOpen={openTask}
            quickAddRequest={status === "TODO" ? quickAddRequest : 0}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardContent task={activeTask} projectKey={project.key} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
