"use client";

import {
  FolderKanbanIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { StatusIcon } from "@/components/board/status-icon";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { foldForSearch, type SearchResult } from "@/lib/search";
import { isPaletteShortcut, NEW_TASK_EVENT, OPEN_PALETTE_EVENT } from "@/lib/shortcuts";
import { forgetTaskPanelHistory, openTaskPanel } from "@/lib/task-url";

type Project = { id: string; name: string; key: string };

const DEBOUNCE_MS = 200;

/**
 * Ctrl/Cmd+K palette. Projects, navigation and actions filter on the client;
 * tasks come from GET /api/w/:slug/search (debounced, stale requests aborted).
 */
export function CommandPalette({ slug, projects }: { slug: string; projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ query: string; tasks: SearchResult[]; failed: boolean } | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    };
  }, []);

  // Server task search: debounce, and abort the previous request on every keystroke.
  const trimmed = query.trim();
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/w/${slug}/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { tasks: SearchResult[] };
        setSearch({ query: trimmed, tasks: data.tasks, failed: false });
      } catch {
        if (!controller.signal.aborted) setSearch({ query: trimmed, tasks: [], failed: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed, slug]);

  // Only show results that belong to what's typed now.
  const taskResults = search && search.query === trimmed ? search : null;
  const searching = trimmed.length >= 2 && !taskResults;

  const folded = foldForSearch(trimmed);
  const matches = (...texts: string[]) => !folded || texts.some((t) => foldForSearch(t).includes(folded));

  const projectMatch = pathname.match(/^\/w\/[^/]+\/p\/([^/]+)/);
  const currentProjectKey = projectMatch?.[1];

  const actions = useMemo(
    () =>
      [
        currentProjectKey && {
          id: "new-task",
          label: "Yeni görev",
          keywords: ["oluştur", "ekle", "task"],
          icon: PlusIcon,
          shortcut: "C",
          run: () => window.dispatchEvent(new Event(NEW_TASK_EVENT)),
        },
        {
          id: "settings",
          label: "Ayarlar",
          keywords: ["üyeler", "davet", "workspace"],
          icon: SettingsIcon,
          run: () => router.push(`/w/${slug}/settings`),
        },
        { id: "theme-light", label: "Tema: Açık", keywords: ["light"], icon: SunIcon, run: () => setTheme("light") },
        { id: "theme-dark", label: "Tema: Koyu", keywords: ["dark"], icon: MoonIcon, run: () => setTheme("dark") },
        {
          id: "theme-system",
          label: "Tema: Sistem",
          keywords: ["system", "otomatik"],
          icon: MonitorIcon,
          run: () => setTheme("system"),
        },
      ].filter((a): a is Exclude<typeof a, "" | undefined> => Boolean(a)),
    [currentProjectKey, router, setTheme, slug],
  );

  function run(action: () => void) {
    setOpen(false);
    setQuery("");
    action();
  }

  function openTask(task: SearchResult) {
    const projectPath = `/w/${slug}/p/${task.key}`;
    const id = `${task.key}-${task.number}`;
    if (pathname === projectPath) {
      openTaskPanel(router, pathname, new URLSearchParams(window.location.search), id);
    } else {
      // Different page: closing the panel later should stay on that project.
      forgetTaskPanelHistory();
      router.push(`${projectPath}?task=${id}`);
    }
  }

  const visibleProjects = projects.filter((p) => matches(p.name, p.key));
  const visibleActions = actions.filter((a) => matches(a.label, ...a.keywords));

  return (
    <CommandDialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
      title="Komut paleti"
      description="Görev, proje ya da komut ara"
    >
      {/* Filtering is ours (Turkish-aware + server results), not cmdk's. */}
      <Command shouldFilter={false} loop>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Görev, proje ya da komut ara…"
          aria-label="Görev, proje ya da komut ara"
        />
        {/* Announce search progress and results to screen readers. */}
        <p role="status" aria-live="polite" className="sr-only">
          {trimmed.length < 2
            ? ""
            : searching
              ? "Aranıyor"
              : `${taskResults?.tasks.length ?? 0} görev, ${visibleProjects.length} proje, ${visibleActions.length} komut bulundu`}
        </p>
        <CommandList>
          <CommandEmpty>{searching ? "Aranıyor…" : "Sonuç yok."}</CommandEmpty>

          {trimmed.length >= 2 && taskResults && taskResults.tasks.length > 0 && (
            <CommandGroup heading="Görevler">
              {taskResults.tasks.map((task) => (
                <CommandItem key={task.id} value={`task-${task.id}`} onSelect={() => run(() => openTask(task))}>
                  <StatusIcon status={task.status} />
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground" translate="no">
                    {task.key}-{task.number}
                  </span>
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{task.projectName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {taskResults?.failed && (
            <p role="status" className="px-3 py-2 text-xs text-destructive">
              Görev araması şu an yapılamıyor.
            </p>
          )}

          {visibleProjects.length > 0 && (
            <CommandGroup heading="Projeler">
              {visibleProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project-${project.id}`}
                  onSelect={() => run(() => router.push(`/w/${slug}/p/${project.key}`))}
                >
                  <FolderKanbanIcon />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground" translate="no">
                    {project.key}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {visibleActions.length > 0 && (
            <CommandGroup heading="Komutlar">
              {visibleActions.map((action) => (
                <CommandItem key={action.id} value={action.id} onSelect={() => run(action.run)}>
                  <action.icon />
                  <span>{action.label}</span>
                  {"shortcut" in action && action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
