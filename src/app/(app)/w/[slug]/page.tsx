import { FolderKanbanIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { NewProjectButton } from "@/components/project/new-project-button";
import { hasRole } from "@/lib/roles";
import { requireMember } from "@/server/access";
import { listProjects } from "@/server/queries";

export async function generateMetadata({ params }: PageProps<"/w/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { workspace } = await requireMember(slug);
  return { title: workspace.name };
}

/** Opens the first project; shows an empty state when there are none. */
export default async function WorkspacePage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, role } = await requireMember(slug);
  const projects = await listProjects(workspace.id);
  if (projects.length > 0) redirect(`/w/${slug}/p/${projects[0].key}`);

  const canCreate = hasRole(role, "admin");

  return (
    <>
      <PageHeader title="Projeler" />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          {/* Icon tile with a soft accent glow. */}
          <div className="relative mb-2">
            <div aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-primary/25 blur-2xl" />
            <div className="flex size-16 items-center justify-center rounded-2xl bg-card ring-1 ring-border/60 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <FolderKanbanIcon aria-hidden strokeWidth={1.5} className="size-7 text-primary dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{workspace.name} için ilk proje</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {canCreate
              ? "Projeler görevleri bir araya toplar: bir uygulama, bir kampanya ya da bir sprint. Kanban panosu proje içinde açılır."
              : "Bu workspace'te henüz proje yok. Bir yönetici proje oluşturduğunda burada görünecek."}
          </p>
          {canCreate && <NewProjectButton slug={slug} />}
        </div>
      </div>
    </>
  );
}
