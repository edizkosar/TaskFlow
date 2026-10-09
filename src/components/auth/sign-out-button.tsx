"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton(props: Omit<React.ComponentProps<typeof Button>, "onClick" | "disabled">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" {...props} onClick={signOut} disabled={pending}>
      {pending ? "Çıkış yapılıyor…" : "Çıkış yap"}
    </Button>
  );
}
