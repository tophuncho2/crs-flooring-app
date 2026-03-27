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
        NEXTAUTH_SECRET: "short",
        NEXTAUTH_URL: "http://localhost:3000",
      }),
    ).toThrow("NEXTAUTH_SECRET must be at least 16 characters")

    expect(
      validateAuthEnvironment({
        NEXTAUTH_SECRET: "super-secret-value-123",
        NEXTAUTH_URL: "http://localhost:3000",
      }),
    ).toEqual({
      NEXTAUTH_SECRET: "super-secret-value-123",
      NEXTAUTH_URL: "http://localhost:3000",
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

  it("requires RATE_LIMIT_REDIS_URL for rate limiting in staging and production", () => {
    expect(() =>
      validateRateLimitEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL is required in staging and production")

    expect(() =>
      validateRateLimitEnvironment({
        RAILWAY_ENVIRONMENT_NAME: "production",
      }),
    ).toThrow("RATE_LIMIT_REDIS_URL is required in staging and production")
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
