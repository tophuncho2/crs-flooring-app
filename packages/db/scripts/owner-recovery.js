function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function resolveOwnerRecoveryInput(argv = process.argv.slice(2)) {
  if (argv.length === 1 && !argv[0]?.startsWith("--")) {
    return { email: normalizeEmail(argv[0] ?? "") }
  }

  if (argv.length === 2 && argv[0] === "--email") {
    return { email: normalizeEmail(argv[1] ?? "") }
  }

  throw new Error("Usage: node scripts/owner-recovery.js <email> or --email <email>")
}

// Passwordless break-glass: identity is Google SSO, so recovery just ensures a
// DEVELOPER-rank User row exists for the email with `emailVerified` true. The
// owner then signs in with Google (account-linking attaches to this row, and an
// existing row bypasses the invite gate).
async function upsertOwnerUser({ prisma, email, logger = console }) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    throw new Error("Email is required")
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      rank: "DEVELOPER",
      emailVerified: true,
    },
    create: {
      email: normalizedEmail,
      rank: "DEVELOPER",
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      rank: true,
    },
  })

  logger.log(`Upserted DEVELOPER access for ${normalizedEmail}.`)

  return user
}

async function main() {
  const { email } = resolveOwnerRecoveryInput()
  const { createPrismaClient } = await import("@builders/db")

  const prisma = createPrismaClient()

  try {
    await upsertOwnerUser({ prisma, email })
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
