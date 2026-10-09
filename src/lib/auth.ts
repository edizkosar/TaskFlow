import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";

import { prisma } from "@/lib/db";

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // On by default in production. The E2E server (playwright.config.ts) turns it off
  // because parallel tests sign up many users from one IP.
  rateLimit: {
    enabled: process.env.E2E_DISABLE_RATE_LIMIT === "1" ? false : undefined,
  },
  plugins: [
    // Workspaces are Better Auth organizations.
    organization({
      // MVP: no email provider yet; the invite link is shown in the UI and logged here.
      async sendInvitationEmail(data) {
        console.info(`[invite] ${data.email} → /invite/${data.id}`);
      },
      organizationHooks: {
        // Removed members keep their account; their tasks in this workspace become unassigned.
        async afterRemoveMember({ member, organization }) {
          await prisma.task.updateMany({
            where: { assigneeId: member.userId, project: { organizationId: organization.id } },
            data: { assigneeId: null },
          });
        },
      },
    }),
    // Must be last so Server Actions can set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
