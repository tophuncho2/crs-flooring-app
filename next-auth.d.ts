import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string
      role: "CONTRACTOR" | "ADMIN" | "BUILDER"
      isVerified: boolean
    }
  }

  interface User {
    role: "CONTRACTOR" | "ADMIN" | "BUILDER"
    isVerified: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "CONTRACTOR" | "ADMIN" | "BUILDER"
    isVerified?: boolean
  }
}
