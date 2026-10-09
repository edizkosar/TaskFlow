import { Skeleton } from "@/components/ui/skeleton";
import { parseTaskParam } from "@/lib/task-url";
import type { BoardMember } from "@/lib/task-types";
import { getTaskDetail } from "@/server/queries";

import { TaskPanelContent } from "./task-panel-content";

/** Server part of the panel: loads the task named in `?task=`. */
export async function TaskPanelBody({
  slug,
  project,
  taskParam,
  members,
  labels,
  viewer,
}: {
  slug: string;
  project: { id: string; key: string };
  taskParam: string;
  members: BoardMember[];
  labels: { id: string; name: string; color: string }[];
  viewer: { id: string; isAdmin: boolean };
}) {
  const parsed = parseTaskParam(taskParam);
  const task = parsed && parsed.key === project.key ? await getTaskDetail(project.id, parsed.number) : null;

  if (!task) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-semibold">Görev bulunamadı</h2>
        <p className="text-sm text-muted-foreground">
          {taskParam} bu projede yok ya da silinmiş olabilir.
        </p>
      </div>
    );
  }

  return (
    <TaskPanelContent
      key={task.id}
      slug={slug}
      projectKey={project.key}
      task={task}
      members={members}
      labels={labels}
      viewer={viewer}
    />
  );
}

export function TaskPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6" aria-busy="true" aria-label="Görev yükleniyor">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-3/4" />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="col-span-2 h-8" />
        ))}
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
