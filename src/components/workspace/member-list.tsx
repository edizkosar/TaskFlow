"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials } from "@/lib/initials";
import { assignableRoles, canManage, ROLE_LABELS, type Role } from "@/lib/roles";
import { removeMember, updateMemberRole } from "@/server/workspaces";

type Member = { id: string; name: string; email: string; role: Role; joinedAt: string };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export function MemberList({
  slug,
  viewerRole,
  viewerMemberId,
  members,
}: {
  slug: string;
  viewerRole: Role;
  viewerMemberId: string;
  members: Member[];
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          slug={slug}
          member={member}
          isSelf={member.id === viewerMemberId}
          editable={member.id !== viewerMemberId && canManage(viewerRole, member.role)}
          roleOptions={assignableRoles(viewerRole)}
        />
      ))}
    </ul>
  );
}

function MemberRow({
  slug,
  member,
  isSelf,
  editable,
  roleOptions,
}: {
  slug: string;
  member: Member;
  isSelf: boolean;
  editable: boolean;
  roleOptions: Role[];
}) {
  const [pending, startTransition] = useTransition();
  const items = roleOptions.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  function changeRole(role: string | null) {
    if (!role || role === member.role) return;
    startTransition(async () => {
      const result = await updateMemberRole(slug, member.id, role);
      if (result.ok) toast.success(`${member.name} artık ${ROLE_LABELS[role as Role]}`);
      else toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMember(slug, member.id);
      if (result.ok) toast.success(`${member.name} workspace'ten çıkarıldı`);
      else toast.error(result.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3" aria-busy={pending}>
      <Avatar className="size-8">
        <AvatarFallback>{initials(member.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name} {isSelf && <span className="text-muted-foreground">(sen)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {member.email} · {dateFormat.format(new Date(member.joinedAt))} tarihinden beri
        </p>
      </div>

      {editable ? (
        <div className="flex items-center gap-2">
          <Select value={member.role} onValueChange={changeRole} items={items} disabled={pending}>
            <SelectTrigger size="sm" className="w-32" aria-label={`${member.name} rolü`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="sm" className="text-destructive" disabled={pending} />}
            >
              Çıkar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{member.name} çıkarılsın mı?</AlertDialogTitle>
                <AlertDialogDescription>
                  Workspace&apos;e erişimi hemen kalkar. Tekrar katılması için yeni bir davet gerekir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  Çıkar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <Badge variant={member.role === "member" ? "secondary" : "outline"}>{ROLE_LABELS[member.role]}</Badge>
      )}
    </li>
  );
}
