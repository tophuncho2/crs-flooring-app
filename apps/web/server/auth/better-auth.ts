import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError } from "better-auth/api"
import { db } from "@builders/db"
import { markSignupInviteAccepted, resolveSignupInviteRank } from "@builders/application"

// Only Google Workspace accounts on this domain may authenticate. Google enforces
// it server-side via the `hd` hint; we re-check the email domain in the create
// hook as defense-in-depth.
const COMPANY_GOOGLE_DOMAIN = "crsfloorcovering.com"

// Better Auth instance — self-hosted in our own Postgres via the Prisma client.
// Replaces the legacy NextAuth credentials setup. Identity = Google Workspace SSO
// (passwordless); authorization = our `UserRank` domain model (unchanged).
//
// NOTE: env vars are read directly here (the standard Better Auth pattern). They
// get folded into `readAuthEnvironment` validation at the final cut-over, when the
// legacy NEXTAUTH_* vars are retired.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  // Passwordless: identity from Google, authorization from the invite. No password
  // column in play, no reset flow.
  emailAndPassword: { enabled: false },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      hd: COMPANY_GOOGLE_DOMAIN,
    },
  },

  // Existing users have a `User` row but no linked `Account`. Google verifies the
  // email, so linking by email is safe — this is what lets current users sign in
  // with Google on first use without being recreated (no resets, no lockouts).
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  // `rank` (authorization) and `isActive` (activation gate) stay server-owned —
  // surfaced on the session user, never settable from client input.
  user: {
    additionalFields: {
      rank: { type: "string", required: false, input: false },
      isActive: { type: "boolean", required: false, input: false },
    },
  },

  // Cookie-cache → JWT-like per-request speed with revocable, DB-backed sessions.
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  databaseHooks: {
    user: {
      create: {
        // Invite-only gate. Runs only for BRAND-NEW users — existing users link
        // to Google via `accountLinking` and never reach here.
        before: async (user) => {
          const email = user.email?.toLowerCase() ?? ""

          // Defense-in-depth domain lock (Google's `hd` already enforces this).
          if (!email.endsWith(`@${COMPANY_GOOGLE_DOMAIN}`)) {
            throw new APIError("FORBIDDEN", {
              message: `Only ${COMPANY_GOOGLE_DOMAIN} accounts may sign in.`,
            })
          }

          // A new user must have a valid open invite; its rank is stamped onto the
          // user. No invite → fail closed (no self-provisioning).
          const rank = await resolveSignupInviteRank(email)
          if (!rank) {
            throw new APIError("FORBIDDEN", {
              message: "Your account isn't provisioned yet. Ask a manager to invite you.",
            })
          }

          return { data: { ...user, rank } }
        },
        // Post-creation: retire the invite so the link can't be reused.
        after: async (user) => {
          await markSignupInviteAccepted(user.email)
        },
      },
    },
  },
})
