import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { normalizeMoneyAmount, type PaletteColor } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateTemplateRecordInput = {
  propertyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitType: string
  customerName?: string | null
  description?: string | null
  internalNotes?: string | null
  installerInstructions?: string | null
  // Manual money column (money standard). "" / blank → NULL, else canonical
  // fixed-scale-2 before Prisma coerces to Decimal(12,2). Update inherits this.
  totalTransaction?: string | null
  createdBy: string
  updatedBy: string
}

// Money write boundary (money standard): blank / null → NULL, else normalize to
// the canonical fixed-scale-2 string. Mirrors the service-item `toMoney` helper.
function toMoney(value: string | null | undefined): string | null {
  return value && value.trim() ? normalizeMoneyAmount(value) : null
}

// `createdBy` is immutable post-create; `updatedBy` is always stamped on edit.
// `color` is update-only (the non-semantic palette tag) — never on create
// (`CreateTemplateRecordInput`), so new rows fall to the DB default SLATE.
export type UpdateTemplateRecordInput = Partial<
  Omit<CreateTemplateRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string; color?: PaletteColor }

// Returns a lean `{ id }` — the multi-relation detail read (5-6 relations) runs
// on the pool after commit (see `withTxThenEnrich`). A relation-rich select here
// would fire concurrent sub-queries on the single pinned tx connection.
export async function createTemplateRecord(
  input: CreateTemplateRecordInput,
  client: TemplatesDbClient = db,
): Promise<{ id: string }> {
  return client.template.create({
    // Fold the manual money column ("" / null → NULL, else canonical) — the rest
    // of the input maps straight through.
    data: { ...input, totalTransaction: toMoney(input.totalTransaction) },
    select: { id: true },
  })
}

// Lean `{ id }` (see `createTemplateRecord`). The `.update` still throws P2025
// when the row is gone — the use case maps that to a 404.
export async function updateTemplateRecord(
  id: string,
  input: UpdateTemplateRecordInput,
  client: TemplatesDbClient = db,
): Promise<{ id: string }> {
  return client.template.update({
    where: { id },
    // Fold the money column only when the key is present, so an update that omits
    // totalTransaction leaves the stored value untouched (the diff-save sends it,
    // but a partial patch may not).
    data: {
      ...input,
      ...(input.totalTransaction === undefined
        ? {}
        : { totalTransaction: toMoney(input.totalTransaction) }),
    },
    select: { id: true },
  })
}

export async function deleteTemplateRecordById(
  id: string,
  client: TemplatesDbClient = db,
): Promise<void> {
  await client.template.delete({ where: { id } })
}
