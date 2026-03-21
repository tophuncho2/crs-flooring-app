function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function resolveAdminRecoveryTarget(argv = process.argv.slice(2)) {
  if (argv.length === 1 && !argv[0]?.startsWith("--")) {
    const email = normalizeEmail(argv[0] ?? "")

    if (!email) {
      throw new Error("Email is required")
    }

    return email
  }

  if (argv.length === 2 && argv[0] === "--email") {
    const email = normalizeEmail(argv[1] ?? "")

    if (!email) {
      throw new Error("Email is required")
    }

    return email
  }

  throw new Error("Usage: node prisma/admin-recovery.js <email> or --email <email>")
}

async function promoteUserToAdmin({
  prisma,
  email,
  logger = console,
}) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    throw new Error("Email is required")
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
    },
  })

  if (!existingUser) {
    throw new Error(`No user found for ${normalizedEmail}`)
  }

  if (existingUser.role === "ADMIN" && existingUser.isVerified) {
    logger.log(`User ${normalizedEmail} is already a verified admin.`)

    return {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
      isVerified: existingUser.isVerified,
      changed: false,
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      role: "ADMIN",
      isVerified: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
    },
  })

  logger.log(`Promoted ${normalizedEmail} to verified admin access.`)

  return {
    ...updatedUser,
    changed: true,
  }
}

async function main() {
  const email = resolveAdminRecoveryTarget()
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await promoteUserToAdmin({
      prisma,
      email,
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
  resolveAdminRecoveryTarget,
  promoteUserToAdmin,
}
