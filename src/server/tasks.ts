"use server";

import { generateKeyBetween } from "fractional-indexing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { LABEL_COLORS } from "@/lib/labels";
import { hasRole } from "@/lib/roles";
import { TASK_STATUSES } from "@/lib/task-status";
import { TASK_PRIORITIES, type BoardTask } from "@/lib/task-types";
import { requireMember } from "@/server/access";
import { boardTaskSelect, toBoardTask } from "@/server/task-dto";

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

// --- Task panel ---------------------------------------------------------------

/** Task in the authorized workspace, with what permission checks need. */
async function requireTask(slug: string, taskId: string) {
  const access = await requireMember(slug);
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: access.workspace.id } },
    select: { id: true, projectId: true, status: true, creatorId: true, project: { select: { key: true } } },
  });
  return { ...access, task };
}

const NOT_FOUND = { ok: false, error: "Görev bulunamadı." } as const;

const updateSchema = z
  .object({
    title: z.string().trim().min(1, "Başlık boş olamaz.").max(200, "Başlık en fazla 200 karakter."),
    description: z
      .string()
      .max(10_000, "Açıklama en fazla 10.000 karakter.")
      .transform((v) => (v.trim() ? v : null)),
    status: statusSchema,
    priority: z.enum(TASK_PRIORITIES),
    assigneeId: z.string().nullable(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih.")
      .nullable(),
  })
  .partial()
  .strict();

export type TaskUpdate = z.input<typeof updateSchema>;

/** Updates any subset of panel fields. Returns the fresh board view of the task. */
export async function updateTask(slug: string, taskId: string, input: TaskUpdate): Promise<Result<BoardTask>> {
  const { task, workspace } = await requireTask(slug, taskId);
  if (!task) return NOT_FOUND;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { dueDate, assigneeId, status, ...rest } = parsed.data;

  if (assigneeId) {
    const member = await prisma.member.findFirst({
      where: { organizationId: workspace.id, userId: assigneeId },
      select: { id: true },
    });
    if (!member) return { ok: false, error: "Görev yalnızca workspace üyelerine atanabilir." };
  }

  const data: Prisma.TaskUncheckedUpdateInput = { ...rest };
  if (assigneeId !== undefined) data.assigneeId = assigneeId;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
  if (status !== undefined && status !== task.status) {
    // Changing status from the panel puts the task at the end of the new column.
    const last = await prisma.task.findFirst({
      where: { projectId: task.projectId, status },
      orderBy: [{ position: "desc" }, { id: "desc" }],
      select: { position: true },
    });
    data.status = status;
    data.position = generateKeyBetween(last?.position ?? null, null);
  }

  const updated = await prisma.task.update({ where: { id: task.id }, data, select: boardTaskSelect });
  revalidatePath(projectPath(slug, task.project.key));
  return { ok: true, data: toBoardTask(updated) };
}

export async function setTaskLabels(
  slug: string,
  taskId: string,
  labelIds: string[],
): Promise<Result<BoardTask["labels"]>> {
  const { task, workspace } = await requireTask(slug, taskId);
  if (!task) return NOT_FOUND;
  const ids = [...new Set(labelIds)];
  const labels = await prisma.label.findMany({
    where: { id: { in: ids }, organizationId: workspace.id },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
  if (labels.length !== ids.length) return { ok: false, error: "Etiket bulunamadı." };

  await prisma.$transaction([
    prisma.taskLabel.deleteMany({ where: { taskId: task.id } }),
    prisma.taskLabel.createMany({ data: ids.map((labelId) => ({ taskId: task.id, labelId })) }),
  ]);
  revalidatePath(projectPath(slug, task.project.key));
  return { ok: true, data: labels };
}

const labelNameSchema = z.string().trim().min(1, "Etiket adı gerekli.").max(32, "En fazla 32 karakter.");

/** Any member can create labels; colors rotate through the palette. */
export async function createLabel(slug: string, name: string): Promise<Result<BoardTask["labels"][number]>> {
  const { workspace } = await requireMember(slug);
  const parsed = labelNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const count = await prisma.label.count({ where: { organizationId: workspace.id } });
  const colors = Object.keys(LABEL_COLORS);
  try {
    const label = await prisma.label.create({
      data: { organizationId: workspace.id, name: parsed.data, color: colors[count % colors.length] },
      select: { id: true, name: true, color: true },
    });
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: true, data: label };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Bu adla bir etiket zaten var." };
    }
    throw error;
  }
}

/** Admins and the task's creator can delete it. */
export async function deleteTask(slug: string, taskId: string): Promise<Result<null>> {
  const { task, role, session } = await requireTask(slug, taskId);
  if (!task) return NOT_FOUND;
  if (!hasRole(role, "admin") && task.creatorId !== session.user.id) {
    return { ok: false, error: "Görevi yalnızca oluşturan kişi ya da bir yönetici silebilir." };
  }
  await prisma.task.delete({ where: { id: task.id } });
  revalidatePath(projectPath(slug, task.project.key));
  return { ok: true, data: null };
}

// --- Comments -----------------------------------------------------------------

const commentSchema = z.string().trim().min(1, "Yorum boş olamaz.").max(5_000, "Yorum en fazla 5.000 karakter.");

export async function addComment(slug: string, taskId: string, body: string): Promise<Result<null>> {
  const { task, session } = await requireTask(slug, taskId);
  if (!task) return NOT_FOUND;
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.comment.create({ data: { taskId: task.id, authorId: session.user.id, body: parsed.data } });
  revalidatePath(projectPath(slug, task.project.key));
  return { ok: true, data: null };
}

/** The comment, if it is in the workspace and written by the current user. */
async function requireOwnComment(slug: string, commentId: string) {
  const { workspace, session } = await requireMember(slug);
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, task: { project: { organizationId: workspace.id } } },
    select: { id: true, authorId: true, task: { select: { project: { select: { key: true } } } } },
  });
  if (!comment) return { ok: false, error: "Yorum bulunamadı." } as const;
  // Only the author may edit or delete a comment (admins included).
  if (comment.authorId !== session.user.id) {
    return { ok: false, error: "Yalnızca kendi yorumunu değiştirebilirsin." } as const;
  }
  return { ok: true, comment } as const;
}

export async function updateComment(slug: string, commentId: string, body: string): Promise<Result<null>> {
  const found = await requireOwnComment(slug, commentId);
  if (!found.ok) return found;
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.comment.update({ where: { id: commentId }, data: { body: parsed.data, editedAt: new Date() } });
  revalidatePath(projectPath(slug, found.comment.task.project.key));
  return { ok: true, data: null };
}

export async function deleteComment(slug: string, commentId: string): Promise<Result<null>> {
  const found = await requireOwnComment(slug, commentId);
  if (!found.ok) return found;

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(projectPath(slug, found.comment.task.project.key));
  return { ok: true, data: null };
}
