function normalizeSegment(value) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed || null
}

function buildCanonicalProductName({ categoryName, style, color }) {
  return [normalizeSegment(categoryName), normalizeSegment(style), normalizeSegment(color)].filter(Boolean).join(" - ") || "Flooring Product"
}

function resolveBackfillOptions(argv = process.argv.slice(2)) {
  const dryRun = argv.includes("--dry-run")
  const invalidOptions = argv.filter((argument) => argument !== "--dry-run")

  if (invalidOptions.length > 0) {
    throw new Error("Usage: node scripts/backfill-product-names.js [--dry-run]")
  }

  return { dryRun }
}

async function backfillProductNames({
  prisma,
  dryRun = false,
  logger = console,
}) {
  const products = await prisma.flooringProduct.findMany({
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      category: {
        select: { name: true },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  })

  let changed = 0

  for (const product of products) {
    const nextName = buildCanonicalProductName({
      categoryName: product.category.name,
      style: product.style,
      color: product.color,
    })

    if (product.name === nextName) {
      continue
    }

    changed += 1

    if (!dryRun) {
      await prisma.flooringProduct.update({
        where: { id: product.id },
        data: { name: nextName },
      })
    }
  }

  logger.log(
    dryRun
      ? `Dry run complete. ${changed} of ${products.length} product names would be updated.`
      : `Backfilled ${changed} of ${products.length} product names.`,
  )

  return {
    checked: products.length,
    changed,
    dryRun,
  }
}

async function main() {
  const { dryRun } = resolveBackfillOptions()
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await backfillProductNames({
      prisma,
      dryRun,
    })
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
  buildCanonicalProductName,
  resolveBackfillOptions,
  backfillProductNames,
}
