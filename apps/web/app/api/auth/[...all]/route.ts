import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/server/auth/better-auth"

// Better Auth owns this endpoint lifecycle (sign-in, Google callback, session,
// sign-out). Replaces the legacy NextAuth `[...nextauth]` handler. Its built-in
// rate limiter reads the client IP straight from `x-real-ip` (see
// server/auth/better-auth.ts) — Railway sets that to a single, valid IP, so no
// header pre-resolution wrapper is needed here.
export const { GET, POST } = toNextJsHandler(auth)
