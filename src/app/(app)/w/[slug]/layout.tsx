import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
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
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        İçeriğe atla
      </a>
      <AppSidebar
        current={{ id: workspace.id, name: workspace.name, slug: workspace.slug, role }}
        workspaces={workspaces}
        projects={projects}
        user={{ name: session.user.name, email: session.user.email }}
      />
      {/* min-w-0 lets wide content (the board) scroll inside instead of widening the page. */}
      <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 outline-none">
        {children}
      </SidebarInset>
      <CommandPalette slug={workspace.slug} projects={projects} />
    </SidebarProvider>
  );
}
