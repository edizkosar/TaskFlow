"use client";

import { PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ProjectFormDialog } from "@/components/project/project-form-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { LABEL_COLORS, labelColorClass } from "@/lib/labels";
import { hasRole, type Role } from "@/lib/roles";
import { OPEN_PALETTE_EVENT } from "@/lib/shortcuts";

import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Workspace = { id: string; name: string; slug: string; role: Role };
type Project = { id: string; name: string; key: string };

export function AppSidebar({
  current,
  workspaces,
  projects,
  user,
}: {
  current: Workspace;
  workspaces: Workspace[];
  projects: Project[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
  const base = `/w/${current.slug}`;
  const canManageProjects = hasRole(current.role, "admin");
  const settingsActive = pathname.startsWith(`${base}/settings`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Ara (Ctrl+K)"
              onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
              aria-keyshortcuts="Control+K Meta+K"
            >
              <SearchIcon />
              <span>Ara</span>
              <kbd className="ml-auto rounded border px-1 font-sans text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                Ctrl K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projeler</SidebarGroupLabel>
          {canManageProjects && (
            <SidebarGroupAction title="Yeni proje" onClick={() => setCreating(true)}>
              <PlusIcon />
              <span className="sr-only">Yeni proje</span>
            </SidebarGroupAction>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const href = `${base}/p/${project.key}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={project.name}
                      render={<Link href={href} aria-current={active ? "page" : undefined} />}
                    >
                      <ProjectKeyMark projectKey={project.key} />
                      <span className="truncate">{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {projects.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  {canManageProjects ? "İlk projeni + ile oluştur." : "Henüz proje yok."}
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={settingsActive}
                  tooltip="Ayarlar"
                  render={<Link href={`${base}/settings`} aria-current={settingsActive ? "page" : undefined} />}
                >
                  <SettingsIcon />
                  <span>Ayarlar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />

      {canManageProjects && (
        <ProjectFormDialog mode="create" slug={current.slug} open={creating} onOpenChange={setCreating} />
      )}
    </Sidebar>
  );
}

const MARK_COLORS = Object.keys(LABEL_COLORS).filter((c) => c !== "gray");

/** Square badge with the project key's first letter; color derived from the key. */
function ProjectKeyMark({ projectKey }: { projectKey: string }) {
  const hash = [...projectKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] font-mono text-[10px] leading-none font-semibold ring-1 ring-inset ${labelColorClass(MARK_COLORS[hash % MARK_COLORS.length])}`}
    >
      {projectKey[0]}
    </span>
  );
}
