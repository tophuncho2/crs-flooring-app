import {
  validateImportPrimaryForm as domainValidateImportPrimaryForm,
  type ImportDetail,
  type ImportPrimaryForm,
  type StagedInventoryRow,
} from "@builders/domain"

// Record-view files pass `entry` with id pointers — use ImportDetail shape.
export type ImportRecordEntry = ImportDetail

export type ImportStagedRowDraft = {
  clientId: string
  productId: string
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks via the matching picker (ProductPicker →
  // product fields). Never sent in the mutation payload — server re-normalizes
  // from the live product table on save.
  productName: string
  stockUnit: string
  /**
   * Display-only snapshot of the staged row's `rollPrefix` (default
   * `"ROLL#"`). Rendered as a static label beside the editable rollNumber
   * input — same pattern as `stockUnit` next to `startingStock`. Never
   * sent in the mutation payload; the DB default + server-side propagation
   * own the value.
   */
  rollPrefix: string
  rollNumber: string
  startingStock: string
  location: string
  dyeLot: string
  note: string
  /**
   * Client-only helper: scopes the product dropdown to products matching this
   * category. `null` = show all products. Not persisted — never appears in the
   * mutation payload. Surviving across re-renders via the draft state is
   * enough.
   */
  categoryFilterId: string | null
}

export function createImportStagedRowDraft(item?: StagedInventoryRow): ImportStagedRowDraft {
  return {
    clientId: item?.id ?? crypto.randomUUID(),
    productId: item?.productId ?? "",
    productName: item?.productName ?? "",
    stockUnit: item?.stockUnit ?? "",
    rollPrefix: item?.rollPrefix ?? "ROLL#",
    rollNumber: item?.rollNumber ?? "",
    startingStock: item?.startingStock ?? "",
    location: item?.location ?? "",
    dyeLot: item?.dyeLot ?? "",
    note: item?.note ?? "",
    categoryFilterId: null,
  }
}

export function toImportStagedRowDrafts(rows: StagedInventoryRow[]): ImportStagedRowDraft[] {
  return rows.map((row) => createImportStagedRowDraft(row))
}

export function validateImportPrimaryForm(input: ImportPrimaryForm): string {
  const issues = domainValidateImportPrimaryForm(input)
  return issues.length > 0 ? issues[0].message : ""
}

export function validateImportStagedRowDrafts(items: ImportStagedRowDraft[]) {
  for (const [index, item] of items.entries()) {
    if (!item.productId.trim()) {
      return `Row ${index + 1}: product is required.`
    }

    if (!item.startingStock.trim()) {
      return `Row ${index + 1}: starting stock is required.`
    }
  }

  return ""
}
