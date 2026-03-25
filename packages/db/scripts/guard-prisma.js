const fs = require("node:fs")
const path = require("node:path")

const repositoryRoot = path.resolve(__dirname, "../../..")
const allowedSchemaPath = path.join(repositoryRoot, "packages/db/prisma/schema.prisma")
const allowedPrismaConfigPath = path.join(repositoryRoot, "packages/db/prisma.config.ts")
const allowedMigrationRoot = path.join(repositoryRoot, "packages/db/prisma/migrations")
const disallowedWebDbDirectory = path.join(repositoryRoot, "apps/web/server/db")
const ignoredDirectoryNames = new Set([".git", "node_modules", ".next", "dist", ".cache"])
const sourceFilePattern = /\.(?:[cm]?[jt]sx?)$/
const prismaCliPattern = /(?:^|[\s;&|()])(?:(?:npx|npm\s+exec)\s+)?prisma(?=\s|$)/

function walkDirectory(rootDirectory, visitor) {
  const pendingDirectories = [rootDirectory]

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop()
    const directoryEntries = fs.readdirSync(currentDirectory, { withFileTypes: true })

    for (const entry of directoryEntries) {
      const entryPath = path.join(currentDirectory, entry.name)

      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          visitor(entryPath, entry)
          pendingDirectories.push(entryPath)
        }
        continue
      }

      visitor(entryPath, entry)
    }
  }
}

function toRepoPath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath) || "."
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function collectRepositoryState() {
  const files = []
  const directories = []

  walkDirectory(repositoryRoot, (entryPath, entry) => {
    if (entry.isDirectory()) {
      directories.push(entryPath)
      return
    }

    if (entry.isFile()) {
      files.push(entryPath)
    }
  })

  return { files, directories }
}

function getPackageJson(filePath) {
  return JSON.parse(readText(filePath))
}

function hasBuildersDbDependency(packageJson) {
  return Boolean(
    packageJson.dependencies?.["@builders/db"] ||
      packageJson.devDependencies?.["@builders/db"] ||
      packageJson.peerDependencies?.["@builders/db"],
  )
}

function main() {
  const failures = []
  const { files, directories } = collectRepositoryState()
  const packageJsonFiles = files.filter((filePath) => path.basename(filePath) === "package.json")
  const executableSurfaceFiles = files.filter((filePath) => {
    const relativePath = toRepoPath(filePath)
    return (
      relativePath.endsWith(".sh") ||
      relativePath.endsWith(".yml") ||
      relativePath.endsWith(".yaml") ||
      path.basename(filePath) === "Dockerfile" ||
      path.basename(filePath).startsWith("Dockerfile.") ||
      path.basename(filePath) === "nixpacks.toml" ||
      path.basename(filePath) === "railway.json" ||
      path.basename(filePath) === "vercel.json"
    )
  })

  const schemaFiles = files.filter((filePath) => path.basename(filePath) === "schema.prisma")
  const prismaConfigFiles = files.filter((filePath) => path.basename(filePath) === "prisma.config.ts")
  const migrationDirectories = directories.filter((directoryPath) => path.basename(directoryPath) === "migrations")

  if (schemaFiles.length !== 1 || schemaFiles[0] !== allowedSchemaPath) {
    failures.push(
      `Expected exactly one schema.prisma at ${toRepoPath(allowedSchemaPath)}. Found: ${schemaFiles.map(toRepoPath).join(", ") || "none"}`,
    )
  }

  if (prismaConfigFiles.length !== 1 || prismaConfigFiles[0] !== allowedPrismaConfigPath) {
    failures.push(
      `Expected exactly one prisma.config.ts at ${toRepoPath(allowedPrismaConfigPath)}. Found: ${prismaConfigFiles.map(toRepoPath).join(", ") || "none"}`,
    )
  }

  const unexpectedMigrationRoots = migrationDirectories.filter(
    (directoryPath) => directoryPath !== allowedMigrationRoot,
  )
  if (unexpectedMigrationRoots.length > 0 || !migrationDirectories.includes(allowedMigrationRoot)) {
    failures.push(
      `Expected exactly one active migrations root at ${toRepoPath(allowedMigrationRoot)}. Found: ${migrationDirectories.map(toRepoPath).join(", ") || "none"}`,
    )
  }

  if (fs.existsSync(disallowedWebDbDirectory)) {
    failures.push(`apps/web must not contain db wrapper files. Remove ${toRepoPath(disallowedWebDbDirectory)}`)
  }

  const invalidPrismaClientImports = files.filter((filePath) => {
    const relativePath = toRepoPath(filePath)
    if (!sourceFilePattern.test(filePath)) {
      return false
    }

    if (
      relativePath.startsWith("packages/db/") ||
      !(
        relativePath.startsWith("apps/") ||
        relativePath.startsWith("packages/domain/") ||
        relativePath.startsWith("packages/lib/") ||
        relativePath.startsWith("packages/ui/")
      )
    ) {
      return false
    }

    return /@prisma\/client/.test(readText(filePath))
  })
  if (invalidPrismaClientImports.length > 0) {
    failures.push(`Direct @prisma/client imports found outside packages/db: ${invalidPrismaClientImports.map(toRepoPath).join(", ")}`)
  }

  const appWrapperImports = files.filter((filePath) => {
    if (!sourceFilePattern.test(filePath)) {
      return false
    }
    const relativePath = toRepoPath(filePath)
    if (!relativePath.startsWith("apps/")) {
      return false
    }
    return /@\/server\/db\/(?:prisma|context|prisma-errors)\b/.test(readText(filePath))
  })
  if (appWrapperImports.length > 0) {
    failures.push(`App files still import deprecated @/server/db wrappers: ${appWrapperImports.map(toRepoPath).join(", ")}`)
  }

  const packageJsonWithPrismaCli = packageJsonFiles.filter((filePath) => {
    if (toRepoPath(filePath) === "packages/db/package.json") {
      return false
    }
    const packageJson = getPackageJson(filePath)
    return Object.values(packageJson.scripts ?? {}).some((script) => prismaCliPattern.test(script))
  })
  if (packageJsonWithPrismaCli.length > 0) {
    failures.push(`Prisma CLI usage must stay inside packages/db/package.json. Found in: ${packageJsonWithPrismaCli.map(toRepoPath).join(", ")}`)
  }

  const executableFilesWithPrismaCli = executableSurfaceFiles.filter((filePath) => {
    const relativePath = toRepoPath(filePath)
    if (relativePath.startsWith("packages/db/")) {
      return false
    }
    return prismaCliPattern.test(readText(filePath))
  })
  if (executableFilesWithPrismaCli.length > 0) {
    failures.push(`Prisma CLI usage found outside packages/db executable surfaces: ${executableFilesWithPrismaCli.map(toRepoPath).join(", ")}`)
  }

  for (const appName of ["web", "worker"]) {
    const appDirectory = path.join(repositoryRoot, "apps", appName)
    const appPackageJsonPath = path.join(appDirectory, "package.json")
    const appPackageJson = getPackageJson(appPackageJsonPath)
    const appImportsBuildersDb = files.some((filePath) => {
      const relativePath = toRepoPath(filePath)
      return relativePath.startsWith(`apps/${appName}/`) && sourceFilePattern.test(filePath) && /@builders\/db/.test(readText(filePath))
    })

    if (appImportsBuildersDb && !hasBuildersDbDependency(appPackageJson)) {
      failures.push(`apps/${appName} imports @builders/db but does not declare it in package.json`)
    }
  }

  const appEnvFilesWithDatabaseUrl = [
    path.join(repositoryRoot, "apps/web/server/platform/env.ts"),
    path.join(repositoryRoot, "apps/worker/src/env.ts"),
  ].filter((filePath) => /DATABASE_URL/.test(readText(filePath)))
  if (appEnvFilesWithDatabaseUrl.length > 0) {
    failures.push(`App environment modules must not validate DATABASE_URL directly: ${appEnvFilesWithDatabaseUrl.map(toRepoPath).join(", ")}`)
  }

  if (failures.length > 0) {
    console.error("Prisma guard failed:")
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exitCode = 1
    return
  }

  console.log("Prisma guard passed.")
}

main()
