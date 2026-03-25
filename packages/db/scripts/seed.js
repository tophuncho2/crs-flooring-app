async function main() {
  const [{ PrismaClient }, bcrypt, { seedSystemUsers }] = await Promise.all([
    import("@prisma/client"),
    import("bcrypt"),
    import("./system-user-seed.js"),
  ])

  const prisma = new PrismaClient()

  try {
    await seedSystemUsers({
      prisma,
      bcrypt: bcrypt.default,
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
