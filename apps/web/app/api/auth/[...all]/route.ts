import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/server/auth/better-auth"
import { resolveClientIp } from "@/server/platform/request-context"
import { logEvent } from "@/server/platform/logger"

// Better Auth owns this endpoint lifecycle (sign-in, Google callback, session,
// sign-out). Replaces the legacy NextAuth `[...nextauth]` handler.
const handlers = toNextJsHandler(auth)

// Header we inject with the pre-resolved client IP. Better Auth is pointed at
// this header (see server/auth/better-auth.ts) so it always receives a single,
// valid IP regardless of which proxy header Railway actually forwards — instead
// of us guessing the header name and getIp() silently rejecting a multi-hop XFF.
const CLIENT_IP_HEADER = "x-client-ip"

// TEMPORARY DIAGNOSTIC — the "could not determine a client IP" warning survived
// several header guesses, so log exactly which proxy headers Railway forwards on
// a real sign-in. Remove once confirmed. Cookies/secrets are NOT logged.
const IP_DIAGNOSTIC_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "x-envoy-external-address",
  "x-envoy-internal",
  "cf-connecting-ip",
  "x-railway-client-ip",
  "x-railway-edge",
  "forwarded",
  "true-client-ip",
]

function withResolvedClientIp(req: Request): Request {
  const resolved = resolveClientIp(req.headers)

  const diagnostics: Record<string, string | null> = { resolved }
  for (const name of IP_DIAGNOSTIC_HEADERS) {
    diagnostics[name] = req.headers.get(name)
  }
  logEvent({
    level: "warn",
    message: "AUTH IP DIAGNOSTIC — proxy client-IP headers on this request (temporary)",
    action: "auth.ip.diagnostic",
    route: "api/auth/[...all]",
    details: diagnostics,
  })

  if (!resolved) {
    return req
  }

  const headers = new Headers(req.headers)
  headers.set(CLIENT_IP_HEADER, resolved)
  return new Request(req, { headers })
}

export async function GET(req: Request) {
  return handlers.GET(withResolvedClientIp(req))
}

export async function POST(req: Request) {
  return handlers.POST(withResolvedClientIp(req))
}
