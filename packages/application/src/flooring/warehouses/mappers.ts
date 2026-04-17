import type { LocationRecord } from "@builders/db"
import { formatLocationLabel } from "@builders/domain"

export type LocationResult = LocationRecord & { label: string }

export function toLocationResult(record: LocationRecord): LocationResult {
  return { ...record, label: formatLocationLabel(record.rafter, record.level) }
}
