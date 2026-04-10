async function main() {
  const [{ PrismaClient }, bcrypt, { seedSystemUsers }, { seedUnitOfMeasures }] = await Promise.all([
    import("@prisma/client"),
    import("bcrypt"),
    import("./system-user-seed.js"),
    import("./seed-unit-of-measures.js"),
  ])

  const prisma = new PrismaClient()

  try {
    await seedSystemUsers({
      prisma,
      bcrypt: bcrypt.default,
    })

    console.log("Seeding unit of measures...")
    await seedUnitOfMeasures({ prisma })
    console.log("Done.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
