import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { safeNextPath } from "@/lib/auth-errors";

export const metadata: Metadata = { title: "Kayıt ol" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);
  const loginHref = nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthCard
      title="Hesap oluştur"
      description="Birkaç saniyede ekibinle çalışmaya başla."
      footer={{ text: "Zaten hesabın var mı?", linkLabel: "Giriş yap", href: loginHref }}
    >
      <SignupForm next={nextPath} />
    </AuthCard>
  );
}
