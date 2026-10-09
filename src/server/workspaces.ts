"use server";

import { isAPIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { SLUG_PATTERN } from "@/lib/slug";
import { requireMember, requireSession } from "@/server/access";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (isAPIError(error)) {
    const body = error.body as { code?: string } | undefined;
    return { ok: false, error: authErrorMessage({ code: body?.code }) };
  }
  console.error(error);
  return { ok: false, error: authErrorMessage(null) };
}

const settingsPath = (slug: string) => `/w/${slug}/settings`;

// --- Create workspace ---------------------------------------------------------

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace adı en az 2 karakter olmalı.").max(64, "En fazla 64 karakter."),
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "3–48 karakter; küçük harf, rakam ve tire kullanılabilir."),
});

export type CreateWorkspaceState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "slug", string>>;
  values?: { name: string; slug: string };
};

export async function createWorkspace(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  await requireSession();
  const values = { name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? "") };
  const parsed = createWorkspaceSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return { values, fieldErrors: { name: fieldErrors.name?.[0], slug: fieldErrors.slug?.[0] } };
  }

  try {
    // Also makes the new workspace the session's active one.
    await auth.api.createOrganization({ body: parsed.data, headers: await headers() });
  } catch (error) {
    const { error: message } = failure(error);
    return { values, fieldErrors: { slug: message } };
  }

  redirect(`/w/${parsed.data.slug}`);
}

// --- Switch workspace ---------------------------------------------------------

/** Remembers the workspace so "/" opens it next time. */
export async function setActiveWorkspace(slug: string) {
  const { workspace } = await requireMember(slug);
  await auth.api.setActiveOrganization({ body: { organizationId: workspace.id }, headers: await headers() });
}

// --- Invitations --------------------------------------------------------------

const inviteSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi girin.").trim().toLowerCase(),
  role: z.enum(["admin", "member"]),
});

export type InviteState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; email: string; invitationId: string };

export async function inviteMember(slug: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  const { workspace } = await requireMember(slug, "admin");
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  try {
    const invitation = await auth.api.createInvitation({
      body: { ...parsed.data, organizationId: workspace.id },
      headers: await headers(),
    });
    revalidatePath(settingsPath(slug));
    return { status: "success", email: parsed.data.email, invitationId: invitation.id };
  } catch (error) {
    return { status: "error", error: failure(error).error };
  }
}

export async function cancelInvitation(slug: string, invitationId: string): Promise<ActionResult> {
  await requireMember(slug, "admin");
  try {
    await auth.api.cancelInvitation({ body: { invitationId }, headers: await headers() });
    revalidatePath(settingsPath(slug));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function acceptInvitation(invitationId: string): Promise<ActionResult> {
  await requireSession();
  let slug: string;
  try {
    const result = await auth.api.acceptInvitation({ body: { invitationId }, headers: await headers() });
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: result!.invitation.organizationId },
      select: { slug: true },
    });
    slug = org.slug;
  } catch (error) {
    return failure(error);
  }
  redirect(`/w/${slug}`);
}

export async function rejectInvitation(invitationId: string): Promise<ActionResult> {
  await requireSession();
  try {
    await auth.api.rejectInvitation({ body: { invitationId }, headers: await headers() });
  } catch (error) {
    return failure(error);
  }
  redirect("/");
}

// --- Members ------------------------------------------------------------------

const roleSchema = z.enum(ROLES);

export async function updateMemberRole(slug: string, memberId: string, role: string): Promise<ActionResult> {
  const { workspace } = await requireMember(slug, "admin");
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Geçersiz rol." };

  try {
    await auth.api.updateMemberRole({
      body: { memberId, role: parsed.data, organizationId: workspace.id },
      headers: await headers(),
    });
    revalidatePath(settingsPath(slug));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMember(slug: string, memberId: string): Promise<ActionResult> {
  const { workspace } = await requireMember(slug, "admin");
  try {
    await auth.api.removeMember({
      body: { memberIdOrEmail: memberId, organizationId: workspace.id },
      headers: await headers(),
    });
    revalidatePath(settingsPath(slug));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
