import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth-errors";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);
  const signupHref = nextPath === "/" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthCard
      title="Giriş yap"
      description="Ekibinin çalışma alanına devam et."
      footer={{ text: "Hesabın yok mu?", linkLabel: "Kayıt ol", href: signupHref }}
    >
      <LoginForm next={nextPath} />
    </AuthCard>
  );
}
