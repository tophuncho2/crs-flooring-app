"use client"

import { RequestJsonError } from "@/modules/shared/engines/common/transport/http"
import type { MutationMeta, MutationRequest } from "@/server/http/route-policy"

export function createMutationMeta(expectedUpdatedAt?: string): MutationMeta {
  return {
    idempotencyKey: crypto.randomUUID(),
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
  }
}

export function withMutationMeta<T extends Record<string, unknown>>(
  value: T,
  expectedUpdatedAt?: string,
): MutationRequest<T> {
  return {
    ...value,
    mutation: createMutationMeta(expectedUpdatedAt),
  }
}

export function getConflictSnapshot<T>(error: unknown): T | null {
  if (error instanceof RequestJsonError && error.status === 409 && error.payload.snapshot) {
    return error.payload.snapshot as T
  }

  return null
}

export function isConflictError(error: unknown) {
  return error instanceof RequestJsonError && error.status === 409
}
