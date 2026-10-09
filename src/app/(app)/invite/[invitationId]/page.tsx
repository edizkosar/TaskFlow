import type { Metadata } from "next";
import Link from "next/link";

import { InviteActions } from "@/components/workspace/invite-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { parseRole, ROLE_LABELS } from "@/lib/roles";
import { requireSession } from "@/server/access";

export const metadata: Metadata = { title: "Davet" };

export default async function InvitePage({ params }: PageProps<"/invite/[invitationId]">) {
  const { invitationId } = await params;
  const { user } = await requireSession();

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { name: true } }, // inviter
    },
  });

  const valid = invitation && invitation.status === "pending" && invitation.expiresAt > new Date();

  if (!valid) {
    return (
      <InviteShell title="Davet geçersiz" description="Bu davet bulunamadı, kullanılmış ya da süresi dolmuş.">
        <CardFooter>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Ana sayfaya dön
          </Link>
        </CardFooter>
      </InviteShell>
    );
  }

  const alreadyMember = await prisma.member.findFirst({
    where: { organizationId: invitation.organizationId, userId: user.id },
    select: { id: true },
  });

  if (alreadyMember) {
    return (
      <InviteShell
        title={`Zaten ${invitation.organization.name} üyesisin`}
        description="Bu workspace'e erişimin var."
      >
        <CardFooter>
          <Link href={`/w/${invitation.organization.slug}`} className={buttonVariants()}>
            Workspace&apos;e git
          </Link>
        </CardFooter>
      </InviteShell>
    );
  }

  const isRecipient = invitation.email.toLowerCase() === user.email.toLowerCase();

  return (
    <InviteShell
      title={`${invitation.organization.name} workspace'ine davet edildin`}
      description={`${invitation.user.name} seni ${ROLE_LABELS[parseRole(invitation.role ?? "member")]} olarak davet etti.`}
    >
      {isRecipient ? (
        <CardFooter>
          <InviteActions invitationId={invitation.id} />
        </CardFooter>
      ) : (
        <>
          <CardContent>
            <p className="text-sm">
              Bu davet <span className="font-medium">{invitation.email}</span> adresine gönderilmiş. Şu
              an <span className="font-medium">{user.email}</span> ile giriş yaptın.
            </p>
          </CardContent>
          <CardFooter>
            <InviteActions invitationId={invitation.id} wrongAccount />
          </CardFooter>
        </>
      )}
    </InviteShell>
  );
}

function InviteShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <p className="self-center text-lg font-semibold tracking-tight">TaskFlow</p>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl">{title}</h1>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {children}
        </Card>
      </div>
    </main>
  );
}
