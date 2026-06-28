const OWNER_SLOT_COUNT = 10

const SYSTEM_USER_DEFINITIONS = [
  {
    label: "admin",
    rank: "DEVELOPER",
    emailEnvKey: "SEEDED_ADMIN_EMAIL",
  },
  {
    label: "builder",
    rank: "DEVELOPER",
    emailEnvKey: "SEEDED_BUILDER_EMAIL",
  },
  ...Array.from({ length: OWNER_SLOT_COUNT }, (_, i) => {
    const n = i + 1
    return {
      label: `owner-${n}`,
      rank: "TIER_1",
      emailEnvKey: `SEEDED_OWNER_${n}_EMAIL`,
    }
  }),
]

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function resolveSeededSystemUsers(env = process.env) {
  const users = []

  for (const definition of SYSTEM_USER_DEFINITIONS) {
    const rawEmail = typeof env[definition.emailEnvKey] === "string" ? env[definition.emailEnvKey] : ""
    const email = normalizeEmail(rawEmail)

    if (!email) {
      continue
    }

    users.push({
      label: definition.label,
      rank: definition.rank,
      email,
    })
  }

  return users
}

// Passwordless bootstrap: identity is Google SSO, so the seed only ensures the
// User row exists at the configured rank with `emailVerified` true (so the first
// Google sign-in account-links to this row instead of hitting the invite gate).
async function seedSystemUsers({ prisma, env = process.env, logger = console }) {
  const configuredUsers = resolveSeededSystemUsers(env)

  if (configuredUsers.length === 0) {
    logger.log("No seeded system users configured; skipping user seed.")
    return []
  }

  const seededUsers = []

  for (const user of configuredUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        rank: user.rank,
        emailVerified: true,
      },
      create: {
        email: user.email,
        rank: user.rank,
        emailVerified: true,
      },
    })

    seededUsers.push({ email: user.email, rank: user.rank })
  }

  logger.log(
    `Seeded system users: ${seededUsers.map((user) => `${user.rank}:${user.email}`).join(", ")}`,
  )

  return seededUsers
}

module.exports = {
  SYSTEM_USER_DEFINITIONS,
  resolveSeededSystemUsers,
  seedSystemUsers,
}
