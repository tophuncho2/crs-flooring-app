import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { type Role } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { canBypassVerification } from "@/server/auth/access-control"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
          return null
        }

        await prisma.userLoginActivity.create({
          data: {
            userId: user.id,
            userEmail: user.email,
          },
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
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.isVerified = user.isVerified
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role
        session.user.isVerified = Boolean(token.isVerified)
      }
      return session
    },
  },
}
