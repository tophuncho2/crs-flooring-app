import { describe, expect, it } from "vitest"
import {
  WORK_ORDERS_ALLOWED_SORT_FIELDS,
  WORK_ORDERS_MAX_SORT_LEVELS,
  WORK_ORDERS_SORT_OPTIONS,
} from "@/modules/work-orders/components/list/table/work-orders-list-columns"
import { WORK_ORDERS_LIST_SORT_FIELDS } from "@/modules/work-orders/data/list-work-orders-request"
import { WORK_ORDERS_UI_SORT_FIELDS } from "@/app/api/work-orders/_validators"
import {
  INVENTORY_ALLOWED_SORT_FIELDS,
  INVENTORY_MAX_SORT_LEVELS,
  INVENTORY_SORT_OPTIONS,
} from "@/modules/inventory/components/list/table/inventory-list-columns"
import { INVENTORY_LIST_SORT_FIELDS } from "@/modules/inventory/data/list-inventory-request"
import { INVENTORY_UI_SORT_FIELDS } from "@/app/api/inventory/_validators"

/**
 * Drift guard for the Sort tool. A field is sortable only if EVERY layer agrees:
 * the menu (SORT_OPTIONS), the client allowlist, the request parser, and the API
 * validator. If a rollout adds a column to some-but-not-all of these, the column
 * either silently fails to sort or gets rejected server-side — these tests fail
 * the moment the lists diverge.
 */

const set = (values: readonly string[]) => [...new Set(values)].sort()

describe("sort allowlist sync — work orders", () => {
  const optionKeys = WORK_ORDERS_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(WORK_ORDERS_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(WORK_ORDERS_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(WORK_ORDERS_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of WORK_ORDERS_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(WORK_ORDERS_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — inventory", () => {
  const optionKeys = INVENTORY_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(INVENTORY_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(INVENTORY_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(INVENTORY_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of INVENTORY_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(INVENTORY_MAX_SORT_LEVELS).toBe(3)
  })
})
