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
import {
  ADJUSTMENTS_ALLOWED_SORT_FIELDS,
  ADJUSTMENTS_MAX_SORT_LEVELS,
  ADJUSTMENTS_SORT_OPTIONS,
} from "@/modules/adjustments/components/list/table/adjustments-list-columns"
import { ADJUSTMENTS_LIST_SORT_FIELDS } from "@/modules/adjustments/data/list-adjustments-request"
import { ADJUSTMENTS_UI_SORT_FIELDS } from "@/app/api/adjustments/_validators"
import {
  PROPERTIES_ALLOWED_SORT_FIELDS,
  PROPERTIES_MAX_SORT_LEVELS,
  PROPERTIES_SORT_OPTIONS,
} from "@/modules/properties/components/list/table/properties-list-columns"
import { PROPERTIES_LIST_SORT_FIELDS } from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_UI_SORT_FIELDS } from "@/app/api/properties/_validators"
import {
  TEMPLATES_ALLOWED_SORT_FIELDS,
  TEMPLATES_MAX_SORT_LEVELS,
  TEMPLATES_SORT_OPTIONS,
} from "@/modules/templates/components/list/table/templates-list-columns"
import { TEMPLATES_LIST_SORT_FIELDS } from "@/modules/templates/data/list-templates-request"
import { TEMPLATES_UI_SORT_FIELDS } from "@/app/api/templates/_validators"
import {
  ENTITIES_ALLOWED_SORT_FIELDS,
  ENTITIES_MAX_SORT_LEVELS,
  ENTITIES_SORT_OPTIONS,
} from "@/modules/entities/components/list/table/entities-list-columns"
import { ENTITIES_LIST_SORT_FIELDS } from "@/modules/entities/data/list-entities-request"
import { ENTITIES_UI_SORT_FIELDS } from "@/app/api/entities/_validators"
import {
  IMPORTS_ALLOWED_SORT_FIELDS,
  IMPORTS_MAX_SORT_LEVELS,
  IMPORTS_SORT_OPTIONS,
} from "@/modules/imports/components/list/table/imports-list-columns"
import { IMPORTS_LIST_SORT_FIELDS } from "@/modules/imports/data/list-imports-request"
import { IMPORTS_UI_SORT_FIELDS } from "@/app/api/imports/_validators"
import {
  PRODUCTS_ALLOWED_SORT_FIELDS,
  PRODUCTS_MAX_SORT_LEVELS,
  PRODUCTS_SORT_OPTIONS,
} from "@/modules/products/components/list/table/products-list-columns"
import { PRODUCTS_LIST_SORT_FIELDS } from "@/modules/products/data/list-products-request"
import { PRODUCTS_UI_SORT_FIELDS } from "@/app/api/products/_validators"
import {
  INDICATORS_ALLOWED_SORT_FIELDS,
  INDICATORS_MAX_SORT_LEVELS,
  INDICATORS_SORT_OPTIONS,
} from "@/modules/inventory-indicators/components/list/table/inventory-indicators-list-columns"
import { INDICATORS_LIST_SORT_FIELDS } from "@/modules/inventory-indicators/data/list-inventory-indicators-request"
import { INDICATORS_UI_SORT_FIELDS } from "@/app/api/inventory-indicators/_validators"

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

describe("sort allowlist sync — adjustments", () => {
  const optionKeys = ADJUSTMENTS_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(ADJUSTMENTS_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(ADJUSTMENTS_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(ADJUSTMENTS_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of ADJUSTMENTS_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(ADJUSTMENTS_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — properties", () => {
  const optionKeys = PROPERTIES_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(PROPERTIES_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(PROPERTIES_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(PROPERTIES_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of PROPERTIES_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(PROPERTIES_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — templates", () => {
  const optionKeys = TEMPLATES_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(TEMPLATES_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(TEMPLATES_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(TEMPLATES_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of TEMPLATES_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(TEMPLATES_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — entities", () => {
  const optionKeys = ENTITIES_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(ENTITIES_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(ENTITIES_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(ENTITIES_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of ENTITIES_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(ENTITIES_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — imports", () => {
  const optionKeys = IMPORTS_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(IMPORTS_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(IMPORTS_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(IMPORTS_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of IMPORTS_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(IMPORTS_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — products", () => {
  const optionKeys = PRODUCTS_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(PRODUCTS_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(PRODUCTS_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(PRODUCTS_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of PRODUCTS_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(PRODUCTS_MAX_SORT_LEVELS).toBe(3)
  })
})

describe("sort allowlist sync — inventory indicators", () => {
  const optionKeys = INDICATORS_SORT_OPTIONS.map((option) => option.key)
  const canonical = set(optionKeys)

  it("menu, client allowlist, request parser, and API validator expose identical field sets", () => {
    expect(set(INDICATORS_ALLOWED_SORT_FIELDS)).toEqual(canonical)
    expect(set(INDICATORS_LIST_SORT_FIELDS)).toEqual(canonical)
    expect(set(INDICATORS_UI_SORT_FIELDS)).toEqual(canonical)
  })

  it("has no duplicate menu option keys", () => {
    expect(optionKeys).toHaveLength(new Set(optionKeys).size)
  })

  it("every menu option declares a direction-label type", () => {
    for (const option of INDICATORS_SORT_OPTIONS) {
      expect(option.type, `option ${option.key} is missing a type`).toBeTruthy()
    }
  })

  it("caps at 3 sort levels", () => {
    expect(INDICATORS_MAX_SORT_LEVELS).toBe(3)
  })
})
