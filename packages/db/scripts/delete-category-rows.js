/**
 * One-off maintenance script: delete every row tied to a single flooring
 * category from the inventory / import / template / work-order / product tables.
 *
 * Targets the "shoe-molding" category by default (change CATEGORY_SLUG to reuse).
 *
 * Dry-run by default (counts only). Pass --apply to perform the deletion.
 *
 *   npm run db:purge:category              # dry-run, counts only
 *   npm run db:purge:category -- --apply   # actually delete
 *
 * Deletes respect the schema's FK rules (product FKs are onDelete: Restrict), so
 * children are removed before parents, all inside a single transaction.
 */

const CATEGORY_SLUG = "shoe-molding"

// Ordered children-before-parents so the Restrict FKs don't block the delete.
// Each entry: [label, prismaModelName, (ctx) => whereClause]
const DELETE_ORDER = [
  ["adjustments", "flooringInventoryAdjustment", ({ productIds }) => ({ productId: { in: productIds } })],
  ["work order items", "flooringWorkOrderItem", ({ productIds }) => ({ productId: { in: productIds } })],
  ["template items", "flooringTemplateItem", ({ productIds }) => ({ productId: { in: productIds } })],
  ["inventory", "flooringInventory", ({ productIds }) => ({ productId: { in: productIds } })],
  ["staged inventory rows", "flooringImportStagedInventoryRow", ({ productIds }) => ({ productId: { in: productIds } })],
  [
    "staged filter rows",
    "flooringImportStagedInventoryFilterRow",
    ({ productIds, categoryId }) => ({
      OR: [{ productId: { in: productIds } }, { categoryFilterId: categoryId }],
    }),
  ],
  ["products", "flooringProduct", ({ categoryId }) => ({ categoryId })],
]

async function deleteCategoryRows({ prisma, apply = false, logger = console }) {
  logger.log(`Category: "${CATEGORY_SLUG}"`)
  logger.log(`Mode: ${apply ? "APPLY (will delete)" : "DRY-RUN (counts only)"}`)
  logger.log("")

  const category = await prisma.flooringCategory.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true },
  })
  if (!category) {
    logger.log(`No category found with slug "${CATEGORY_SLUG}". Nothing to do.`)
    return { counts: {}, deleted: {} }
  }

  const categoryId = category.id
  const products = await prisma.flooringProduct.findMany({
    where: { categoryId },
    select: { id: true },
  })
  const productIds = products.map((p) => p.id)
  const ctx = { categoryId, productIds }
  logger.log(`  ${"products in category".padEnd(24)} ${productIds.length}`)
  logger.log("")

  // Count phase — always runs.
  const counts = {}
  let total = 0
  for (const [label, model, buildWhere] of DELETE_ORDER) {
    const n = await prisma[model].count({ where: buildWhere(ctx) })
    counts[label] = n
    total += n
    logger.log(`  ${label.padEnd(24)} ${n}`)
  }
  logger.log(`  ${"TOTAL".padEnd(24)} ${total}`)
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
      for (const [label, model, buildWhere] of DELETE_ORDER) {
        const result = await tx[model].deleteMany({ where: buildWhere(ctx) })
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
    await deleteCategoryRows({ prisma, apply })
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
  CATEGORY_SLUG,
  deleteCategoryRows,
}
