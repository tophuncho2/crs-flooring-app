"use client"

import { SuccessNotice } from "./success-notice"
import { ErrorNotice } from "./error-notice"
import { LoadingNotice } from "./loading-notice"
import { InfoNotice } from "./info-notice"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function FormStatusNotices({
  message = "",
  error = "",
  loadingMessage = "",
  info = "",
  className,
}: {
  message?: string
  error?: string
  loadingMessage?: string
  info?: string
  className?: string
}) {
  if (!message && !error && !loadingMessage && !info) {
    return null
  }

  return (
    <div className={joinClasses("space-y-3", className)}>
      {message ? <SuccessNotice>{message}</SuccessNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {loadingMessage ? <LoadingNotice>{loadingMessage}</LoadingNotice> : null}
      {info ? <InfoNotice>{info}</InfoNotice> : null}
    </div>
  )
}
