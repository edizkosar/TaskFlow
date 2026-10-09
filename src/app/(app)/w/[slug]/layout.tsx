import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listMyWorkspaces, requireMember } from "@/server/access";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { session, workspace, role } = await requireMember(slug);
  const workspaces = await listMyWorkspaces(session.user.id);
  // Written by SidebarProvider when the sidebar is toggled.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        current={{ id: workspace.id, name: workspace.name, slug: workspace.slug, role }}
        workspaces={workspaces}
        user={{ name: session.user.name, email: session.user.email }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
