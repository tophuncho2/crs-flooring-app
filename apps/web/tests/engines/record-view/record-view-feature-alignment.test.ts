import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.join(process.cwd(), "..", "..")

describe("record view feature alignment", () => {
  it("entities have no @/modules/shared/engines imports", async () => {
    const migratedDirs = [
      "apps/web/modules/entities",
      "apps/web/app/dashboard/entities",
      "apps/web/app/api/entities",
    ]

    const { execSync } = await import("node:child_process")
    for (const dir of migratedDirs) {
      const result = execSync(
        `grep -rln '@/modules/shared/engines' "${path.join(ROOT, dir)}" || true`,
        { encoding: "utf8" },
      ).trim()
      expect(result, `unexpected engine imports under ${dir}`).toBe("")
    }
  })
})
