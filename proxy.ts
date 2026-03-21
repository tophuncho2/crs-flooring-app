import { NextResponse, type NextRequest } from "next/server"
import { withAuth } from "next-auth/middleware"
import { REQUEST_ID_HEADER } from "@/server/platform/request-context"

export default withAuth(function proxy(request: NextRequest) {
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
}, {
  pages: {
    signIn: "/login"
  }
})

export const config = { matcher: ["/dashboard/:path*"] }
