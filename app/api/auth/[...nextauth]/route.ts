import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import type { NextAuthOptions } from "next-auth"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"

// 👇 Export this so dashboard can access it
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!valid) return null

        if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    })
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
        session.user.role = token.role as "CONTRACTOR" | "ADMIN" | "BUILDER"
        session.user.isVerified = Boolean(token.isVerified)
      }
      return session
    }
  }
}

// 👇 This stays for NextAuth to work
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
