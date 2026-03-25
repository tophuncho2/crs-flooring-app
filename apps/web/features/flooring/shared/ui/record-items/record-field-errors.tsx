"use client"

import type { ReactNode } from "react"
import { RequestJsonError } from "@/features/flooring/shared/transport/http"

export type FieldErrorMap<TField extends string = string> = Partial<Record<TField, string>>
export type RowFieldErrors<TField extends string = string> = Record<string, FieldErrorMap<TField>>

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function normalizeFieldName(field: string | null) {
  if (!field) {
    return null
  }

  const segments = field
    .split(".")
    .flatMap((segment) => segment.split("["))
    .map((segment) => segment.replace(/]/g, ""))
    .filter(Boolean)

  return segments.at(-1) ?? null
}

export function getRequestFieldError(error: unknown) {
  if (error instanceof RequestJsonError) {
    const payloadField = typeof error.payload.field === "string" ? error.payload.field : null

    return {
      field: normalizeFieldName(payloadField),
      message: error.message,
    }
  }

  if (error && typeof error === "object") {
    const maybeError = error as { field?: unknown; message?: unknown }

    return {
      field: typeof maybeError.field === "string" ? normalizeFieldName(maybeError.field) : null,
      message: typeof maybeError.message === "string" ? maybeError.message : "Request failed",
    }
  }

  if (error instanceof Error) {
    return {
      field: null,
      message: error.message,
    }
  }

  return {
    field: null,
    message: "Request failed",
  }
}

export function getFieldControlClassName(className: string, hasError: boolean) {
  return joinClasses(
    className,
    hasError ? "border-rose-500/70 bg-rose-500/5 ring-1 ring-rose-500/20" : null,
  )
}

export function hasFieldErrors<TField extends string>(errors: FieldErrorMap<TField> | undefined) {
  return Boolean(errors && Object.keys(errors).length > 0)
}

export function clearFieldError<TField extends string>(errors: FieldErrorMap<TField>, field: TField) {
  if (!(field in errors)) {
    return errors
  }

  const next = { ...errors }
  delete next[field]
  return next
}

export function setFieldError<TField extends string>(field: TField, message: string) {
  return { [field]: message } as FieldErrorMap<TField>
}

export function clearRowFieldError<TField extends string>(errors: RowFieldErrors<TField>, rowId: string, field: TField) {
  const current = errors[rowId]
  if (!current || !(field in current)) {
    return errors
  }

  const nextRowErrors = clearFieldError(current, field)
  if (!hasFieldErrors(nextRowErrors)) {
    const next = { ...errors }
    delete next[rowId]
    return next
  }

  return {
    ...errors,
    [rowId]: nextRowErrors,
  }
}

export function setRowFieldErrors<TField extends string>(errors: RowFieldErrors<TField>, rowId: string, nextRowErrors: FieldErrorMap<TField>) {
  if (!hasFieldErrors(nextRowErrors)) {
    const next = { ...errors }
    delete next[rowId]
    return next
  }

  return {
    ...errors,
    [rowId]: nextRowErrors,
  }
}

export function FieldErrorText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={joinClasses("text-xs text-rose-600", className)}>{children}</p>
}
