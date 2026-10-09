import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/server/access";

// Phase 0 placeholder; Phase 1 replaces this with onboarding / workspace redirect.
export default async function HomePage() {
  const { user } = await requireSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Hoş geldin, {user.name}</h1>
      <p className="text-muted-foreground">Oturum açık: {user.email}</p>
      <SignOutButton />
    </main>
  );
}
