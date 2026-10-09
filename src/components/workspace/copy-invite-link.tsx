"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function inviteUrl(invitationId: string) {
  return `${window.location.origin}/invite/${invitationId}`;
}

export function CopyInviteLink({ invitationId, label = "Linki kopyala" }: { invitationId: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl(invitationId));
      setCopied(true);
      toast.success("Davet linki kopyalandı");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı. Linki elle seçip kopyalayabilirsin.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label}
    </Button>
  );
}
