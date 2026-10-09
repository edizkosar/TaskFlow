import type { Metadata } from "next";
import Link from "next/link";

import { AuthStage, Brand, glassCard } from "@/components/brand";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyWorkspaces, requireSession } from "@/server/access";

export const metadata: Metadata = { title: "Workspace oluştur" };

export default async function OnboardingPage() {
  const { user } = await requireSession();
  const workspaces = await listMyWorkspaces(user.id);
  const isFirst = workspaces.length === 0;

  return (
    <AuthStage>
      <div className="flex w-full max-w-md flex-col gap-6">
        <Brand className="self-center" />
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl">{isFirst ? "İlk workspace'ini oluştur" : "Yeni workspace"}</h1>
            </CardTitle>
            <CardDescription>
              Workspace, ekibinin projelerini ve görevlerini bir arada tutar. Ekip arkadaşlarını
              sonra davet edebilirsin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm />
          </CardContent>
        </Card>
        {isFirst ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{user.email} olarak giriş yaptın.</span>
            <SignOutButton variant="link" className="h-auto p-0" />
          </div>
        ) : (
          <Link
            href="/"
            className="self-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Vazgeç
          </Link>
        )}
      </div>
    </AuthStage>
  );
}
