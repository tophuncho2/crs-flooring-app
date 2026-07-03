async function main() {
  const [
    { createPrismaClient },
    { seedUnitOfMeasures },
    { seedCategories },
  ] = await Promise.all([
    import("@builders/db"),
    import("./seed-unit-of-measures.js"),
    import("./seed-categories.js"),
  ])

  const prisma = createPrismaClient()

  try {
    console.log("Seeding unit of measures...")
    await seedUnitOfMeasures({ prisma })
    console.log("Done.")

    console.log("Seeding categories...")
    await seedCategories({ prisma })
    console.log("Done.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
