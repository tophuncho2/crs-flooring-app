// --- Types ---

export type ManagedUserRecord = {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

// --- Select shape ---

export const managedUserSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const

// --- Normalizer ---

export function normalizeManagedUserRow(user: {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}): ManagedUserRecord {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
