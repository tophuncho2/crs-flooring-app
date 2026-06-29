import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError } from "better-auth/api"
import { db } from "@builders/db"
import { markSignupInviteAccepted, resolveSignupInviteRank } from "@builders/application"
import { getAuthEnvironment } from "@/server/platform/env"
import { createAuthRateLimitStorage } from "@/server/platform/rate-limit"

// Only Google Workspace accounts on this domain may authenticate. Google enforces
// it server-side via the `hd` hint; we re-check the email domain in the create
// hook as defense-in-depth.
const COMPANY_GOOGLE_DOMAIN = "crsfloorcovering.com"

// Better Auth instance — self-hosted in our own Postgres via the Prisma client.
// Replaces the legacy NextAuth credentials setup. Identity = Google Workspace SSO
// (passwordless); authorization = our `UserRank` domain model (unchanged).
//
// Env is read through `getAuthEnvironment` (validated, fail-closed at boot) rather
// than raw `process.env` — a missing URL/secret/Google credential throws instead of
// silently producing a broken auth instance.
const authEnv = getAuthEnvironment()

export const auth = betterAuth({
  baseURL: authEnv.url,
  secret: authEnv.secret,
  database: prismaAdapter(db, { provider: "postgresql" }),

  // Rate limiting needs the real client IP to bucket per-user rather than collapse
  // everyone into one shared per-path bucket. We run behind Railway's edge proxy,
  // which appends a multi-hop `x-forwarded-for` chain — and Better Auth rejects a
  // multi-IP XFF as spoofable unless `trustedProxies` is configured. Instead of
  // pinning Railway's proxy CIDRs, point it at the single-value, proxy-set headers
  // the rest of the app already trusts (see `getClientIp` in
  // server/platform/request-context.ts): Railway's own client-IP header, then
  // Cloudflare's. Both are single values, so they resolve without proxy config.
  advanced: {
    // User/Session/Account ids must be UUIDs to match the Prisma schema's
    // `@default(uuid())` and every downstream user-id contract (the import
    // materialize payload's `requestedBy.userId` and the user-management routes'
    // `parseUuidParam`). Better Auth's Prisma adapter supplies the id explicitly,
    // so without this it emits its native 32-char id and `@default(uuid())` never
    // fires — invited users then fail UUID validation on Run Import / rank / active.
    database: {
      generateId: "uuid",
    },
    ipAddress: {
      ipAddressHeaders: ["x-railway-client-ip", "cf-connecting-ip"],
    },
  },

  // Auth routes bypass the API gauntlet, so Better Auth's built-in limiter is the
  // only guard on sign-in/OAuth. Back it with the shared Redis-or-memory counters
  // (see server/platform/rate-limit.ts) instead of the default process-memory
  // store, so limits survive restarts and hold across web instances. Stays
  // production-only by default — Better Auth only enables rate limiting in prod.
  rateLimit: {
    customStorage: createAuthRateLimitStorage(),
  },

  // Passwordless: identity from Google, authorization from the invite. No password
  // column in play, no reset flow.
  emailAndPassword: { enabled: false },

  socialProviders: {
    google: {
      clientId: authEnv.googleClientId,
      clientSecret: authEnv.googleClientSecret,
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
