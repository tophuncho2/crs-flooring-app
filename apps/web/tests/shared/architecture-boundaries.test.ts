import { readdirSync, readFileSync } from "node:fs"
import { extname, join } from "node:path"
import { describe, expect, it } from "vitest"

const REPO_ROOT = join(process.cwd(), "..", "..")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
])

function collectSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue
    }

    const fullPath = join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!SOURCE_EXTENSIONS.has(extname(entry.name))) {
      continue
    }

    files.push(fullPath)
  }

  return files
}

function readRelativeFiles(root: string) {
  return collectSourceFiles(root).map((absolutePath) => ({
    absolutePath,
    relativePath: absolutePath.slice(REPO_ROOT.length + 1),
    contents: readFileSync(absolutePath, "utf8"),
  }))
}

describe("architecture boundaries", () => {
  it("keeps BullMQ out of the web app", () => {
    const webFiles = readRelativeFiles(join(REPO_ROOT, "apps", "web"))
    const offenders = webFiles
      .filter(({ relativePath }) => !relativePath.includes("/tests/"))
      .filter(({ contents }) => /\bfrom\s+["']bullmq["']|\brequire\(["']bullmq["']\)/.test(contents))
      .map(({ relativePath }) => relativePath)

    expect(offenders).toEqual([])
  })

  it("prevents relay and worker from importing the web app", () => {
    const asyncRuntimeFiles = [
      ...readRelativeFiles(join(REPO_ROOT, "apps", "relay")),
      ...readRelativeFiles(join(REPO_ROOT, "apps", "worker")),
    ]
    const offenders = asyncRuntimeFiles
      .filter(({ contents }) =>
        /from\s+["'](?:@builders\/web|apps\/web|\.{1,2}\/.*apps\/web)|require\(["'](?:@builders\/web|apps\/web)/.test(contents),
      )
      .map(({ relativePath }) => relativePath)

    expect(offenders).toEqual([])
  })

  it("keeps Prisma out of the domain package", () => {
    const domainFiles = readRelativeFiles(join(REPO_ROOT, "packages", "domain"))
    const offenders = domainFiles
      .filter(({ relativePath }) => !relativePath.includes("/dist/"))
      .filter(({ contents }) => /\bfrom\s+["']@prisma\/client["']|\brequire\(["']@prisma\/client["']\)/.test(contents))
      .map(({ relativePath }) => relativePath)

    expect(offenders).toEqual([])
  })
})
