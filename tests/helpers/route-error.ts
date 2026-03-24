import { normalizePrismaError } from "@/server/http/api-helpers"

export function mockRouteErrorResponse(error: unknown) {
  const normalized = normalizePrismaError(error)

  return new Response(
    JSON.stringify(
      normalized.field
        ? { error: normalized.message, field: normalized.field }
        : { error: normalized.message },
    ),
    { status: normalized.status },
  )
}
