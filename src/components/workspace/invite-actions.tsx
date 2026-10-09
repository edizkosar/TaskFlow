"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { acceptInvitation, rejectInvitation } from "@/server/workspaces";

export function InviteActions({ invitationId, wrongAccount }: { invitationId: string; wrongAccount?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // On success these actions redirect; they only return on failure.
  function run(action: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action(invitationId);
      if (!result.ok) toast.error(result.error);
    });
  }

  function switchAccount() {
    startTransition(async () => {
      await authClient.signOut();
      router.replace(`/login?next=${encodeURIComponent(`/invite/${invitationId}`)}`);
      router.refresh();
    });
  }

  if (wrongAccount) {
    return (
      <Button onClick={switchAccount} disabled={pending} className="w-full">
        Başka hesapla giriş yap
      </Button>
    );
  }

  return (
    <div className="flex w-full gap-2">
      <Button onClick={() => run(acceptInvitation)} disabled={pending} className="flex-1">
        {pending ? "İşleniyor…" : "Daveti kabul et"}
      </Button>
      <Button variant="outline" onClick={() => run(rejectInvitation)} disabled={pending}>
        Reddet
      </Button>
    </div>
  );
}
