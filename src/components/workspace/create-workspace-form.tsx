"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";
import { createWorkspace, type CreateWorkspaceState } from "@/server/workspaces";

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState<CreateWorkspaceState, FormData>(createWorkspace, {});
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  // Follow the name until the user edits the slug by hand.
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name}>
          <FieldLabel htmlFor="name">Workspace adı</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Örn. Acme Ürün Ekibi"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            aria-invalid={!!state.fieldErrors?.name}
            required
            autoFocus
          />
          {state.fieldErrors?.name && <FieldError>{state.fieldErrors.name}</FieldError>}
        </Field>
        <Field data-invalid={!!state.fieldErrors?.slug}>
          <FieldLabel htmlFor="slug">Adres</FieldLabel>
          <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="pl-2.5 text-sm text-muted-foreground select-none">taskflow/w/</span>
            <Input
              id="slug"
              name="slug"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                // Light cleanup only, so a trailing "-" can be typed; the server validates.
                setSlug(e.target.value.toLocaleLowerCase("tr").replace(/[^a-z0-9-]/g, "-").slice(0, 48));
              }}
              aria-invalid={!!state.fieldErrors?.slug}
              className="border-0 pl-0.5 focus-visible:ring-0"
              required
            />
          </div>
          {state.fieldErrors?.slug ? (
            <FieldError>{state.fieldErrors.slug}</FieldError>
          ) : (
            <FieldDescription>Küçük harf, rakam ve tire. Bağlantılarda görünür.</FieldDescription>
          )}
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Oluşturuluyor…" : "Workspace oluştur"}
        </Button>
      </FieldGroup>
    </form>
  );
}
