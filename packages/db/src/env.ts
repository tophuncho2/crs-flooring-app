export type DatabaseEnvironment = {
  DATABASE_URL: string
}

let cachedDatabaseEnvironment: DatabaseEnvironment | null = null
let hasAttemptedDatabaseEnvironmentLoad = false

function normalize(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function validateDatabaseEnvironment(source: NodeJS.ProcessEnv = process.env): DatabaseEnvironment {
  const databaseUrl = normalize(source.DATABASE_URL)

  if (!databaseUrl) {
    throw new Error("Invalid database environment: DATABASE_URL is required")
  }

  return {
    DATABASE_URL: databaseUrl,
  }
}

function tryLoadDatabaseEnvironment() {
  if (hasAttemptedDatabaseEnvironmentLoad) {
    return
  }

  hasAttemptedDatabaseEnvironmentLoad = true

  if (typeof process.loadEnvFile !== "function") {
    return
  }

  const moduleUrl = import.meta.url
  const modulePath = decodeURIComponent(moduleUrl.startsWith("file://") ? moduleUrl.slice("file://".length) : moduleUrl)
  const lastSlashIndex = modulePath.lastIndexOf("/")
  const currentDirectory = lastSlashIndex >= 0 ? modulePath.slice(0, lastSlashIndex) : modulePath
  const envFilePath = process.env.DOTENV_CONFIG_PATH ?? `${currentDirectory}/../../../.env`

  try {
    process.loadEnvFile(envFilePath)
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null

    if (errorCode !== "ENOENT") {
      throw error
    }
  }
}

export function getDatabaseEnvironment(): DatabaseEnvironment {
  if (cachedDatabaseEnvironment) {
    return cachedDatabaseEnvironment
  }

  tryLoadDatabaseEnvironment()
  cachedDatabaseEnvironment = validateDatabaseEnvironment()
  return cachedDatabaseEnvironment
}

export function resetDatabaseEnvironmentCacheForTests() {
  cachedDatabaseEnvironment = null
  hasAttemptedDatabaseEnvironmentLoad = false
}
