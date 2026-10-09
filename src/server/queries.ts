import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { compareTasks } from "@/lib/task-types";
import { boardTaskSelect, toBoardTask } from "@/server/task-dto";

// Read-only data helpers. Callers must have authorized access to the workspace
// (requireMember) first; these do not check permissions themselves.

export const listProjects = cache(async (organizationId: string) => {
  return prisma.project.findMany({
    where: { organizationId },
    select: { id: true, name: true, key: true },
    orderBy: { createdAt: "asc" },
  });
});

export const getProjectByKey = cache(async (organizationId: string, key: string) => {
  return prisma.project.findUnique({
    where: { organizationId_key: { organizationId, key: key.toUpperCase() } },
  });
});

/** All tasks of a project in board order. MVP: no pagination. */
export const listBoardTasks = cache(async (projectId: string) => {
  const rows = await prisma.task.findMany({
    where: { projectId },
    select: boardTaskSelect,
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  // Sort in JS too, so order never depends on DB collation settings.
  return rows.map(toBoardTask).sort(compareTasks);
});

/** Workspace members as assignee options, by name. */
export const listMembers = cache(async (organizationId: string) => {
  const members = await prisma.member.findMany({
    where: { organizationId },
    select: { user: { select: { id: true, name: true } } },
  });
  return members.map((m) => m.user).sort((a, b) => a.name.localeCompare(b.name, "tr"));
});

export const listLabels = cache(async (organizationId: string) => {
  return prisma.label.findMany({
    where: { organizationId },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
});
