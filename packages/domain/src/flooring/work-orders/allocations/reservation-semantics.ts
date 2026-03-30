export function collectAffectedReservationInventoryIds(
  ...groups: Array<Array<string | null | undefined>>
) {
  return Array.from(
    new Set(
      groups
        .flat()
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  )
}
