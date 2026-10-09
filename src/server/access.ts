import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

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
