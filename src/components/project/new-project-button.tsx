"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ProjectFormDialog } from "./project-form-dialog";

export function NewProjectButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Proje oluştur
      </Button>
      <ProjectFormDialog mode="create" slug={slug} open={open} onOpenChange={setOpen} />
    </>
  );
}
