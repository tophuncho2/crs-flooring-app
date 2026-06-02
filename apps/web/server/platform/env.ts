import { z } from "zod"

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function formatEnvironmentIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "environment"
      return `${path}: ${issue.message}`
    })
    .join("; ")
}

function parseEnvironment<T>(label: string, schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value)

  if (!parsed.success) {
    throw new Error(`Invalid ${label} environment: ${formatEnvironmentIssues(parsed.error)}`)
  }

  return parsed.data
}

function readWebCoreEnvironment(source: NodeJS.ProcessEnv) {
  return {
    RAILWAY_ENVIRONMENT_NAME: optionalTrimmed(source.RAILWAY_ENVIRONMENT_NAME),
    RAILWAY_SERVICE_NAME: optionalTrimmed(source.RAILWAY_SERVICE_NAME),
  }
}

function readAuthEnvironment(source: NodeJS.ProcessEnv) {
  return {
    NEXTAUTH_SECRET: optionalTrimmed(source.NEXTAUTH_SECRET),
    NEXTAUTH_URL: optionalTrimmed(source.NEXTAUTH_URL),
  }
}

function readStorageEnvironment(source: NodeJS.ProcessEnv) {
  return {
    AWS_ACCESS_KEY_ID: optionalTrimmed(source.AWS_ACCESS_KEY_ID),
    AWS_DEFAULT_REGION: optionalTrimmed(source.AWS_DEFAULT_REGION),
    AWS_ENDPOINT_URL: optionalTrimmed(source.AWS_ENDPOINT_URL),
    AWS_S3_BUCKET_NAME: optionalTrimmed(source.AWS_S3_BUCKET_NAME),
    AWS_SECRET_ACCESS_KEY: optionalTrimmed(source.AWS_SECRET_ACCESS_KEY),
  }
}

function readRateLimitEnvironment(source: NodeJS.ProcessEnv) {
  return {
    RAILWAY_ENVIRONMENT_NAME: optionalTrimmed(source.RAILWAY_ENVIRONMENT_NAME),
    RATE_LIMIT_REDIS_URL: optionalTrimmed(source.RATE_LIMIT_REDIS_URL),
    REDIS_URL: optionalTrimmed(source.REDIS_URL),
    RATE_LIMIT_PREFIX: optionalTrimmed(source.RATE_LIMIT_PREFIX),
  }
}

const webCoreEnvironmentSchema = z.object({
  RAILWAY_ENVIRONMENT_NAME: z.string().min(1).optional(),
  RAILWAY_SERVICE_NAME: z.string().min(1).optional(),
})

const authEnvironmentSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
})

const storageEnvironmentSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_DEFAULT_REGION: z.string().min(1, "AWS_DEFAULT_REGION is required"),
  AWS_ENDPOINT_URL: z.string().url("AWS_ENDPOINT_URL must be a valid URL"),
  AWS_S3_BUCKET_NAME: z.string().min(1, "AWS_S3_BUCKET_NAME is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
})

const rateLimitEnvironmentSchema = z
  .object({
    RAILWAY_ENVIRONMENT_NAME: z.string().min(1).optional(),
    RATE_LIMIT_REDIS_URL: z.string().url("RATE_LIMIT_REDIS_URL must be a valid URL").optional(),
    REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
    RATE_LIMIT_PREFIX: z.string().min(1, "RATE_LIMIT_PREFIX cannot be empty").optional(),
  })
  .superRefine((env, context) => {
    const runtimeLabel = env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase()
    if ((runtimeLabel === "staging" || runtimeLabel === "main") && !env.RATE_LIMIT_REDIS_URL && !env.REDIS_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RATE_LIMIT_REDIS_URL is required in staging and main",
        path: ["RATE_LIMIT_REDIS_URL"],
      })
    }
  })

export type WebCoreEnvironment = z.infer<typeof webCoreEnvironmentSchema>
export type AuthEnvironment = z.infer<typeof authEnvironmentSchema>
export type StorageEnvironment = {
  accessKeyId: string
  defaultRegion: string
  endpointUrl: string
  bucketName: string
  secretAccessKey: string
}
export type RateLimitEnvironment = {
  redisUrl: string | undefined
  prefix: string
}

let cachedWebCoreEnvironment: WebCoreEnvironment | null = null
let cachedAuthEnvironment: AuthEnvironment | null = null
let cachedStorageEnvironment: StorageEnvironment | null = null
let cachedRateLimitEnvironment: RateLimitEnvironment | null = null

export function validateWebCoreEnvironment(source: NodeJS.ProcessEnv = process.env): WebCoreEnvironment {
  return parseEnvironment("web core", webCoreEnvironmentSchema, readWebCoreEnvironment(source))
}

export function getWebCoreEnvironment(): WebCoreEnvironment {
  if (cachedWebCoreEnvironment) {
    return cachedWebCoreEnvironment
  }

  cachedWebCoreEnvironment = validateWebCoreEnvironment()
  return cachedWebCoreEnvironment
}

function assertProductionAuthUrl(nextAuthUrl: string) {
  let hostname: string | null = null
  try {
    hostname = new URL(nextAuthUrl).hostname
  } catch {
    hostname = null
  }

  const isLocalHost =
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")

  if (isLocalHost || !nextAuthUrl.startsWith("https://")) {
    throw new Error(
      "Invalid auth environment: NEXTAUTH_URL must be a public https URL in production (not localhost). " +
        "A misconfigured value sends post-logout redirects to an unprovisioned host.",
    )
  }
}

export function validateAuthEnvironment(source: NodeJS.ProcessEnv = process.env): AuthEnvironment {
  const parsed = parseEnvironment("auth", authEnvironmentSchema, readAuthEnvironment(source))

  // Only enforce on deployed Railway services (which set RAILWAY_ENVIRONMENT_NAME);
  // local builds/`next start` legitimately use a localhost NEXTAUTH_URL.
  if (optionalTrimmed(source.RAILWAY_ENVIRONMENT_NAME)) {
    assertProductionAuthUrl(parsed.NEXTAUTH_URL)
  }

  return parsed
}

export function getAuthEnvironment(): AuthEnvironment {
  if (cachedAuthEnvironment) {
    return cachedAuthEnvironment
  }

  cachedAuthEnvironment = validateAuthEnvironment()
  return cachedAuthEnvironment
}

export function validateStorageEnvironment(source: NodeJS.ProcessEnv = process.env): StorageEnvironment {
  const parsed = parseEnvironment("storage", storageEnvironmentSchema, readStorageEnvironment(source))

  return {
    accessKeyId: parsed.AWS_ACCESS_KEY_ID,
    defaultRegion: parsed.AWS_DEFAULT_REGION,
    endpointUrl: parsed.AWS_ENDPOINT_URL,
    bucketName: parsed.AWS_S3_BUCKET_NAME,
    secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
  }
}

export function getStorageEnvironment(): StorageEnvironment {
  if (cachedStorageEnvironment) {
    return cachedStorageEnvironment
  }

  cachedStorageEnvironment = validateStorageEnvironment()
  return cachedStorageEnvironment
}

export function validateRateLimitEnvironment(source: NodeJS.ProcessEnv = process.env): RateLimitEnvironment {
  const parsed = parseEnvironment("rate limit", rateLimitEnvironmentSchema, readRateLimitEnvironment(source))

  return {
    redisUrl: parsed.RATE_LIMIT_REDIS_URL ?? parsed.REDIS_URL,
    prefix: parsed.RATE_LIMIT_PREFIX ?? "builderswebapp",
  }
}

export function getRateLimitEnvironment(): RateLimitEnvironment {
  if (cachedRateLimitEnvironment) {
    return cachedRateLimitEnvironment
  }

  cachedRateLimitEnvironment = validateRateLimitEnvironment()
  return cachedRateLimitEnvironment
}

export function resetRuntimeEnvironmentCacheForTests() {
  cachedWebCoreEnvironment = null
  cachedAuthEnvironment = null
  cachedStorageEnvironment = null
  cachedRateLimitEnvironment = null
}

export function getRuntimeEnvironmentLabel() {
  return getWebCoreEnvironment().RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development"
}

export function getRuntimeServiceName() {
  return getWebCoreEnvironment().RAILWAY_SERVICE_NAME ?? "builders-app"
}
