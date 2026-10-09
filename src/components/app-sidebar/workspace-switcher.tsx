"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { initials } from "@/lib/initials";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { setActiveWorkspace } from "@/server/workspaces";

type Workspace = { id: string; name: string; slug: string; role: Role };

export function WorkspaceSwitcher({ current, workspaces }: { current: Workspace; workspaces: Workspace[] }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" />}
          >
            <WorkspaceMark name={current.name} />
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{current.name}</span>
              <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[current.role]}</span>
            </span>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspace&apos;ler</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  // A real link: new tab / middle-click work too.
                  render={<Link href={`/w/${w.slug}`} />}
                  onClick={() => void setActiveWorkspace(w.slug)}
                >
                  <WorkspaceMark name={w.name} small />
                  <span className="truncate">{w.name}</span>
                  {w.id === current.id && <CheckIcon className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/onboarding" />}>
              <PlusIcon />
              Yeni workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function WorkspaceMark({ name, small }: { name: string; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        small
          ? "flex size-5 shrink-0 items-center justify-center rounded bg-linear-to-br from-sidebar-primary to-sidebar-primary/70 text-[10px] font-semibold text-sidebar-primary-foreground"
          : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-sidebar-primary to-sidebar-primary/70 text-xs font-semibold text-sidebar-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_-2px_var(--color-sidebar-primary)]"
      }
    >
      {initials(name)}
    </span>
  );
}
