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
