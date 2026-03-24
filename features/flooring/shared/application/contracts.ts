import type { PrismaPageLoadIssue } from "@/server/db/prisma-errors"

export type AppIssue = {
  code: string
  message: string
  detail?: string
  field?: string
  status?: number
  retryable?: boolean
}

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; issue: AppIssue }

export type MutationResult<T> = AppResult<T>

export type ListPageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PrismaPageLoadIssue }

export type DetailPageResult<T> =
  | { ok: true; data: T }
  | { ok: false; notFound: true }
  | { ok: false; error: PrismaPageLoadIssue }
