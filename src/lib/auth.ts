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
  plugins: [
    // Workspaces are Better Auth organizations.
    organization({
      // MVP: no email provider yet; the invite link is shown in the UI and logged here.
      async sendInvitationEmail(data) {
        console.info(`[invite] ${data.email} → /invite/${data.id}`);
      },
    }),
    // Must be last so Server Actions can set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
