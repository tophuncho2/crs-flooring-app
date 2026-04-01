import { normalizePrismaError } from "@/server/http/api-helpers"

type AppResultIssue = {
  code: string
  message: string
  field?: string
  status: number
  retryable: boolean
}

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; issue: AppResultIssue }

export async function runUseCase<T>(operation: () => Promise<T>): Promise<AppResult<T>> {
  try {
    return {
      ok: true,
      data: await operation(),
    }
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return {
      ok: false,
      issue: {
        code: normalized.field ? "VALIDATION_ERROR" : normalized.status >= 500 ? "UNEXPECTED_ERROR" : "REQUEST_ERROR",
        message: normalized.message,
        field: normalized.field,
        status: normalized.status,
        retryable: normalized.status >= 500,
      },
    }
  }
}
