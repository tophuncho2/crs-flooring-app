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

export function getClientIp(carrier?: HeaderCarrier) {
  const headers = getHeaders(carrier)
  // Railway's edge (Envoy) sets `x-envoy-external-address` to the single trusted
  // client IP — unlike the multi-hop `x-forwarded-for` chain. This is the header
  // to key rate limiting on in production; `cf-connecting-ip` is a fallback if
  // Cloudflare ever fronts us. (`x-railway-client-ip` never existed — a prior fix
  // named a fictional header, so in prod this returned "unknown" for everyone and
  // collapsed the gauntlet limiter into one shared bucket.)
  const trustedIp =
    headers?.get("x-envoy-external-address")?.trim() ||
    headers?.get("cf-connecting-ip")?.trim()

  if (trustedIp) {
    return trustedIp
  }

  if (process.env.NODE_ENV !== "production") {
    const forwarded = headers?.get("x-forwarded-for")
    const realIp = headers?.get("x-real-ip")?.trim()
    if (realIp) {
      return realIp
    }
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown"
    }
  }

  return "unknown"
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
