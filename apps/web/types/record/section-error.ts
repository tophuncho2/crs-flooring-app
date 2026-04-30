"use client"

import { RequestJsonError } from "@builders/lib"

export type RecordSectionErrorKind =
  | "validation"
  | "conflict"
  | "transport"
  | "workflow"
  | "stale-revision"
  | "allocation-invariant"

export type RecordSectionError = {
  kind: RecordSectionErrorKind
  message: string
  description?: string
  field?: string
  requestId?: string | null
  retryable?: boolean
  details?: Record<string, unknown>
}

export function isRecordSectionError(value: unknown): value is RecordSectionError {
  return Boolean(
    value &&
      typeof value === "object" &&
      "kind" in value &&
      "message" in value &&
      typeof (value as { kind: unknown }).kind === "string" &&
      typeof (value as { message: unknown }).message === "string",
  )
}

export function createRecordSectionError(input: RecordSectionError): RecordSectionError {
  return input
}

export function normalizeRecordSectionError(
  error: unknown,
  options: {
    defaultMessage?: string
    defaultKind?: RecordSectionErrorKind
  } = {},
): RecordSectionError {
  if (isRecordSectionError(error)) {
    return error
  }

  const defaultMessage = options.defaultMessage ?? "Failed to save section"
  const defaultKind = options.defaultKind ?? "transport"

  if (error instanceof RequestJsonError) {
    const payload = error.payload
    const field = typeof payload.field === "string" ? payload.field : undefined
    const details = payload
    const description = typeof payload.detail === "string" ? payload.detail : undefined

    if (error.status === 409 && payload.snapshot) {
      return {
        kind: field === "updatedAt" ? "stale-revision" : "conflict",
        message: error.message,
        description,
        field,
        requestId: error.requestId,
        retryable: true,
        details,
      }
    }

    if (defaultKind === "allocation-invariant") {
      return {
        kind: "allocation-invariant",
        message: error.message || defaultMessage,
        description,
        field,
        requestId: error.requestId,
        retryable: error.status < 500,
        details,
      }
    }

    if (error.status === 400 || field) {
      return {
        kind: "validation",
        message: error.message,
        description,
        field,
        requestId: error.requestId,
        retryable: true,
        details,
      }
    }

    if (error.status >= 500) {
      return {
        kind: defaultKind,
        message: error.message || defaultMessage,
        description,
        field,
        requestId: error.requestId,
        retryable: true,
        details,
      }
    }

    return {
      kind: defaultKind,
      message: error.message || defaultMessage,
      description,
      field,
      requestId: error.requestId,
      retryable: error.status < 500,
      details,
    }
  }

  if (error instanceof Error) {
    return {
      kind: defaultKind,
      message: error.message || defaultMessage,
      retryable: true,
    }
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return {
      kind: defaultKind,
      message: error,
      retryable: true,
    }
  }

  return {
    kind: defaultKind,
    message: defaultMessage,
    retryable: true,
  }
}
