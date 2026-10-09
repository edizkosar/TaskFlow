import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Hesap oluştur"
      description="Birkaç saniyede ekibinle çalışmaya başla."
      footer={{ text: "Zaten hesabın var mı?", linkLabel: "Giriş yap", href: "/login" }}
    >
      <SignupForm />
    </AuthCard>
  );
}
