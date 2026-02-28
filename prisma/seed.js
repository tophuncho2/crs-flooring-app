async function main() {
  const [{ PrismaClient }, bcrypt] = await Promise.all([
    import("@prisma/client"),
    import("bcrypt"),
  ])

  const prisma = new PrismaClient()

  try {
    const hashedPassword = await bcrypt.default.hash("password123", 10)

    await prisma.user.create({
      data: {
        email: "admin@test.com",
        password: hashedPassword,
      },
    })

    console.log("User created.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
