import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

type Pkg = { scripts: Record<string, string> }

function expectBuildChain(chain: string | undefined, terminalWorkspace: string) {
  expect(chain, `expected build chain to be defined`).toBeTypeOf("string")
  const segments = chain!.split(" && ")
  expect(segments.length, `expected build chain to have at least one segment`).toBeGreaterThan(0)
  segments.forEach((segment) => {
    expect(
      segment,
      `every chain segment must be 'npm run build --workspace @builders/<pkg>': got '${segment}'`,
    ).toMatch(/^npm run build --workspace @builders\/[a-z-]+$/)
  })
  expect(
    segments.at(-1),
    `last chain segment must build the service workspace itself`,
  ).toBe(`npm run build --workspace ${terminalWorkspace}`)
}

describe("package scripts", () => {
  it("keeps Prisma ownership in the db workspace and removes deploy-time migration shortcuts", () => {
    const webPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as Pkg
    const dbPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "packages", "db", "package.json"), "utf8"),
    ) as Pkg
    const rootPackageJson = JSON.parse(
      readFileSync(join(process.cwd(), "..", "..", "package.json"), "utf8"),
    ) as Pkg

    expect(webPackageJson.scripts.dev).toBe("node ../../run-with-root-env.mjs ../../node_modules/next/dist/bin/next dev")
    expect(webPackageJson.scripts.build).toBe("node ../../run-with-root-env.mjs ../../node_modules/next/dist/bin/next build --webpack")
    // Deploy runs Next's standalone server (output: "standalone"); postbuild copies
    // static + public into the bundle since standalone omits them.
    expect(webPackageJson.scripts.postbuild).toBe("mkdir -p .next/standalone/apps/web/.next && cp -R .next/static .next/standalone/apps/web/.next/static && cp -R public .next/standalone/apps/web/public")
    // HOSTNAME=0.0.0.0 forces the standalone server to bind all interfaces; Docker/Railway
    // otherwise sets HOSTNAME to the container id and the healthcheck can't reach it.
    expect(webPackageJson.scripts.start).toBe("HOSTNAME=0.0.0.0 node ../../run-with-root-env.mjs .next/standalone/apps/web/server.js")
    expect(webPackageJson.scripts.typecheck).toBe("node ../../run-with-root-env.mjs ../../node_modules/next/dist/bin/next typegen && tsc -p tsconfig.json --noEmit")

    expectBuildChain(rootPackageJson.scripts["build:web"], "@builders/web")
    expectBuildChain(rootPackageJson.scripts["build:relay"], "@builders/relay")
    expectBuildChain(rootPackageJson.scripts["build:worker"], "@builders/worker")

    expect(rootPackageJson.scripts["start:web"]).toBe("npm run start --workspace @builders/web")
    expect(rootPackageJson.scripts["start:relay"]).toBe("npm run start --workspace @builders/relay")
    expect(rootPackageJson.scripts["start:worker"]).toBe("npm run start --workspace @builders/worker")
    expect(rootPackageJson.scripts.test).toBe("npm run test --workspace @builders/domain && npm run test --workspace @builders/db && npm run test --workspace @builders/application && npm run test --workspace @builders/web && npm run test --workspace @builders/relay && npm run test --workspace @builders/worker")
    expect(rootPackageJson.scripts["db:generate"]).toBe("npm run db:generate --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:migrate:dev"]).toBe("npm run db:migrate:dev --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:deploy"]).toBe("npm run db:deploy --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:seed"]).toBe("npm run db:seed --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:studio"]).toBe("npm run db:studio --workspace @builders/db --")
    expect(rootPackageJson.scripts["db:migrate"]).toBeUndefined()
    expect(rootPackageJson.scripts["deploy:prepare"]).toBeUndefined()
    expect(rootPackageJson.scripts["db:backfill:product-names"]).toBeUndefined()
    expect(dbPackageJson.scripts["db:generate"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma generate")
    expect(dbPackageJson.scripts["db:migrate:dev"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma migrate dev")
    expect(dbPackageJson.scripts["db:deploy"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma migrate deploy")
    expect(dbPackageJson.scripts["db:seed"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma db seed")
    expect(dbPackageJson.scripts["db:studio"]).toBe("DOTENV_CONFIG_PATH=../../.env XDG_CACHE_HOME=../../.cache prisma studio")
  })
})
