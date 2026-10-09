"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/roles";
import { inviteMember, type InviteState } from "@/server/workspaces";

import { CopyInviteLink, inviteUrl } from "./copy-invite-link";

const INVITE_ROLES = [
  { value: "member", label: ROLE_LABELS.member },
  { value: "admin", label: ROLE_LABELS.admin },
];

export function InviteForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteMember.bind(null, slug), {
    status: "idle",
  });
  const [role, setRole] = useState("member");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="flex-1" data-invalid={state.status === "error"}>
          <FieldLabel htmlFor="invite-email">E-posta</FieldLabel>
          <Input
            id="invite-email"
            name="email"
            type="email"
            // Someone else's address: don't offer the user's own.
            autoComplete="off"
            spellCheck={false}
            placeholder="ekip.arkadasi@ornek.com"
            aria-invalid={state.status === "error"}
            required
          />
        </Field>
        <Field className="sm:w-40">
          <FieldLabel htmlFor="invite-role">Rol</FieldLabel>
          <Select name="role" value={role} onValueChange={(v) => setRole(v ?? "member")} items={INVITE_ROLES}>
            <SelectTrigger id="invite-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVITE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Davet ediliyor…" : "Davet et"}
        </Button>
      </form>

      {state.status === "error" && <FieldError>{state.error}</FieldError>}

      {state.status === "success" && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center">
          <p className="flex-1">
            <span className="font-medium">{state.email}</span> davet edildi. E-posta gönderimi henüz
            yok; bu linki kendisine ilet:
            {/* Only rendered after a client-side submit, so window is available. */}
            <code className="mt-1 block truncate text-xs text-muted-foreground">
              {inviteUrl(state.invitationId)}
            </code>
          </p>
          <CopyInviteLink invitationId={state.invitationId} />
        </div>
      )}
    </div>
  );
}
