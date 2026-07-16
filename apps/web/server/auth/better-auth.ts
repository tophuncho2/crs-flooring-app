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
  // everyone into one shared per-path bucket. Better Auth's getIp() only accepts a
  // header whose value is a SINGLE, valid IP (no `trustedProxies` = it rejects the
  // multi-hop `x-forwarded-for` chain Railway forwards). Railway sets `x-real-ip`
  // to exactly that — one clean client IP — so we point the limiter straight at it
  // (confirmed from live prod logs). `cf-connecting-ip` stays listed only in case
  // Cloudflare ever fronts us. (Earlier fixes keyed on `x-railway-client-ip`, a
  // header that does not exist on Railway, so resolution always failed and this
  // warning kept firing.)
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
      ipAddressHeaders: ["x-real-ip", "cf-connecting-ip"],
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
      // Sign-in requests IDENTITY ONLY (Better Auth's default openid/email/profile) —
      // no `scope` array and no `prompt: "consent"`, so login never surfaces a Google
      // consent screen after the first identity grant. The Drive `drive.file` scope
      // the app needs to write list exports as Sheets is requested LATER, on demand,
      // the first time a user actually exports (incremental authorization — see
      // `modules/auth/reconnect-google.ts`). `accessType: "offline"` stays: it never
      // triggers a consent screen by itself, and it's what makes Google return a
      // refresh token (stored on the linked Account row) when that incremental Drive
      // grant happens, so the server can refresh and mint Sheets silently thereafter.
      accessType: "offline",
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

  // `rank` (authorization) stays server-owned — surfaced on the session user,
  // never settable from client input.
  user: {
    additionalFields: {
      rank: { type: "string", required: false, input: false },
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
