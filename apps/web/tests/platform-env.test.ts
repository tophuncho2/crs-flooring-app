import { afterEach, describe, expect, it } from "vitest"
import { resetRuntimeEnvironmentCacheForTests, validateRuntimeEnvironment } from "@/server/platform/env"

const baseEnvironment = {
  NEXTAUTH_SECRET: "super-secret-value-123",
  NEXTAUTH_URL: "https://example.com",
  AWS_ACCESS_KEY_ID: "key",
  AWS_DEFAULT_REGION: "us-east-1",
  AWS_ENDPOINT_URL: "https://bucket.example.com",
  AWS_S3_BUCKET_NAME: "builders-bucket",
  AWS_SECRET_ACCESS_KEY: "secret",
}

describe("validateRuntimeEnvironment", () => {
  afterEach(() => {
    resetRuntimeEnvironmentCacheForTests()
  })

  it("accepts the current required runtime variables", () => {
    const parsed = validateRuntimeEnvironment(baseEnvironment)

    expect(parsed.NEXTAUTH_URL).toBe("https://example.com")
  })

  it("rejects partial seeded admin configuration", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...baseEnvironment,
        SEEDED_ADMIN_EMAIL: "admin@test.com",
      }),
    ).toThrow("SEEDED_ADMIN_EMAIL and SEEDED_ADMIN_PASSWORD must be provided together")
  })

  it("rejects invalid redis urls when provided", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...baseEnvironment,
        REDIS_URL: "not-a-url",
      }),
    ).toThrow("REDIS_URL must be a valid URL")
  })

  it("requires REDIS_URL in staging and production", () => {
    expect(() =>
      validateRuntimeEnvironment({
        ...baseEnvironment,
        RAILWAY_ENVIRONMENT_NAME: "Staging",
      }),
    ).toThrow("REDIS_URL is required in staging and production")

    expect(() =>
      validateRuntimeEnvironment({
        ...baseEnvironment,
        RAILWAY_ENVIRONMENT_NAME: "production",
      }),
    ).toThrow("REDIS_URL is required in staging and production")
  })

  it("allows REDIS_URL to be omitted outside staging and production", () => {
    expect(
      validateRuntimeEnvironment({
        ...baseEnvironment,
        RAILWAY_ENVIRONMENT_NAME: "development",
      }).REDIS_URL,
    ).toBeUndefined()
  })
})
