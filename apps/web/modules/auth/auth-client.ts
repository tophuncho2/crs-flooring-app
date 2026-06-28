"use client"

import { createAuthClient } from "better-auth/react"

// Browser-side Better Auth client. baseURL is inferred from the current origin,
// so it works across localhost + every deployed environment with no config.
export const authClient = createAuthClient()
