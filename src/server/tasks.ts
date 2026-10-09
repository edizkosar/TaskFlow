"use server";

import { generateKeyBetween } from "fractional-indexing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { TASK_STATUSES } from "@/lib/task-status";
import type { BoardTask } from "@/lib/task-types";
import { requireMember } from "@/server/access";
import { toBoardTask, boardTaskSelect } from "@/server/task-dto";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const statusSchema = z.enum(TASK_STATUSES);

const projectPath = (slug: string, key: string) => `/w/${slug}/p/${key}`;

/** Loads a project and checks it belongs to the (authorized) workspace. */
async function requireProject(slug: string, projectId: string) {
  const { workspace, session } = await requireMember(slug);
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: workspace.id },
    select: { id: true, key: true },
  });
  return { project, session };
}

// --- Create -------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().trim().min(1, "Başlık gerekli.").max(200, "En fazla 200 karakter."),
  status: statusSchema,
});

export async function createTask(
  slug: string,
  projectId: string,
  input: { title: string; status: string },
): Promise<Result<BoardTask>> {
  const { project, session } = await requireProject(slug, projectId);
  if (!project) return { ok: false, error: "Proje bulunamadı." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { title, status } = parsed.data;

  const task = await prisma.$transaction(async (tx) => {
    // Atomic increment hands out unique per-project numbers.
    const { taskCounter } = await tx.project.update({
      where: { id: project.id },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true },
    });
    const last = await tx.task.findFirst({
      where: { projectId: project.id, status },
      orderBy: [{ position: "desc" }, { id: "desc" }],
      select: { position: true },
    });
    return tx.task.create({
      data: {
        projectId: project.id,
        number: taskCounter,
        title,
        status,
        position: generateKeyBetween(last?.position ?? null, null),
        creatorId: session.user.id,
      },
      select: boardTaskSelect,
    });
  });

  revalidatePath(projectPath(slug, project.key));
  return { ok: true, data: toBoardTask(task) };
}

// --- Move ---------------------------------------------------------------------

const moveSchema = z.object({
  status: statusSchema,
  /** Task directly above the drop point in the target column, if any. */
  beforeId: z.string().nullable(),
  /** Task directly below the drop point in the target column, if any. */
  afterId: z.string().nullable(),
});

/**
 * Moves a task to `status` between two neighbors. The client sends neighbor ids,
 * not positions: the server derives the key from current DB values.
 */
export async function moveTask(
  slug: string,
  taskId: string,
  input: { status: string; beforeId: string | null; afterId: string | null },
): Promise<Result<{ position: string }>> {
  const { workspace } = await requireMember(slug);
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz taşıma." };
  const { status, beforeId, afterId } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: workspace.id } },
    select: { id: true, projectId: true, project: { select: { key: true } } },
  });
  if (!task) return { ok: false, error: "Görev bulunamadı." };

  // Neighbors must be in the same project and target column; otherwise ignore them.
  const neighborIds = [beforeId, afterId].filter((id): id is string => !!id && id !== taskId);
  const neighbors = await prisma.task.findMany({
    where: { id: { in: neighborIds }, projectId: task.projectId, status },
    select: { id: true, position: true },
  });
  const before = neighbors.find((n) => n.id === beforeId)?.position ?? null;
  const after = neighbors.find((n) => n.id === afterId)?.position ?? null;

  let position: string;
  if (before !== null && after !== null && before >= after) {
    // Stale neighbors (someone moved them meanwhile) or a position tie: append to the column.
    const last = await prisma.task.findFirst({
      where: { projectId: task.projectId, status, id: { not: taskId } },
      orderBy: [{ position: "desc" }, { id: "desc" }],
      select: { position: true },
    });
    position = generateKeyBetween(last?.position ?? null, null);
  } else {
    position = generateKeyBetween(before, after);
  }

  await prisma.task.update({ where: { id: task.id }, data: { status, position } });

  revalidatePath(projectPath(slug, task.project.key));
  return { ok: true, data: { position } };
}
