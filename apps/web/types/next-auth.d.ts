import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      rank: "DEVELOPER" | "TIER_1" | "TIER_2" | "TIER_3"
      isVerified: boolean
    }
  }

  interface User {
    id: string
    rank: "DEVELOPER" | "TIER_1" | "TIER_2" | "TIER_3"
    isVerified: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    rank?: "DEVELOPER" | "TIER_1" | "TIER_2" | "TIER_3"
    isVerified?: boolean
  }
}
