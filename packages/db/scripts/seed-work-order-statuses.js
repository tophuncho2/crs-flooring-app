const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of work order statuses.
 * Keep in sync with packages/db/src/seed/work-order-statuses.ts (the TypeScript source of truth).
 */
const SEEDED_WORK_ORDER_STATUSES = [
  { slug: "none", name: "None" },
  { slug: "assigned", name: "Assigned" },
  { slug: "delivered", name: "Delivered" },
  { slug: "complete", name: "Complete" },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/work-order-statuses.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern = /\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({ slug: match[1], name: match[2] })
  }

  const key = (entry) => `${entry.slug}|${entry.name}`
  const jsKeys = SEEDED_WORK_ORDER_STATUSES.map(key)
  const tsKeys = tsEntries.map(key)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
      `Update both files to match. TS source: src/seed/work-order-statuses.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
        `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
        `Update both files to match. TS source: src/seed/work-order-statuses.ts`,
      )
    }
  }
}

async function seedWorkOrderStatuses({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let existed = 0

  await prisma.$transaction(async (tx) => {
    for (const status of SEEDED_WORK_ORDER_STATUSES) {
      const existing = await tx.flooringWorkOrderStatus.findUnique({
        where: { slug: status.slug },
        select: { id: true },
      })

      if (existing) {
        await tx.flooringWorkOrderStatus.update({
          where: { slug: status.slug },
          data: { name: status.name },
        })
        existed += 1
      } else {
        await tx.flooringWorkOrderStatus.create({
          data: { slug: status.slug, name: status.name },
        })
        created += 1
      }
    }
  })

  logger.log(
    `Seeded ${SEEDED_WORK_ORDER_STATUSES.length} work order statuses (${created} created, ${existed} already existed)`,
  )
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await seedWorkOrderStatuses({ prisma })
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
  SEEDED_WORK_ORDER_STATUSES,
  seedWorkOrderStatuses,
}
