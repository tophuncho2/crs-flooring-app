import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
    return
  }

  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  await import("./sentry.server.config")

  const [{ validateWebCoreEnvironment }, { logEvent }] = await Promise.all([
    import("@/server/platform/env"),
    import("@/server/platform/logger"),
  ])

  validateWebCoreEnvironment()

  logEvent({
    message: "Runtime environment validated successfully",
    action: "platform.env.validated",
    route: "instrumentation",
  })
}

export const onRequestError = Sentry.captureRequestError
