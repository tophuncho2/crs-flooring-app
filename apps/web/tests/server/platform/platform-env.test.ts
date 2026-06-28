import { afterEach, describe, expect, it } from "vitest"
import {
  resetRuntimeEnvironmentCacheForTests,
  validateAuthEnvironment,
  validateRateLimitEnvironment,
  validateStorageEnvironment,
  validateWebCoreEnvironment,
} from "@/server/platform/env"

describe("platform environment", () => {
  afterEach(() => {
    resetRuntimeEnvironmentCacheForTests()
  })

  it("allows the app to boot with only core environment values", () => {
    expect(
      validateWebCoreEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "development",
        RAILWAY_SERVICE_NAME: "builders-app",
      }),
    ).toEqual({
      RAILWAY_ENVIRONMENT_NAME: "development",
      RAILWAY_SERVICE_NAME: "builders-app",
    })

    expect(validateWebCoreEnvironment({})).toEqual({
      RAILWAY_ENVIRONMENT_NAME: undefined,
      RAILWAY_SERVICE_NAME: undefined,
    })
  })

  it("validates auth configuration only when auth is used", () => {
    expect(() =>
      validateAuthEnvironment({
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "short",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("BETTER_AUTH_SECRET must be at least 16 characters")

    expect(() =>
      validateAuthEnvironment({
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "super-secret-value-123",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("GOOGLE_CLIENT_ID")

    expect(
      validateAuthEnvironment({
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "super-secret-value-123",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toEqual({
      url: "http://localhost:3000",
      secret: "super-secret-value-123",
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
    })
  })

  it("rejects a localhost BETTER_AUTH_URL on a deployed Railway environment", () => {
    expect(() =>
      validateAuthEnvironment({
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "super-secret-value-123",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
        RAILWAY_ENVIRONMENT_NAME: "main",
      }),
    ).toThrow(/BETTER_AUTH_URL must be a public https URL/)
  })

  it("accepts a public https BETTER_AUTH_URL on a deployed Railway environment", () => {
    expect(
      validateAuthEnvironment({
        BETTER_AUTH_URL: "https://builderswebapp-production.up.railway.app",
        BETTER_AUTH_SECRET: "super-secret-value-123",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
        RAILWAY_ENVIRONMENT_NAME: "main",
      }),
    ).toEqual({
      url: "https://builderswebapp-production.up.railway.app",
      secret: "super-secret-value-123",
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
    })
  })

  it("validates storage configuration only when storage is used", () => {
    expect(() =>
      validateStorageEnvironment({
        AWS_ACCESS_KEY_ID: "key",
      }),
    ).toThrow("AWS_DEFAULT_REGION")

    expect(
      validateStorageEnvironment({
        AWS_ACCESS_KEY_ID: "key",
        AWS_DEFAULT_REGION: "us-east-1",
        AWS_ENDPOINT_URL: "https://bucket.example.com",
        AWS_S3_BUCKET_NAME: "builders-bucket",
        AWS_SECRET_ACCESS_KEY: "secret",
      }),
    ).toEqual({
      accessKeyId: "key",
      defaultRegion: "us-east-1",
      endpointUrl: "https://bucket.example.com",
      bucketName: "builders-bucket",
      secretAccessKey: "secret",
    })
  })

  it("keeps rate limiting optional in local development", () => {
    expect(
      validateRateLimitEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "development",
      }),
    ).toEqual({
      redisUrl: undefined,
      prefix: "builderswebapp",
    })
  })

  it("requires RATE_LIMIT_REDIS_URL for rate limiting in staging and main", () => {
    expect(() =>
      validateRateLimitEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL is required in staging and main")

    expect(() =>
      validateRateLimitEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "main",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL is required in staging and main")
  })

  it("rejects invalid RATE_LIMIT_REDIS_URL values when provided", () => {
    expect(() =>
      validateRateLimitEnvironment({
        RATE_LIMIT_REDIS_URL: "not-a-url",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL must be a valid URL")
  })

  it("falls back to REDIS_URL during the migration window", () => {
    expect(
      validateRateLimitEnvironment({
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toEqual({
      redisUrl: "redis://localhost:6379",
      prefix: "builderswebapp",
    })
  })
})
