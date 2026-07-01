import { NextResponse } from "next/server"

export const REQUEST_ID_HEADER = "x-request-id"

export type HeaderCarrier =
  | Headers
  | Request
  | {
      headers?:
        | Headers
        | HeadersInit
        | {
            get?: (name: string) => string | null | undefined
          }
    }
  | null
  | undefined

function getHeaders(carrier: HeaderCarrier): Headers | null {
  if (!carrier) {
    return null
  }

  if (carrier instanceof Headers) {
    return carrier
  }

  if (carrier instanceof Request) {
    return carrier.headers
  }

  if (!carrier.headers) {
    return null
  }

  if (carrier.headers instanceof Headers) {
    return carrier.headers
  }

  const headers = carrier.headers as { get?: (name: string) => string | null | undefined }
  if (typeof headers.get === "function") {
    return carrier.headers as Headers
  }

  if (Array.isArray(carrier.headers)) {
    return new Headers(carrier.headers)
  }

  return new Headers(carrier.headers as Record<string, string>)
}

export function getRequestId(carrier?: HeaderCarrier) {
  const existing = getHeaders(carrier)?.get(REQUEST_ID_HEADER)?.trim()
  return existing && existing.length > 0 ? existing : crypto.randomUUID()
}

// Basic IPv4/IPv6 shape check — enough to reject junk (ports, "unknown", empty)
// before a value is used as a rate-limit key or handed to Better Auth (which
// validates strictly and silently drops anything that isn't a bare IP).
function looksLikeIp(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":")
}

/**
 * Resolve the real client IP from the incoming proxy headers, trying the most
 * trustworthy single-value source first. Returns `null` when nothing usable is
 * present.
 *
 * Order:
 *  1. `x-real-ip` — Railway sets this to the single client IP (unspoofable, no
 *     chain). Confirmed as the live source from prod logs.
 *  2. `cf-connecting-ip` — only if Cloudflare ever fronts us.
 *  3. `x-forwarded-for` leftmost — Railway also sends the client IP as the
 *     leftmost token, but it's client-spoofable, so it's a last resort. A
 *     per-IP bucket (even a spoofable one) beats collapsing everyone into one.
 *
 * Backs the app-wide gauntlet limiter via getClientIp; Better Auth's own limiter
 * reads `x-real-ip` directly (see server/auth/better-auth.ts). The prior fix
 * keyed on `x-railway-client-ip`, a header that does not exist on Railway — so
 * resolution always failed, Better Auth logged the "shared bucket" warning, and
 * the gauntlet limiter bucketed everyone under "unknown" in prod.
 */
export function resolveClientIp(carrier?: HeaderCarrier): string | null {
  const headers = getHeaders(carrier)
  if (!headers) {
    return null
  }

  const single =
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim()
  if (single && looksLikeIp(single)) {
    return single
  }

  const forwardedLeftmost = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwardedLeftmost && looksLikeIp(forwardedLeftmost)) {
    return forwardedLeftmost
  }

  return null
}

export function getClientIp(carrier?: HeaderCarrier) {
  return resolveClientIp(carrier) ?? "unknown"
}

export function withRequestId<T extends Response>(response: T, requestId: string): T {
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}
