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
  const trustedIp =
    headers?.get("cf-connecting-ip")?.trim() ||
    headers?.get("x-real-ip")?.trim() ||
    headers?.get("x-railway-client-ip")?.trim()

  if (trustedIp) {
    return trustedIp
  }

  const forwarded = headers?.get("x-forwarded-for")
  if (process.env.NODE_ENV !== "production" && forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
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
