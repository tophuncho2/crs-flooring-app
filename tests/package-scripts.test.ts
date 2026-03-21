import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("package scripts", () => {
  it("keeps app startup free of implicit migrations and seeding", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts.start).toBe("next start")
    expect(packageJson.scripts["db:migrate"]).toBe("prisma migrate deploy")
    expect(packageJson.scripts["deploy:prepare"]).toBe("npm run db:migrate && npm run db:seed:users")
  })
})
