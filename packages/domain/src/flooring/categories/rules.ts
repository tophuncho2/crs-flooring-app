import type { CategoryUnitRule } from "./types.js"

export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
  "vinyl-plank": { hasCoverageUnit: true },
  "carpet-tile": { hasCoverageUnit: true },
  "covebase": { hasCoverageUnit: true },
  "pad": { hasCoverageUnit: true },
}

export const DEFAULT_CATEGORY_UNIT_RULE: CategoryUnitRule = {
  hasCoverageUnit: false,
}

export function getCategoryUnitRule(slug: string | null | undefined): CategoryUnitRule {
  if (!slug) return DEFAULT_CATEGORY_UNIT_RULE
  return CATEGORY_UNIT_RULES[slug] ?? DEFAULT_CATEGORY_UNIT_RULE
}

export function hasCoverageUnit(slug: string | null | undefined): boolean {
  return getCategoryUnitRule(slug).hasCoverageUnit
}

/**
 * True when products in this category must have a non-empty `coveragePerUnit`
 * value on save. Aligned with the set of categories that have a coverage unit
 * configured, kept as its own named predicate so save-rule semantics stay
 * distinct from the display-side `hasCoverageUnit` fact. Extend the slug set
 * via CATEGORY_UNIT_RULES — both predicates stay in sync by design.
 */
export function categoryRequiresCoveragePerUnit(
  slug: string | null | undefined,
): boolean {
  return hasCoverageUnit(slug)
}

/**
 * Human-readable explanation for the rule violation. Consumed by the product
 * use-case layer (and the products form-rule) to build the error message.
 */
export function buildCategoryCoveragePerUnitRequiredMessage(
  categoryName: string,
): string {
  return `Coverage per unit is required for ${categoryName} products`
}

/**
 * Human-readable explanation for the inverse rule: products whose category is
 * NOT in the coverage-per-unit set must not carry a value. Only categories that
 * are flagged via `categoryRequiresCoveragePerUnit` accept a coveragePerUnit.
 */
export function buildCategoryCoveragePerUnitNotAllowedMessage(
  categoryName: string,
): string {
  return `Coverage per unit is not allowed for ${categoryName} products`
}
