"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cancelInvitation } from "@/server/workspaces";

import { CopyInviteLink } from "./copy-invite-link";

type Invitation = { id: string; email: string; role: Role; expiresAt: string };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export function InvitationList({ slug, invitations }: { slug: string; invitations: Invitation[] }) {
  if (invitations.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Bekleyen davet yok.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} slug={slug} invitation={invitation} />
      ))}
    </ul>
  );
}

function InvitationRow({ slug, invitation }: { slug: string; invitation: Invitation }) {
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelInvitation(slug, invitation.id);
      if (result.ok) toast.success("Davet iptal edildi");
      else toast.error(result.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3" aria-busy={pending}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          Son geçerlilik: {dateFormat.format(new Date(invitation.expiresAt))}
        </p>
      </div>
      <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
      <CopyInviteLink invitationId={invitation.id} label="Link" />
      <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>
        İptal et
      </Button>
    </li>
  );
}
