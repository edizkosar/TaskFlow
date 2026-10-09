import Link from "next/link";

import { AuthStage, Brand, glassCard } from "@/components/brand";
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
    <AuthStage>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center">
          <Brand />
        </Link>
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
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
    </AuthStage>
  );
}
