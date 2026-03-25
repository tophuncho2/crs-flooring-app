import NextAuth from "next-auth"
import { getAuthOptions } from "@/server/auth/auth-options"

// Intentional route-policy exception:
// NextAuth owns this endpoint lifecycle, so it does not use the shared authenticated route contract.
const handler = NextAuth(getAuthOptions())

export { handler as GET, handler as POST }
