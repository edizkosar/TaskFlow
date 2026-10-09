import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: { text: string; linkLabel: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-lg font-semibold tracking-tight">
          TaskFlow
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl">{title}</h1>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          {footer.text}{" "}
          <Link href={footer.href} className="font-medium text-foreground underline-offset-4 hover:underline">
            {footer.linkLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
