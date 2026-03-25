"use client"

import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function SuccessNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600",
        className,
      )}
    >
      {children}
    </p>
  )
}

export function ErrorNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600",
        className,
      )}
    >
      {children}
    </p>
  )
}

export function LoadingNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-700",
        className,
      )}
    >
      {children}
    </p>
  )
}

export function FormStatusNotices({
  message = "",
  error = "",
  loadingMessage = "",
  className,
}: {
  message?: string
  error?: string
  loadingMessage?: string
  className?: string
}) {
  if (!message && !error && !loadingMessage) {
    return null
  }

  return (
    <div className={joinClasses("space-y-3", className)}>
      {message ? <SuccessNotice>{message}</SuccessNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {loadingMessage ? <LoadingNotice>{loadingMessage}</LoadingNotice> : null}
    </div>
  )
}
