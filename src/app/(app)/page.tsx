import { redirect } from "next/navigation";

import { listMyWorkspaces, requireSession } from "@/server/access";

/** Sends the user to their active (or first) workspace, or to onboarding. */
export default async function HomePage() {
  const { user, session } = await requireSession();
  const workspaces = await listMyWorkspaces(user.id);
  if (workspaces.length === 0) redirect("/onboarding");

  const active = workspaces.find((w) => w.id === session.activeOrganizationId) ?? workspaces[0];
  redirect(`/w/${active.slug}`);
}
