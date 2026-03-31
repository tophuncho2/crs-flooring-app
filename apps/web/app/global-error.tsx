"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "32rem", textAlign: "center" }}>
            <h1 style={{ marginBottom: "0.75rem" }}>Something went wrong</h1>
            <p style={{ marginBottom: "1rem" }}>
              The error was captured. Try again, and if it keeps happening, check the deployed logs and
              Sentry.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: "1px solid currentColor",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
