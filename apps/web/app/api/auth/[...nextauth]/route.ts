import NextAuth from "next-auth"
import { authOptions } from "@/server/auth/auth-options"

// Intentional route-policy exception:
// NextAuth owns this endpoint lifecycle, so it does not use the shared authenticated route contract.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
