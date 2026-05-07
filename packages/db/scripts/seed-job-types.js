const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of flooring job types.
 * Keep in sync with packages/db/src/seed/job-types.ts (the TypeScript source of truth).
 *
 * Idempotent: matches on the unique `name` column. Existing rows are left as-is so
 * their ids — and the FK links from FlooringTemplate.jobTypeId and FlooringWorkOrder —
 * remain stable across reruns.
 */
const SEEDED_JOB_TYPES = [
  { name: "Carpet Cleaning" },
  { name: "Plank" },
  { name: "Carpet" },
  { name: "Trim" },
  { name: "Wall Base" },
  { name: "Waste" },
  { name: "Repair" },
  { name: "Construction" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/job-types.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*name:\s*"([^"]+)"\s*,?\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ name: match[1] })
  }

  const jsKey = (entry) => entry.name
  const jsKeys = SEEDED_JOB_TYPES.map(jsKey)
  const tsKeys = tsEntries.map(jsKey)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
        `Update both files to match. TS source: src/seed/job-types.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
          `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
          `Update both files to match. TS source: src/seed/job-types.ts`,
      )
    }
  }
}

async function seedJobTypes({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let existed = 0

  await prisma.$transaction(async (tx) => {
    for (const jobType of SEEDED_JOB_TYPES) {
      const existing = await tx.flooringJobType.findUnique({
        where: { name: jobType.name },
        select: { id: true },
      })

      if (existing) {
        existed += 1
      } else {
        await tx.flooringJobType.create({
          data: { name: jobType.name },
        })
        created += 1
      }
    }
  })

  logger.log(
    `Seeded ${SEEDED_JOB_TYPES.length} job types (${created} created, ${existed} already existed)`,
  )
}

async function main() {
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await seedJobTypes({ prisma })
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = {
  SEEDED_JOB_TYPES,
  seedJobTypes,
}
