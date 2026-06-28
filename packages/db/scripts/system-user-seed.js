const OWNER_SLOT_COUNT = 10

const SYSTEM_USER_DEFINITIONS = [
  {
    label: "admin",
    rank: "DEVELOPER",
    emailEnvKey: "SEEDED_ADMIN_EMAIL",
    passwordEnvKey: "SEEDED_ADMIN_PASSWORD",
  },
  {
    label: "builder",
    rank: "DEVELOPER",
    emailEnvKey: "SEEDED_BUILDER_EMAIL",
    passwordEnvKey: "SEEDED_BUILDER_PASSWORD",
  },
  ...Array.from({ length: OWNER_SLOT_COUNT }, (_, i) => {
    const n = i + 1
    return {
      label: `owner-${n}`,
      rank: "TIER_1",
      emailEnvKey: `SEEDED_OWNER_${n}_EMAIL`,
      passwordEnvKey: `SEEDED_OWNER_${n}_PASSWORD`,
    }
  }),
]

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function resolveSeededSystemUsers(env = process.env) {
  const users = []
  const errors = []

  for (const definition of SYSTEM_USER_DEFINITIONS) {
    const rawEmail = typeof env[definition.emailEnvKey] === "string" ? env[definition.emailEnvKey] : ""
    const rawPassword = typeof env[definition.passwordEnvKey] === "string" ? env[definition.passwordEnvKey] : ""
    const email = normalizeEmail(rawEmail)
    const password = rawPassword.trim()
    const hasAnyValue = Boolean(email || password)

    if (!hasAnyValue) {
      continue
    }

    if (!email) {
      errors.push(`${definition.emailEnvKey} is required when configuring the ${definition.label} seed user`)
    }

    if (!password) {
      errors.push(`${definition.passwordEnvKey} is required when configuring the ${definition.label} seed user`)
    } else if (password.length < 12) {
      errors.push(`${definition.passwordEnvKey} must be at least 12 characters`)
    }

    if (email && password.length >= 12) {
      users.push({
        label: definition.label,
        rank: definition.rank,
        email,
        password,
      })
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "))
  }

  return users
}

async function seedSystemUsers({
  prisma,
  bcrypt,
  env = process.env,
  logger = console,
}) {
  const configuredUsers = resolveSeededSystemUsers(env)

  if (configuredUsers.length === 0) {
    logger.log("No seeded system users configured; skipping user seed.")
    return []
  }

  const seededUsers = []

  for (const user of configuredUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10)

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        rank: user.rank,
        isVerified: true,
        // Trusted bootstrap account — verified so the first Google sign-in
        // auto-links to this row instead of raising account_not_linked.
        emailVerified: true,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        rank: user.rank,
        isVerified: true,
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
