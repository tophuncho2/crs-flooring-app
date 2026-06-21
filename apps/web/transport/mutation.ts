"use client"

import { RequestJsonError } from "@/transport/http"
import type { MutationMeta, MutationRequest } from "@/server/http/route-policy"

// `idempotencyKey` defaults to a fresh UUID, but callers can pass a STABLE key
// they hold across retries of one submit intent. Per-call random keys are the
// known double-submit bug: a retried create lands a second row. A create form
// should generate one key per intent and reuse it (see the payments record
// controller); guarded mutations (update/delete) can keep the default.
export function createMutationMeta(
  expectedUpdatedAt?: string,
  idempotencyKey?: string,
): MutationMeta {
  return {
    idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
  }
}

export function withMutationMeta<T extends Record<string, unknown>>(
  value: T,
  expectedUpdatedAt?: string,
  idempotencyKey?: string,
): MutationRequest<T> {
  return {
    ...value,
    mutation: createMutationMeta(expectedUpdatedAt, idempotencyKey),
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
