"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, safeNextPath } from "@/lib/auth-errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });

    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }

    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">E-posta</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Şifre</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Giriş yapılıyor…" : "Giriş yap"}
        </Button>
      </FieldGroup>
    </form>
  );
}
