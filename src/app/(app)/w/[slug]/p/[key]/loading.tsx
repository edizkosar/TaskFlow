import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES } from "@/lib/task-status";

export default function ProjectLoading() {
  return (
    <div className="flex h-svh min-h-0 flex-col" aria-busy="true" aria-label="Proje yükleniyor">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Skeleton className="size-7" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        {TASK_STATUSES.map((status, i) => (
          <div key={status} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-2 md:w-auto md:min-w-56 md:flex-1">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 - (i % 2) }, (_, j) => (
              <Skeleton key={j} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
