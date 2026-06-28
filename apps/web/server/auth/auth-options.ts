import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { authenticateCredentialsUseCase } from "@builders/application"
import { type UserRank } from "@builders/db"
import { getAuthEnvironment } from "@/server/platform/env"
import { logEvent } from "@/server/platform/logger"
import { consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId } from "@/server/platform/request-context"

export function getAuthOptions(): NextAuthOptions {
  const authEnvironment = getAuthEnvironment()

  return {
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: {},
          password: {},
        },
        async authorize(credentials, request) {
          const normalizedEmail = credentials?.email?.trim().toLowerCase() ?? ""
          const requestId = getRequestId(request)
          const clientIp = getClientIp(request)

          if (!normalizedEmail || !credentials?.password) {
            logEvent({
              level: "warn",
              message: "Login attempt rejected because credentials were missing",
              action: "auth.login.rejected",
              route: "/api/auth/[...nextauth]",
              requestId,
              clientIp,
            })
            throw new Error("INVALID_CREDENTIALS")
          }

          // Keyed by IP + email so a single attacker IP cannot lock a victim's
          // account out from elsewhere, while still throttling brute force.
          const rateLimit = await consumeRateLimit({
            request,
            scope: "auth.login",
            identifier: `${clientIp}:${normalizedEmail}`,
            limit: 10,
            windowMs: 10 * 60 * 1000,
            route: "/api/auth/[...nextauth]",
            userEmail: normalizedEmail,
          })

          if (!rateLimit.allowed) {
            throw new Error("RATE_LIMITED")
          }

          const result = await authenticateCredentialsUseCase({
            email: normalizedEmail,
            password: credentials.password,
          })

          if (result.outcome === "invalid-credentials") {
            logEvent({
              level: "warn",
              message: "Login attempt failed",
              action: "auth.login.failed",
              route: "/api/auth/[...nextauth]",
              requestId,
              userEmail: normalizedEmail,
              clientIp,
            })
            throw new Error("INVALID_CREDENTIALS")
          }

          if (result.outcome === "account-restricted") {
            logEvent({
              level: "warn",
              message: "Login attempt failed because the account is pending approval",
              action: "auth.login.pendingApproval",
              route: "/api/auth/[...nextauth]",
              requestId,
              userId: result.userId,
              userEmail: result.userEmail,
              clientIp,
            })
            throw new Error("ACCOUNT_RESTRICTED")
          }

          logEvent({
            message: "Login succeeded",
            action: "auth.login.success",
            route: "/api/auth/[...nextauth]",
            requestId,
            userId: result.user.id,
            userEmail: result.user.email,
            clientIp,
          })

          return {
            id: result.user.id,
            email: result.user.email,
            rank: result.user.rank as UserRank,
            isVerified: result.user.isVerified,
          }
        },
      }),
    ],
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
    secret: authEnvironment.NEXTAUTH_SECRET,

    logger: {
      error(code, metadata) {
        // A thrown `authorize()` error is a control-flow signal already recorded
        // by `authorize()` as a structured warn — and NextAuth v4 turns it into a
        // redirect, never a `logger.error`. The codes that reach here are genuine
        // faults (JWT/session decode, OAuth), so we always surface them.
        const error = metadata instanceof Error ? metadata : (metadata as { error?: unknown })?.error

        logEvent({
          level: "error",
          message: `NextAuth error: ${code}`,
          action: "auth.nextauth.error",
          route: "/api/auth/[...nextauth]",
          details: { code },
          error,
        })
      },
      warn(code) {
        logEvent({
          level: "warn",
          message: `NextAuth warning: ${code}`,
          action: "auth.nextauth.warn",
          route: "/api/auth/[...nextauth]",
          details: { code },
        })
      },
      debug() {
        // Suppress verbose NextAuth debug output.
      },
    },

    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id
          token.sub = user.id
          token.rank = user.rank
          token.isVerified = user.isVerified
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id ?? token.sub ?? ""
          session.user.rank = token.rank as UserRank
          session.user.isVerified = Boolean(token.isVerified)
        }
        return session
      },
    },
  }
}
