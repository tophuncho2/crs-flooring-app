import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("package scripts", () => {
  it("keeps web startup free of implicit migrations and routes db operations through the workspace root", () => {
    const webPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }
    const rootPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }

    expect(webPackageJson.scripts.dev).toBe("next dev")
    expect(webPackageJson.scripts.start).toBe("next start")
    expect(rootPackageJson.scripts["db:migrate"]).toBe("npm run db:migrate --workspace @builders/db")
    expect(rootPackageJson.scripts["deploy:prepare"]).toBe("npm run db:migrate && npm run db:seed")
    expect(rootPackageJson.scripts["db:backfill:product-names"]).toBe("npm run db:backfill:product-names --workspace @builders/db")
  })
})
