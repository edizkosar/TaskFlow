import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardContainer } from "@/components/board/board-container";
import { FilterBar } from "@/components/board/filter-bar";
import { PageHeader } from "@/components/page-header";
import { ProjectActions } from "@/components/project/project-actions";
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

export default async function ProjectPage({ params }: PageProps<"/w/[slug]/p/[key]">) {
  const { slug, role, session, workspace, project } = await load(params);
  const [tasks, members, labels] = await Promise.all([
    listBoardTasks(project.id),
    listMembers(workspace.id),
    listLabels(workspace.id),
  ]);

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <PageHeader title={project.name}>
        <span className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{project.key}</span>
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
        slug={slug}
        project={{ id: project.id, key: project.key }}
        tasks={tasks}
        currentUserId={session.user.id}
      />
    </div>
  );
}
