import { z } from "zod"

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readRuntimeEnvironment(source: NodeJS.ProcessEnv) {
  return {
    DATABASE_URL: optionalTrimmed(source.DATABASE_URL),
    NEXTAUTH_SECRET: optionalTrimmed(source.NEXTAUTH_SECRET),
    NEXTAUTH_URL: optionalTrimmed(source.NEXTAUTH_URL),
    AWS_ACCESS_KEY_ID: optionalTrimmed(source.AWS_ACCESS_KEY_ID),
    AWS_DEFAULT_REGION: optionalTrimmed(source.AWS_DEFAULT_REGION),
    AWS_ENDPOINT_URL: optionalTrimmed(source.AWS_ENDPOINT_URL),
    AWS_S3_BUCKET_NAME: optionalTrimmed(source.AWS_S3_BUCKET_NAME),
    AWS_SECRET_ACCESS_KEY: optionalTrimmed(source.AWS_SECRET_ACCESS_KEY),
    REDIS_URL: optionalTrimmed(source.REDIS_URL),
    RATE_LIMIT_PREFIX: optionalTrimmed(source.RATE_LIMIT_PREFIX),
    SEEDED_ADMIN_EMAIL: optionalTrimmed(source.SEEDED_ADMIN_EMAIL),
    SEEDED_ADMIN_PASSWORD: optionalTrimmed(source.SEEDED_ADMIN_PASSWORD),
    SEEDED_BUILDER_EMAIL: optionalTrimmed(source.SEEDED_BUILDER_EMAIL),
    SEEDED_BUILDER_PASSWORD: optionalTrimmed(source.SEEDED_BUILDER_PASSWORD),
  }
}

const runtimeEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
    AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
    AWS_DEFAULT_REGION: z.string().min(1, "AWS_DEFAULT_REGION is required"),
    AWS_ENDPOINT_URL: z.string().url("AWS_ENDPOINT_URL must be a valid URL"),
    AWS_S3_BUCKET_NAME: z.string().min(1, "AWS_S3_BUCKET_NAME is required"),
    AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
    REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
    RATE_LIMIT_PREFIX: z.string().min(1, "RATE_LIMIT_PREFIX cannot be empty").optional(),
    SEEDED_ADMIN_EMAIL: z.string().email("SEEDED_ADMIN_EMAIL must be a valid email").optional(),
    SEEDED_ADMIN_PASSWORD: z.string().min(12, "SEEDED_ADMIN_PASSWORD must be at least 12 characters").optional(),
    SEEDED_BUILDER_EMAIL: z.string().email("SEEDED_BUILDER_EMAIL must be a valid email").optional(),
    SEEDED_BUILDER_PASSWORD: z.string().min(12, "SEEDED_BUILDER_PASSWORD must be at least 12 characters").optional(),
  })
  .superRefine((env, context) => {
    const seededAdminValues = [env.SEEDED_ADMIN_EMAIL, env.SEEDED_ADMIN_PASSWORD]
    if (seededAdminValues.some(Boolean) && !seededAdminValues.every(Boolean)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SEEDED_ADMIN_EMAIL and SEEDED_ADMIN_PASSWORD must be provided together",
        path: ["SEEDED_ADMIN_EMAIL"],
      })
    }

    const seededBuilderValues = [env.SEEDED_BUILDER_EMAIL, env.SEEDED_BUILDER_PASSWORD]
    if (seededBuilderValues.some(Boolean) && !seededBuilderValues.every(Boolean)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SEEDED_BUILDER_EMAIL and SEEDED_BUILDER_PASSWORD must be provided together",
        path: ["SEEDED_BUILDER_EMAIL"],
      })
    }
  })

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>

let cachedRuntimeEnvironment: RuntimeEnvironment | null = null

function formatEnvironmentIssues(error: z.ZodError<RuntimeEnvironment>) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "environment"
      return `${path}: ${issue.message}`
    })
    .join("; ")
}

export function validateRuntimeEnvironment(source: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  const parsed = runtimeEnvironmentSchema.safeParse(readRuntimeEnvironment(source))

  if (!parsed.success) {
    throw new Error(`Invalid runtime environment: ${formatEnvironmentIssues(parsed.error)}`)
  }

  return parsed.data
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  if (cachedRuntimeEnvironment) {
    return cachedRuntimeEnvironment
  }

  cachedRuntimeEnvironment = validateRuntimeEnvironment()
  return cachedRuntimeEnvironment
}

export function resetRuntimeEnvironmentCacheForTests() {
  cachedRuntimeEnvironment = null
}

export function getStorageEnvironment() {
  const env = getRuntimeEnvironment()

  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    defaultRegion: env.AWS_DEFAULT_REGION,
    endpointUrl: env.AWS_ENDPOINT_URL,
    bucketName: env.AWS_S3_BUCKET_NAME,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  }
}

export function getRateLimitEnvironment() {
  return {
    redisUrl: optionalTrimmed(process.env.REDIS_URL),
    prefix: optionalTrimmed(process.env.RATE_LIMIT_PREFIX) ?? "builderswebapp",
  }
}

export function getRuntimeEnvironmentLabel() {
  return optionalTrimmed(process.env.RAILWAY_ENVIRONMENT_NAME) ?? process.env.NODE_ENV ?? "development"
}

export function getRuntimeServiceName() {
  return optionalTrimmed(process.env.RAILWAY_SERVICE_NAME) ?? "builders-app"
}
