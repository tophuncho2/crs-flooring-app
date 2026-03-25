export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

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
