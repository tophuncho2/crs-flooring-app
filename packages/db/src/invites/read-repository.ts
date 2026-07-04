import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import {
  normalizeInviteListRow,
  normalizeUserInvite,
  type InviteListRow,
  type UserInvite,
} from "@builders/domain"

type InvitesDbClient = PrismaClient | Prisma.TransactionClient

export type InviteListViewOptions = {
  skip: number
  take: number
}

export type InviteListViewResult = {
  rows: InviteListRow[]
  total: number
}

// Pending-invites list — open invites only (not accepted, not expired), newest
// first. Counted pagination mirrors the users list read.
export async function listInvitesForListView(
  options: InviteListViewOptions,
  now: Date,
  client: InvitesDbClient = db,
): Promise<InviteListViewResult> {
  const where = { acceptedAt: null, expiresAt: { gt: now } }
  const [total, rows] = await Promise.all([
    client.userInvite.count({ where }),
    client.userInvite.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        email: true,
        rank: true,
        invitedBy: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeInviteListRow),
  }
}

// Single invite row by id, in the pending-list shape. Powers the invite
// detail/record view and its GET route — no neighbors (the record view has no
// stepper).
export async function getInviteRecordById(
  id: string,
  client: InvitesDbClient = db,
): Promise<InviteListRow | null> {
  const invite = await client.userInvite.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      rank: true,
      invitedBy: true,
      expiresAt: true,
      createdAt: true,
    },
  })
  return invite ? normalizeInviteListRow(invite) : null
}

// The most recent still-open invite for an email (not accepted, not expired).
// This is the signup gate's lookup — a brand-new Google user must match one.
export async function findOpenInviteByEmail(
  email: string,
  now: Date,
  client: InvitesDbClient = db,
): Promise<UserInvite | null> {
  const invite = await client.userInvite.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  })
  return invite ? normalizeUserInvite(invite) : null
}
