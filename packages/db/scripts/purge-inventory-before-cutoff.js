/**
 * One-off maintenance script: delete legacy/test rows created before the cutoff
 * from the five flooring inventory/import tables.
 *
 * Cutoff: June 1, 2026 00:00 America/New_York (EDT, UTC-4)
 *   = 2026-06-01T00:00:00-04:00 = 2026-06-01T04:00:00.000Z
 *
 * Dry-run by default (counts only). Pass --apply to perform the deletion.
 *
 *   npm run db:purge:inventory              # dry-run, counts only
 *   npm run db:purge:inventory -- --apply   # actually delete
 *
 * Deletes respect the schema's FK rules (parents are onDelete: Restrict), so
 * children are removed before parents, all inside a single transaction.
 */

const CUTOFF = new Date("2026-06-01T00:00:00-04:00")

// Ordered children-before-parents so the Restrict FKs don't block the delete.
// Each entry: [label, prismaModelName]
const PURGE_ORDER = [
  ["adjustments", "flooringInventoryAdjustment"],
  ["staged inventory rows", "flooringImportStagedInventoryRow"],
  ["inventory", "flooringInventory"],
  ["staged filter rows", "flooringImportStagedInventoryFilterRow"],
  ["import entries", "flooringImportEntry"],
]

const WHERE = { createdAt: { lt: CUTOFF } }

async function purgeInventoryBeforeCutoff({ prisma, apply = false, logger = console }) {
  logger.log(`Cutoff: ${CUTOFF.toISOString()} (June 1, 2026 00:00 America/New_York)`)
  logger.log(`Mode: ${apply ? "APPLY (will delete)" : "DRY-RUN (counts only)"}`)
  logger.log("")

  // Count phase — always runs.
  const counts = {}
  let total = 0
  for (const [label, model] of PURGE_ORDER) {
    const n = await prisma[model].count({ where: WHERE })
    counts[label] = n
    total += n
    logger.log(`  ${label.padEnd(22)} ${n}`)
  }
  logger.log(`  ${"TOTAL".padEnd(22)} ${total}`)
  logger.log("")

  if (!apply) {
    logger.log("Dry-run only. Re-run with --apply to delete these rows.")
    return { counts, deleted: null }
  }

  if (total === 0) {
    logger.log("Nothing to delete.")
    return { counts, deleted: {} }
  }

  // Delete phase — one all-or-nothing transaction, children before parents.
  const deleted = {}
  await prisma.$transaction(
    async (tx) => {
      for (const [label, model] of PURGE_ORDER) {
        const result = await tx[model].deleteMany({ where: WHERE })
        deleted[label] = result.count
        logger.log(`  deleted ${result.count} ${label}`)
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )
  logger.log("")
  logger.log("Done.")
  return { counts, deleted }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await purgeInventoryBeforeCutoff({ prisma, apply })
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
  CUTOFF,
  purgeInventoryBeforeCutoff,
}
