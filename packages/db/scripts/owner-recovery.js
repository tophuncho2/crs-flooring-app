function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function resolveOwnerRecoveryInput(argv = process.argv.slice(2)) {
  if (argv.length === 2 && !argv[0]?.startsWith("--") && !argv[1]?.startsWith("--")) {
    return {
      email: normalizeEmail(argv[0] ?? ""),
      password: (argv[1] ?? "").trim(),
    }
  }

  if (argv.length === 4 && argv[0] === "--email" && argv[2] === "--password") {
    return {
      email: normalizeEmail(argv[1] ?? ""),
      password: (argv[3] ?? "").trim(),
    }
  }

  throw new Error("Usage: node scripts/owner-recovery.js <email> <password> or --email <email> --password <password>")
}

async function upsertOwnerUser({
  prisma,
  bcrypt,
  email,
  password,
  logger = console,
}) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPassword = password.trim()

  if (!normalizedEmail) {
    throw new Error("Email is required")
  }

  if (normalizedPassword.length < 12) {
    throw new Error("Password must be at least 12 characters")
  }

  const hashedPassword = await bcrypt.hash(normalizedPassword, 10)
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      password: hashedPassword,
      role: "OWNER",
      isVerified: true,
    },
    create: {
      email: normalizedEmail,
      password: hashedPassword,
      role: "OWNER",
      isVerified: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
    },
  })

  logger.log(`Upserted owner access for ${normalizedEmail}.`)

  return user
}

async function main() {
  const { email, password } = resolveOwnerRecoveryInput()
  const [{ PrismaClient }, bcrypt] = await Promise.all([
    import("@prisma/client"),
    import("bcrypt"),
  ])

  const prisma = new PrismaClient()

  try {
    await upsertOwnerUser({
      prisma,
      bcrypt: bcrypt.default,
      email,
      password,
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
  normalizeEmail,
  resolveOwnerRecoveryInput,
  upsertOwnerUser,
}
