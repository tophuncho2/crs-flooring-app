import { normalizePrismaError } from "@/server/http/api-helpers"
import type { AppResult } from "./contracts"

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
