import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { REQUEST_ID_HEADER } from "@/server/platform/request-context"

// Optimistic auth gate for dashboard routes: bounce to /login when there's no
// Better Auth session cookie. Full session validation still happens server-side
// per request (`getSessionUser`); this just avoids rendering protected shells.
export default function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const config = { matcher: ["/dashboard/:path*"] }
