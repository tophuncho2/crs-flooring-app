import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma, type Role } from "@builders/db"
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

          if (!credentials?.email) {
            logEvent({
              level: "warn",
              message: "Login attempt rejected because email was missing",
              action: "auth.login.rejected",
              route: "/api/auth/[...nextauth]",
              requestId,
              clientIp,
            })
            throw new Error("INVALID_CREDENTIALS")
          }

          const rateLimit = await consumeRateLimit({
            request,
            scope: "auth.login",
            identifier: normalizedEmail,
            limit: 10,
            windowMs: 10 * 60 * 1000,
            route: "/api/auth/[...nextauth]",
            userEmail: normalizedEmail,
          })

          if (!rateLimit.allowed) {
            throw new Error("RATE_LIMITED")
          }

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          })

          if (!user) {
            logEvent({
              level: "warn",
              message: "Login attempt failed because the account does not exist",
              action: "auth.login.failed",
              route: "/api/auth/[...nextauth]",
              requestId,
              userEmail: normalizedEmail,
              clientIp,
            })
            throw new Error("INVALID_CREDENTIALS")
          }

          if (!user.password) {
            logEvent({
              level: "warn",
              message: "Login attempt failed because the user has not set a password",
              action: "auth.login.passwordSetupRequired",
              route: "/api/auth/[...nextauth]",
              requestId,
              userId: user.id,
              userEmail: user.email,
              clientIp,
            })
            throw new Error("PASSWORD_SETUP_REQUIRED")
          }

          const valid = await bcrypt.compare(credentials.password, user.password)
          if (!valid) {
            logEvent({
              level: "warn",
              message: "Login attempt failed because the password was invalid",
              action: "auth.login.failed",
              route: "/api/auth/[...nextauth]",
              requestId,
              userId: user.id,
              userEmail: user.email,
              clientIp,
            })
            throw new Error("INVALID_CREDENTIALS")
          }

          if (!user.isVerified) {
            logEvent({
              level: "warn",
              message: "Login attempt failed because the account is pending approval",
              action: "auth.login.pendingApproval",
              route: "/api/auth/[...nextauth]",
              requestId,
              userId: user.id,
              userEmail: user.email,
              clientIp,
            })
            throw new Error("ACCOUNT_RESTRICTED")
          }

          await prisma.userLoginActivity.create({
            data: {
              userId: user.id,
              userEmail: user.email,
            },
          })

          logEvent({
            message: "Login succeeded",
            action: "auth.login.success",
            route: "/api/auth/[...nextauth]",
            requestId,
            userId: user.id,
            userEmail: user.email,
            clientIp,
          })

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
          }
        },
      }),
    ],
    session: { strategy: "jwt" },
    secret: authEnvironment.NEXTAUTH_SECRET,

    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id
          token.sub = user.id
          token.role = user.role
          token.isVerified = user.isVerified
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id ?? token.sub ?? ""
          session.user.role = token.role as Role
          session.user.isVerified = Boolean(token.isVerified)
        }
        return session
      },
    },
  }
}
