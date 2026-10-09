import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";

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
