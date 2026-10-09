import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-sm flex-col items-start gap-3">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
        <p className="text-sm text-muted-foreground">
          Aradığın sayfa silinmiş, taşınmış ya da erişim iznin olmayan bir workspace&apos;e ait olabilir.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
