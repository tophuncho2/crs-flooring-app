async function main() {
  const [
    { createPrismaClient },
    bcrypt,
    { seedSystemUsers },
    { seedUnitOfMeasures },
    { seedCategories },
    { seedJobTypes },
  ] = await Promise.all([
    import("@builders/db"),
    import("bcrypt"),
    import("./system-user-seed.js"),
    import("./seed-unit-of-measures.js"),
    import("./seed-categories.js"),
    import("./seed-job-types.js"),
  ])

  const prisma = createPrismaClient()

  try {
    await seedSystemUsers({
      prisma,
      bcrypt: bcrypt.default,
    })

    console.log("Seeding unit of measures...")
    await seedUnitOfMeasures({ prisma })
    console.log("Done.")

    console.log("Seeding categories...")
    await seedCategories({ prisma })
    console.log("Done.")

    console.log("Seeding job types...")
    await seedJobTypes({ prisma })
    console.log("Done.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
