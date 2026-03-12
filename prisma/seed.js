async function main() {
  const [{ PrismaClient }, bcrypt] = await Promise.all([
    import("@prisma/client"),
    import("bcrypt"),
  ])

  const prisma = new PrismaClient()

  try {
    const hashedPassword = await bcrypt.default.hash("password123", 10)

    await prisma.user.upsert({
      where: {
        email: "admin@test.com",
      },
      update: {
        password: hashedPassword,
        role: "BUILDER",
        isVerified: true,
      },
      create: {
        email: "admin@test.com",
        password: hashedPassword,
        role: "BUILDER",
        isVerified: true,
      },
    })

    console.log("Seeded verified builder user: admin@test.com")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
