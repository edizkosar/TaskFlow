"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { PROJECT_KEY_PATTERN } from "@/lib/project-key";
import { requireMember } from "@/server/access";

const projectFields = {
  name: z.string().trim().min(1, "Proje adı gerekli.").max(64, "En fazla 64 karakter."),
  description: z
    .string()
    .trim()
    .max(500, "En fazla 500 karakter.")
    .transform((v) => v || null),
};

const createSchema = z.object({
  ...projectFields,
  key: z.string().trim().toUpperCase().regex(PROJECT_KEY_PATTERN, "2-5 karakter; harfle başlamalı (ör. MOB)."),
});
const updateSchema = z.object(projectFields);

type Field = "name" | "key" | "description";

export type ProjectFormState = {
  ok?: boolean;
  /** Set on successful create; the client navigates to the new project. */
  key?: string;
  error?: string;
  fieldErrors?: Partial<Record<Field, string>>;
};

function fieldErrors(error: z.ZodError): ProjectFormState {
  const errors = z.flattenError(error).fieldErrors as Partial<Record<Field, string[]>>;
  return {
    fieldErrors: { name: errors.name?.[0], key: errors.key?.[0], description: errors.description?.[0] },
  };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Sidebar + pages under the workspace show project data. */
const revalidateWorkspace = (slug: string) => revalidatePath(`/w/${slug}`, "layout");

export async function createProject(
  slug: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { workspace, session } = await requireMember(slug, "admin");
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    key: formData.get("key") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await prisma.project.create({
      data: { ...parsed.data, organizationId: workspace.id, createdById: session.user.id },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { key: "Bu kod bu workspace'te zaten kullanılıyor." } };
    }
    throw error;
  }

  revalidateWorkspace(slug);
  return { ok: true, key: parsed.data.key };
}

export async function updateProject(
  slug: string,
  projectId: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { workspace } = await requireMember(slug, "admin");
  const parsed = updateSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  // Scoped by organizationId so a project id from another workspace can't be touched.
  const { count } = await prisma.project.updateMany({
    where: { id: projectId, organizationId: workspace.id },
    data: parsed.data,
  });
  if (count === 0) return { error: "Proje bulunamadı." };

  revalidateWorkspace(slug);
  return { ok: true };
}

export async function deleteProject(slug: string, projectId: string): Promise<{ error: string } | void> {
  const { workspace } = await requireMember(slug, "admin");
  const { count } = await prisma.project.deleteMany({ where: { id: projectId, organizationId: workspace.id } });
  if (count === 0) return { error: "Proje bulunamadı." };

  revalidateWorkspace(slug);
  redirect(`/w/${slug}`);
}
