"use client";

import { LinkIcon, Trash2Icon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { boardStore } from "@/components/board/optimistic-store";
import { StatusIcon } from "@/components/board/status-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/task-status";
import { PRIORITY_LABELS, TASK_PRIORITIES, type BoardMember, type TaskDetail, type TaskPriority } from "@/lib/task-types";
import { closeTaskPanel } from "@/lib/task-url";
import { cn } from "@/lib/utils";
import { deleteTask, setTaskLabels, updateTask } from "@/server/tasks";

import { TaskComments } from "./task-comments";
import { LabelPicker } from "./label-picker";
import { saveTaskPatch, useOptimisticTask } from "./use-task-save";

type Props = {
  slug: string;
  projectKey: string;
  task: TaskDetail;
  members: BoardMember[];
  labels: { id: string; name: string; color: string }[];
  viewer: { id: string; isAdmin: boolean };
};

const UNASSIGNED = "none";
const dateTimeFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export function TaskPanelContent({ slug, projectKey, task: serverTask, members, labels, viewer }: Props) {
  const task = useOptimisticTask(serverTask);
  const taskId = `${projectKey}-${task.number}`;
  const canDelete = viewer.isAdmin || serverTask.creator?.id === viewer.id;

  const statusItems = TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
  const priorityItems = TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));
  const assigneeItems = [
    { value: UNASSIGNED, label: "Atanmamış" },
    ...members.map((m) => ({ value: m.id, label: m.id === viewer.id ? `${m.name} (sen)` : m.name })),
  ];

  return (
    <article className="flex flex-col">
      <PanelHeader slug={slug} taskId={taskId} serverTaskId={serverTask.id} canDelete={canDelete} title={task.title} />

      <div className="flex flex-col gap-7 px-6 pb-10">
        <TitleField
          key={serverTask.title}
          value={task.title}
          onSave={(title) =>
            saveTaskPatch(serverTask, { title }, () => updateTask(slug, serverTask.id, { title }))
          }
        />

        <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-2.5 rounded-xl bg-muted/30 p-4 text-sm ring-1 ring-border/40 dark:bg-white/[0.02]">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Durum</dt>
          <dd>
            <Select
              value={task.status}
              items={statusItems}
              onValueChange={(value) => {
                const status = value as TaskStatus;
                if (status === task.status) return;
                void saveTaskPatch(
                  serverTask,
                  { status },
                  () => updateTask(slug, serverTask.id, { status }),
                  (data) => ({ status: data.status, position: data.position }),
                );
              }}
            >
              <SelectTrigger size="sm" aria-label="Durum" className="w-44 border-transparent bg-transparent shadow-none transition-colors duration-200 hover:bg-background/80 dark:bg-transparent dark:hover:bg-white/[0.05]">
                <StatusIcon status={task.status} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Öncelik</dt>
          <dd>
            <Select
              value={task.priority}
              items={priorityItems}
              onValueChange={(value) => {
                const priority = value as TaskPriority;
                if (priority === task.priority) return;
                void saveTaskPatch(serverTask, { priority }, () => updateTask(slug, serverTask.id, { priority }));
              }}
            >
              <SelectTrigger size="sm" aria-label="Öncelik" className="w-44 border-transparent bg-transparent shadow-none transition-colors duration-200 hover:bg-background/80 dark:bg-transparent dark:hover:bg-white/[0.05]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Atanan</dt>
          <dd>
            <Select
              value={task.assignee?.id ?? UNASSIGNED}
              items={assigneeItems}
              onValueChange={(value) => {
                const assigneeId = !value || value === UNASSIGNED ? null : value;
                if (assigneeId === (task.assignee?.id ?? null)) return;
                const member = members.find((m) => m.id === assigneeId);
                void saveTaskPatch(
                  serverTask,
                  { assignee: member ? { id: member.id, name: member.name } : null },
                  () => updateTask(slug, serverTask.id, { assigneeId }),
                );
              }}
            >
              <SelectTrigger size="sm" aria-label="Atanan" className="w-44 border-transparent bg-transparent shadow-none transition-colors duration-200 hover:bg-background/80 dark:bg-transparent dark:hover:bg-white/[0.05]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assigneeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>

          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <label htmlFor="task-due-date">Bitiş tarihi</label>
          </dt>
          <dd>
            <DueDateField
              key={serverTask.dueDate ?? "none"}
              value={task.dueDate}
              onSave={(dueDate) =>
                saveTaskPatch(serverTask, { dueDate }, () => updateTask(slug, serverTask.id, { dueDate }))
              }
            />
          </dd>

          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Etiketler</dt>
          <dd>
            <LabelPicker
              slug={slug}
              workspaceLabels={labels}
              selected={task.labels}
              onChange={(next) => {
                const sorted = [...next].sort((a, b) => a.name.localeCompare(b.name, "tr"));
                void saveTaskPatch(
                  serverTask,
                  { labels: sorted },
                  () =>
                    setTaskLabels(
                      slug,
                      serverTask.id,
                      sorted.map((l) => l.id),
                    ),
                  (data) => ({ labels: data }),
                );
              }}
            />
          </dd>
        </dl>

        <DescriptionField
          key={serverTask.description ?? ""}
          value={serverTask.description ?? ""}
          onSave={async (description) => {
            const result = await boardStore.track(updateTask(slug, serverTask.id, { description }));
            if (!result.ok) toast.error(result.error);
            return result.ok;
          }}
        />

        <p className="text-xs text-muted-foreground">
          {serverTask.creator ? `${serverTask.creator.name} oluşturdu` : "Oluşturuldu"},{" "}
          {dateTimeFormat.format(new Date(serverTask.createdAt))}
        </p>

        <TaskComments slug={slug} taskId={serverTask.id} comments={serverTask.comments} viewerId={viewer.id} />
      </div>
    </article>
  );
}

function PanelHeader({
  slug,
  taskId,
  serverTaskId,
  canDelete,
  title,
}: {
  slug: string;
  taskId: string;
  serverTaskId: string;
  canDelete: boolean;
  title: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function close() {
    closeTaskPanel(router, pathname, new URLSearchParams(searchParams));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Görev linki kopyalandı");
    } catch {
      toast.error("Kopyalanamadı.");
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await boardStore.track(deleteTask(slug, serverTaskId));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      boardStore.markDeleted(serverTaskId);
      toast.success(`${taskId} silindi`);
      close();
    });
  }

  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-border/40 bg-background/70 px-5 py-2.5 backdrop-blur-md">
      <span className="font-mono text-xs text-muted-foreground" translate="no">
        {taskId}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={copyLink} title="Linki kopyala">
          <LinkIcon />
          <span className="sr-only">Görev linkini kopyala</span>
        </Button>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" title="Görevi sil" />}>
              <Trash2Icon />
              <span className="sr-only">Görevi sil</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{taskId} silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{title}&quot; ve yorumları kalıcı olarak silinir. Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>
                  Görevi sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button variant="ghost" size="icon-sm" onClick={close} title="Kapat (Esc)">
          <XIcon />
          <span className="sr-only">Paneli kapat</span>
        </Button>
      </div>
    </header>
  );
}

/** Linear-style title: always editable. Enter or blur saves, Escape reverts. */
function TitleField({ value, onSave }: { value: string; onSave: (title: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);

  async function commit() {
    const title = draft.trim();
    if (!title) {
      setDraft(value);
      toast.error("Başlık boş olamaz.");
      return;
    }
    if (title === value) return;
    if (!(await onSave(title))) setDraft(value);
  }

  return (
    <div className="pt-4">
      <label htmlFor="task-title" className="sr-only">
        Başlık
      </label>
      <textarea
        id="task-title"
        value={draft}
        rows={1}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            // Revert instead of closing the panel.
            e.stopPropagation();
            setDraft(value);
            requestAnimationFrame(() => (e.target as HTMLTextAreaElement).blur());
          }
        }}
        className="field-sizing-content w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 -mx-1.5 text-2xl leading-tight font-semibold tracking-tight outline-none transition-colors duration-200 hover:border-border/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}

/** Plain-text description. Ctrl/Cmd+Enter or blur saves, Escape reverts. */
function DescriptionField({ value, onSave }: { value: string; onSave: (description: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (draft === value) return;
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (!ok) setDraft(value);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="task-description" className="text-sm font-medium">
        Açıklama
      </label>
      <textarea
        id="task-description"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(value);
            requestAnimationFrame(() => (e.target as HTMLTextAreaElement).blur());
          }
        }}
        placeholder="Açıklama ekle…"
        maxLength={10_000}
        aria-describedby="task-description-hint"
        className="field-sizing-content min-h-24 w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 -mx-1.5 text-sm leading-relaxed outline-none transition-colors duration-200 placeholder:text-muted-foreground hover:border-border/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <p id="task-description-hint" className={cn("text-xs text-muted-foreground", saving && "animate-pulse")}>
        {saving ? "Kaydediliyor…" : "Kaydetmek için Ctrl+Enter ya da alanın dışına tıkla. Esc değişikliği geri alır."}
      </p>
    </div>
  );
}

/** Native date input (accessible, localized). Saves on blur or Enter, and when cleared. */
function DueDateField({ value, onSave }: { value: string | null; onSave: (date: string | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value ?? "");

  async function commit(next: string) {
    const normalized = next || null;
    if (normalized === value) return;
    if (!(await onSave(normalized))) setDraft(value ?? "");
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        id="task-due-date"
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => void commit(e.target.value)}
        // Not on every change: typing the year emits 0002, 0020, 0202… as valid dates.
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-7 w-44"
      />
      {draft && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setDraft("");
            void commit("");
          }}
          title="Tarihi kaldır"
        >
          <XIcon />
          <span className="sr-only">Bitiş tarihini kaldır</span>
        </Button>
      )}
    </div>
  );
}
