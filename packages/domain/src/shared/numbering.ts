export function computeNextNumber(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1
}

export function isValidRafterLevel(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 99
}

export function formatWarehouseLabel(number: number): string {
  return `W${number}`
}

export function formatSectionLabel(number: number): string {
  return `S${number}`
}

export function formatLocationLabel(rafter: number, level: number): string {
  return `R${rafter}-L${level}`
}
