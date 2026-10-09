import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listMyWorkspaces, requireMember } from "@/server/access";
import { listProjects } from "@/server/queries";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { session, workspace, role } = await requireMember(slug);
  const [workspaces, projects] = await Promise.all([
    listMyWorkspaces(session.user.id),
    listProjects(workspace.id),
  ]);
  // Written by SidebarProvider when the sidebar is toggled.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        current={{ id: workspace.id, name: workspace.name, slug: workspace.slug, role }}
        workspaces={workspaces}
        projects={projects}
        user={{ name: session.user.name, email: session.user.email }}
      />
      {/* min-w-0 lets wide content (the board) scroll inside instead of widening the page. */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
