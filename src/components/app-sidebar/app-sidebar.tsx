"use client";

import { FolderKanbanIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Role } from "@/lib/roles";

import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Workspace = { id: string; name: string; slug: string; role: Role };

export function AppSidebar({
  current,
  workspaces,
  user,
}: {
  current: Workspace;
  workspaces: Workspace[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const base = `/w/${current.slug}`;
  const nav = [
    { href: base, label: "Projeler", icon: FolderKanbanIcon, active: pathname === base },
    {
      href: `${base}/settings`,
      label: "Ayarlar",
      icon: SettingsIcon,
      active: pathname.startsWith(`${base}/settings`),
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item.active}
                    tooltip={item.label}
                    render={<Link href={item.href} aria-current={item.active ? "page" : undefined} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
