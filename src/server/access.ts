import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasRole, parseRole, type Role } from "@/lib/roles";

/** Current session or null. Memoized per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Current session; redirects to /login when signed out. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Workspaces the user belongs to, oldest membership first. */
export const listMyWorkspaces = cache(async (userId: string) => {
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.organization, role: parseRole(m.role) }));
});

/**
 * Workspace + the current user's role, by slug. Responds 404 (not 403) when the
 * user is not a member so workspace slugs don't leak.
 */
export const requireMember = cache(async (slug: string, minRole: Role = "member") => {
  const session = await requireSession();
  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organization: { slug } },
    include: { organization: true },
  });
  if (!membership) notFound();

  const role = parseRole(membership.role);
  if (!hasRole(role, minRole)) notFound();

  return { session, workspace: membership.organization, role, memberId: membership.id };
});
