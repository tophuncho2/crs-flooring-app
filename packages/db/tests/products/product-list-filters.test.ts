import { describe, expect, it } from "vitest"
import {
  buildProductSearchClauses,
  productAttributeOrderBy,
  productRelationAttributeOrderBy,
  productSearchRelationClause,
} from "../../src/products/product-list-filters.js"

describe("buildProductSearchClauses", () => {
  it("maps prodNumber to an exact int match on the generated column", () => {
    // Non-digits stripped → "PROD-12" and "12" both resolve to 12.
    expect(buildProductSearchClauses({ prodNumber: "PROD-12" })).toEqual([
      { productNumberInt: { equals: 12 } },
    ])
    expect(buildProductSearchClauses({ prodNumber: "12" })).toEqual([
      { productNumberInt: { equals: 12 } },
    ])
  })

  it("uses the -1 sentinel for a non-numeric prodNumber (returns no rows)", () => {
    expect(buildProductSearchClauses({ prodNumber: "abc" })).toEqual([
      { productNumberInt: { equals: -1 } },
    ])
  })

  it("maps color/style/namingAddon to case-insensitive substring matches", () => {
    expect(
      buildProductSearchClauses({ color: "beige", style: "plush", namingAddon: "clearance" }),
    ).toEqual([
      { color: { contains: "beige", mode: "insensitive" } },
      { style: { contains: "plush", mode: "insensitive" } },
      { productNamingAddon: { contains: "clearance", mode: "insensitive" } },
    ])
  })

  it("trims and skips blank/whitespace terms", () => {
    expect(buildProductSearchClauses({ color: "  ", style: "  wool  " })).toEqual([
      { style: { contains: "wool", mode: "insensitive" } },
    ])
  })

  it("returns an empty array when no term is set", () => {
    expect(buildProductSearchClauses(undefined)).toEqual([])
    expect(buildProductSearchClauses({})).toEqual([])
  })
})

describe("productSearchRelationClause", () => {
  it("wraps a single search under { product: { is } } without an AND", () => {
    expect(productSearchRelationClause({ color: "beige" })).toEqual({
      product: { is: { color: { contains: "beige", mode: "insensitive" } } },
    })
  })

  it("combines multiple searches under one product relation with AND", () => {
    expect(productSearchRelationClause({ color: "beige", style: "plush" })).toEqual({
      product: {
        is: {
          AND: [
            { color: { contains: "beige", mode: "insensitive" } },
            { style: { contains: "plush", mode: "insensitive" } },
          ],
        },
      },
    })
  })

  it("returns undefined when no search term is active", () => {
    expect(productSearchRelationClause(undefined)).toBeUndefined()
    expect(productSearchRelationClause({ color: "   " })).toBeUndefined()
  })
})

describe("productAttributeOrderBy", () => {
  it("maps category to the related category name", () => {
    expect(productAttributeOrderBy("category", "asc")).toEqual({ category: { name: "asc" } })
  })

  it("orders nullable style/color with nulls last", () => {
    expect(productAttributeOrderBy("style", "desc")).toEqual({
      style: { sort: "desc", nulls: "last" },
    })
    expect(productAttributeOrderBy("color", "asc")).toEqual({
      color: { sort: "asc", nulls: "last" },
    })
  })

  it("returns undefined for non-product fields", () => {
    expect(productAttributeOrderBy("createdAt", "asc")).toBeUndefined()
    expect(productAttributeOrderBy("nope", "asc")).toBeUndefined()
  })
})

describe("productRelationAttributeOrderBy", () => {
  it("nests the attribute clause under the product relation", () => {
    expect(productRelationAttributeOrderBy("category", "desc")).toEqual({
      product: { category: { name: "desc" } },
    })
    expect(productRelationAttributeOrderBy("style", "asc")).toEqual({
      product: { style: { sort: "asc", nulls: "last" } },
    })
  })

  it("returns undefined for non-product fields so the caller keeps its own columns", () => {
    expect(productRelationAttributeOrderBy("productName", "asc")).toBeUndefined()
    expect(productRelationAttributeOrderBy("createdAt", "asc")).toBeUndefined()
  })
})
