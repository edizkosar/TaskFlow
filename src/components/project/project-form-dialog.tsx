"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cleanProjectKey, suggestProjectKey } from "@/lib/project-key";
import { createProject, updateProject, type ProjectFormState } from "@/server/projects";

type Project = { id: string; name: string; key: string; description: string | null };

type Props = {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & ({ mode: "create"; project?: undefined } | { mode: "edit"; project: Project });

/** Create or edit a project. Remount (key) to reset the form between openings. */
export function ProjectFormDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && <ProjectForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ slug, mode, project, onOpenChange }: Props) {
  const router = useRouter();
  const isCreate = mode === "create";
  const [name, setName] = useState(project?.name ?? "");
  const [key, setKey] = useState(project?.key ?? "");
  const [keyTouched, setKeyTouched] = useState(false);

  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(async (prev, formData) => {
    const result = isCreate
      ? await createProject(slug, prev, formData)
      : await updateProject(slug, project!.id, prev, formData);
    if (result.ok) {
      onOpenChange(false);
      if (isCreate) router.push(`/w/${slug}/p/${result.key}`);
      else toast.success("Proje güncellendi");
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, {});

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{isCreate ? "Yeni proje" : "Projeyi düzenle"}</DialogTitle>
        <DialogDescription>
          {isCreate
            ? "Görevler projenin kısa koduyla numaralanır (ör. MOB-12)."
            : `Proje kodu ${project!.key} olarak kalır; mevcut görev numaraları değişmez.`}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="project-name">Proje adı</FieldLabel>
          <Input
            id="project-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (isCreate && !keyTouched) setKey(suggestProjectKey(e.target.value));
            }}
            placeholder="Ör. Mobil Uygulama"
            aria-invalid={!!errors.name}
            maxLength={64}
            required
            autoFocus
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        {isCreate && (
          <Field data-invalid={!!errors.key}>
            <FieldLabel htmlFor="project-key">Kod</FieldLabel>
            <Input
              id="project-key"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              name="key"
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(cleanProjectKey(e.target.value));
              }}
              aria-invalid={!!errors.key}
              className="w-28 font-mono uppercase"
              required
            />
            {errors.key ? (
              <FieldError>{errors.key}</FieldError>
            ) : (
              <FieldDescription>2-5 karakter, sonradan değiştirilemez.</FieldDescription>
            )}
          </Field>
        )}

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="project-description">Açıklama (isteğe bağlı)</FieldLabel>
          <Textarea
            id="project-description"
            name="description"
            defaultValue={project?.description ?? ""}
            rows={3}
            maxLength={500}
            aria-invalid={!!errors.description}
          />
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : isCreate ? "Proje oluştur" : "Kaydet"}
        </Button>
      </DialogFooter>
    </form>
  );
}
