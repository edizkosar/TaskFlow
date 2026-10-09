import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { InvitationList } from "@/components/workspace/invitation-list";
import { InviteForm } from "@/components/workspace/invite-form";
import { MemberList } from "@/components/workspace/member-list";
import { prisma } from "@/lib/db";
import { hasRole, parseRole } from "@/lib/roles";
import { requireMember } from "@/server/access";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage({ params }: PageProps<"/w/[slug]/settings">) {
  const { slug } = await params;
  const { workspace, role, memberId } = await requireMember(slug);
  const isAdmin = hasRole(role, "admin");

  const [members, invitations] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: workspace.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    isAdmin
      ? prisma.invitation.findMany({
          where: { organizationId: workspace.id, status: "pending", expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{workspace.name}</h2>
          <p className="text-sm text-muted-foreground">Üyeleri ve davetleri yönet.</p>
        </div>

        {isAdmin && (
          <section aria-labelledby="invite-heading" className="flex flex-col gap-3">
            <h3 id="invite-heading" className="font-medium">
              Üye davet et
            </h3>
            <InviteForm slug={slug} />
          </section>
        )}

        <section aria-labelledby="members-heading" className="flex flex-col gap-3">
          <h3 id="members-heading" className="font-medium">
            Üyeler <span className="text-muted-foreground">({members.length})</span>
          </h3>
          <MemberList
            slug={slug}
            viewerRole={role}
            viewerMemberId={memberId}
            members={members.map((m) => ({
              id: m.id,
              name: m.user.name,
              email: m.user.email,
              role: parseRole(m.role),
              joinedAt: m.createdAt.toISOString(),
            }))}
          />
        </section>

        {isAdmin && (
          <section aria-labelledby="invitations-heading" className="flex flex-col gap-3">
            <h3 id="invitations-heading" className="font-medium">
              Bekleyen davetler <span className="text-muted-foreground">({invitations.length})</span>
            </h3>
            <InvitationList
              slug={slug}
              invitations={invitations.map((i) => ({
                id: i.id,
                email: i.email,
                role: parseRole(i.role ?? "member"),
                expiresAt: i.expiresAt.toISOString(),
              }))}
            />
          </section>
        )}
      </div>
    </>
  );
}
