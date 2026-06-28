import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/server/auth/better-auth"

// Better Auth owns this endpoint lifecycle (sign-in, Google callback, session,
// sign-out). Replaces the legacy NextAuth `[...nextauth]` handler.
export const { GET, POST } = toNextJsHandler(auth)
