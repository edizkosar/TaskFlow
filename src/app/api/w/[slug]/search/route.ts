import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { escapeLike, foldForSearch, type SearchResult } from "@/lib/search";
import type { TaskStatus } from "@/lib/task-status";
import { parseTaskParam } from "@/lib/task-url";

const LIMIT = 20;

/**
 * Task search for the command palette: GET /api/w/:slug/search?q=…
 * A Route Handler (not a Server Action) because it's a read: GETs run in
 * parallel and can be aborted, while Server Actions are queued one at a time.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/w/[slug]/search">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Oturum gerekli." }, { status: 401 });

  const { slug } = await ctx.params;
  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organization: { slug } },
    select: { organizationId: true },
  });
  // 404, not 403: don't reveal whether the workspace exists.
  if (!membership) return Response.json({ error: "Bulunamadı." }, { status: 404 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ tasks: [] satisfies SearchResult[] });

  // "MOB-12" jumps straight to that task.
  const exact = parseTaskParam(q);
  const pattern = `%${escapeLike(foldForSearch(q))}%`;

  const rows = await prisma.$queryRaw<
    { id: string; key: string; number: number; title: string; status: TaskStatus; projectName: string }[]
  >`
    SELECT t.id, p.key, t.number, t.title, t.status::text AS status, p.name AS "projectName"
    FROM task t
    JOIN project p ON p.id = t."projectId"
    WHERE p."organizationId" = ${membership.organizationId}
      AND (
        translate(lower(t.title), 'ı', 'i') LIKE ${pattern}
        OR (${exact?.key ?? null}::text IS NOT NULL AND p.key = ${exact?.key ?? null} AND t.number = ${exact?.number ?? null}::int)
      )
    ORDER BY (p.key = ${exact?.key ?? null} AND t.number = ${exact?.number ?? null}::int) DESC NULLS LAST,
             t."updatedAt" DESC
    LIMIT ${LIMIT}
  `;

  return Response.json(
    { tasks: rows satisfies SearchResult[] },
    // Per-user data: never cache in shared caches.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
