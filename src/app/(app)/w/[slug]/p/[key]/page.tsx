import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BoardContainer } from "@/components/board/board-container";
import { FilterBar } from "@/components/board/filter-bar";
import { PageHeader } from "@/components/page-header";
import { ProjectActions } from "@/components/project/project-actions";
import { TaskPanelBody, TaskPanelSkeleton } from "@/components/task/task-panel-body";
import { TaskPanelShell } from "@/components/task/task-panel-shell";
import { hasRole } from "@/lib/roles";
import { requireMember } from "@/server/access";
import { getProjectByKey, listBoardTasks, listLabels, listMembers } from "@/server/queries";

async function load(params: PageProps<"/w/[slug]/p/[key]">["params"]) {
  const { slug, key } = await params;
  const { workspace, role, session } = await requireMember(slug);
  const project = await getProjectByKey(workspace.id, key);
  if (!project) notFound();
  return { slug, role, session, workspace, project };
}

export async function generateMetadata({ params }: PageProps<"/w/[slug]/p/[key]">): Promise<Metadata> {
  const { project } = await load(params);
  return { title: project.name };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/w/[slug]/p/[key]">) {
  const { slug, role, session, workspace, project } = await load(params);
  const { task } = await searchParams;
  const taskParam = typeof task === "string" ? task : null;
  const [tasks, members, labels] = await Promise.all([
    listBoardTasks(project.id),
    listMembers(workspace.id),
    listLabels(workspace.id),
  ]);

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <PageHeader title={project.name}>
        <span className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground" translate="no">
          {project.key}
        </span>
        {hasRole(role, "admin") && (
          <ProjectActions
            slug={slug}
            project={{ id: project.id, name: project.name, key: project.key, description: project.description }}
          />
        )}
      </PageHeader>
      {project.description && (
        <p className="border-b px-4 py-2 text-sm text-muted-foreground">{project.description}</p>
      )}
      <FilterBar members={members} labels={labels} currentUserId={session.user.id} />
      <BoardContainer
        // Fresh board per project: no drag preview or pending creates carry over.
        key={project.id}
        slug={slug}
        project={{ id: project.id, key: project.key }}
        tasks={tasks}
        currentUserId={session.user.id}
      />
      <TaskPanelShell>
        {/* Keyed by task so switching tasks shows the skeleton, not the previous task. */}
        <Suspense key={taskParam} fallback={<TaskPanelSkeleton />}>
          {taskParam && (
            <TaskPanelBody
              slug={slug}
              project={{ id: project.id, key: project.key }}
              taskParam={taskParam}
              members={members}
              labels={labels}
              viewer={{ id: session.user.id, isAdmin: hasRole(role, "admin") }}
            />
          )}
        </Suspense>
      </TaskPanelShell>
    </div>
  );
}
