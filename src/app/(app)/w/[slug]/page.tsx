import { FolderKanbanIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/server/access";

export async function generateMetadata({ params }: PageProps<"/w/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { workspace } = await requireMember(slug);
  return { title: workspace.name };
}

// Phase 2 replaces this with the project list.
export default async function WorkspacePage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  await requireMember(slug);

  return (
    <>
      <PageHeader title="Projeler" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <FolderKanbanIcon className="size-10 text-muted-foreground" aria-hidden />
        <h2 className="text-lg font-medium">Henüz proje yok</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Projeler ve Kanban panosu bir sonraki adımda geliyor. Şimdilik Ayarlar&apos;dan ekip
          arkadaşlarını davet edebilirsin.
        </p>
      </div>
    </>
  );
}
