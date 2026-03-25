import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("package scripts", () => {
  it("keeps Prisma ownership in the db workspace and removes deploy-time migration shortcuts", () => {
    const webPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }
    const dbPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "packages", "db", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }
    const rootPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }

    expect(webPackageJson.scripts.dev).toBe("next dev")
    expect(webPackageJson.scripts.start).toBe("next start")
    expect(rootPackageJson.scripts["db:generate"]).toBe("npm run db:generate --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:migrate:dev"]).toBe("npm run db:migrate:dev --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:deploy"]).toBe("npm run db:deploy --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:seed"]).toBe("npm run db:seed --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:studio"]).toBe("npm run db:studio --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:migrate"]).toBeUndefined()
    expect(rootPackageJson.scripts["deploy:prepare"]).toBeUndefined()
    expect(rootPackageJson.scripts["db:backfill:product-names"]).toBe("npm run db:backfill:product-names --workspace @builders/db")
    expect(dbPackageJson.scripts["db:generate"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma generate")
    expect(dbPackageJson.scripts["db:migrate:dev"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma migrate dev --skip-seed")
    expect(dbPackageJson.scripts["db:deploy"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma migrate deploy")
    expect(dbPackageJson.scripts["db:seed"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma db seed")
    expect(dbPackageJson.scripts["db:studio"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma studio")
  })
})
