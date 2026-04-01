import { logEvent } from "@/server/platform/logger"

type LoaderTimingOptions = {
  loader: string
  details?: Record<string, unknown>
}

function shouldLogLoaderTiming() {
  return process.env.NODE_ENV !== "production" || process.env.RAILWAY_ENVIRONMENT_NAME === "staging"
}

export async function withLoaderTiming<T>(
  options: LoaderTimingOptions,
  operation: () => Promise<T>,
) {
  const startedAt = Date.now()

  try {
    const result = await operation()

    if (shouldLogLoaderTiming()) {
      logEvent({
        message: "Page loader completed",
        action: "page.loader",
        route: options.loader,
        details: {
          durationMs: Date.now() - startedAt,
          ...options.details,
        },
      })
    }

    return result
  } catch (error) {
    if (shouldLogLoaderTiming()) {
      logEvent({
        level: "error",
        message: "Page loader failed",
        action: "page.loader.error",
        route: options.loader,
        details: {
          durationMs: Date.now() - startedAt,
          ...options.details,
        },
        error,
      })
    }

    throw error
  }
}
