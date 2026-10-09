import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Giriş yap" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Giriş yap"
      description="Ekibinin çalışma alanına devam et."
      footer={{ text: "Hesabın yok mu?", linkLabel: "Kayıt ol", href: "/signup" }}
    >
      {/* LoginForm reads ?next= via useSearchParams. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
