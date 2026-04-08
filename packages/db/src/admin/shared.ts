// --- Types ---

export type ManagedUserRecord = {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: string
}

// --- Select shape ---

export const managedUserSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  createdAt: true,
} as const

// --- Normalizer ---

export function normalizeManagedUserRow(user: {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: Date
}): ManagedUserRecord {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
  }
}
