import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string
      role: "CONTRACTOR" | "ADMIN" | "BUILDER"
    }
  }

  interface User {
    role: "CONTRACTOR" | "ADMIN" | "BUILDER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "CONTRACTOR" | "ADMIN" | "BUILDER"
  }
}
